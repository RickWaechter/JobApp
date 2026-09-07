package main

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/x509"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"net/smtp"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"github.com/fasthttp/router"
	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/valyala/fasthttp"
)

// AppState hält globale Konfigurationen und den DB-Pool
type App struct {
	DB            *sql.DB
	JWTSecret     []byte
	OpenRouterKey string
	SMTPUser      string
	SMTPPass      string
	SMTPHost      string
	SMTPPort      string
	HTTPClient    *fasthttp.Client
}

// JWT Claims Struct
type Claims struct {
	File string `json:"file"`
	jwt.RegisteredClaims
}

// DTO Structs für Requests
type PutCoinsIAPReq struct {
	ProductID string `json:"productId"`
	Username  string `json:"username"`
}

type PutCoinsReq struct {
	Coins    int    `json:"coins"`
	Username string `json:"username"`
}

type KeyReq struct {
	Key string `json:"key"`
}

type OpenAIReq struct {
	Prompt1 string `json:"prompt1"`
}

type GetTextReq struct {
	Key     string `json:"key"`
	Prompt1 string `json:"prompt1"`
}

type SupportReq struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

type EmailNativReq struct {
	Email         string `json:"email"`
	YourEmail     string `json:"yourEmail"`
	EmailPassword string `json:"emailPassword"`
	EmailServer   string `json:"emailServer"`
	Subject       string `json:"subject"`
	Base64String  string `json:"base64String"`
	Base64String2 string `json:"base64String2"`
	Key           string `json:"key"`
	Message       string `json:"message"`
}

func main() {
	_ = godotenv.Load()

	// Einzelne Variablen aus der .env lesen
	dbUser := os.Getenv("DB_USERNEW")
	dbPass := os.Getenv("DB_PASSWORDNEW")
	dbHost := getEnvOrDefault("DB_HOSTNEW", "127.0.0.1")
	dbPort := getEnvOrDefault("DB_PORT", "3306")
	dbName := os.Getenv("JOBAPP_DATABASE")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		dbUser, dbPass, dbHost, dbPort, dbName,
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen des DB-Handlers: %v", err)
	}
	defer db.Close()

	// Connection Pool Konfiguration
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Printf("Warnung: DB-Verbindung konnte nicht hergestellt werden: %v", err)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "fallback_secret_bitte_in_env_setzen"
	}

	app := &App{
		DB:            db,
		JWTSecret:     []byte(jwtSecret),
		OpenRouterKey: os.Getenv("OPENROUTER_API_KEY"),
		SMTPUser:      os.Getenv("SMTP_USER"),
		SMTPPass:      os.Getenv("SMTP_PASS"),
		SMTPHost:      getEnvOrDefault("SMTP_HOST", "smtp.mail.de"),
		SMTPPort:      getEnvOrDefault("SMTP_PORT", "587"),
		HTTPClient: &fasthttp.Client{
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 30 * time.Second,
		},
	}

	r := router.New()

	// Routes
	r.GET("/get-secure-link/{filename}", app.getSecureLink)
	r.GET("/download", app.downloadFile)
	r.POST("/putCoinsIAP", app.putCoinsIAP)
	r.POST("/putCoins", app.putCoins)
	r.POST("/getCoins", app.getCoins)
	r.POST("/getEmail", app.getEmail)
	r.POST("/getText", app.getText)
	r.POST("/emailNativ", app.emailNativ)
	r.POST("/support", app.handleSupport)

	handler := corsMiddleware(r.Handler)

	server := &fasthttp.Server{
		Handler:            handler,
		MaxRequestBodySize: 10 * 1024 * 1024, // 10MB Limit
	}

	port := getEnvOrDefault("PORT", "3000")
	log.Printf("FastHTTP Server läuft auf Port %s", port)
	if err := server.ListenAndServe(":" + port); err != nil {
		log.Fatalf("Server-Fehler: %v", err)
	}
}

// ======================================================
// ROUTE HANDLERS
// ======================================================

func (a *App) emailNativ(ctx *fasthttp.RequestCtx) {
	respondErr := func(status int, step, code, detail string) {
		log.Printf("[DEBUG emailNativ] FEHLER @%s [%s]: %s", step, code, detail)
		writeJSON(ctx, status, map[string]string{
			"step":    step,
			"code":    code,
			"detail":  detail,
			"message": "E-Mail konnte nicht gesendet werden.",
		})
	}

	log.Println("==================================================")
	log.Println("[DEBUG emailNativ] Anfrage an /emailNativ empfangen")

	privateKeyPem := os.Getenv("NEXT_PUBLIC_KEY")
	if privateKeyPem == "" {
		respondErr(fasthttp.StatusInternalServerError, "config", "MISSING_PRIVATE_KEY", "NEXT_PUBLIC_KEY fehlt in der .env")
		return
	}

	var req EmailNativReq
	if err := json.Unmarshal(ctx.PostBody(), &req); err != nil {
		respondErr(fasthttp.StatusBadRequest, "parse", "INVALID_JSON", err.Error())
		return
	}

	if req.Email == "" || req.YourEmail == "" || req.EmailPassword == "" || req.EmailServer == "" || req.Subject == "" || req.Key == "" {
		respondErr(fasthttp.StatusBadRequest, "validate", "MISSING_FIELDS", "Erforderliche Felder fehlen")
		return
	}

	log.Printf("[DEBUG] Base64Part1 Len: %d, Part2 Len: %d, EncKey Len: %d\n",
		len(req.Base64String), len(req.Base64String2), len(req.Key))

	decryptedKey, err := decryptRSA(req.Key, privateKeyPem)
	if err != nil {
		respondErr(fasthttp.StatusInternalServerError, "rsa", "RSA_FAILED", "Entschlüsselung des Keys fehlgeschlagen: "+err.Error())
		return
	}
	log.Printf("[DEBUG] RSA OK, Key Länge: %d\n", len(decryptedKey))

	encYourEmail, err := decryp(req.YourEmail, decryptedKey)
	if err != nil {
		respondErr(fasthttp.StatusInternalServerError, "decrypt", "DECRYPT_YOUR_EMAIL", "yourEmail konnte nicht entschlüsselt werden: "+err.Error())
		return
	}
	emailDec, err := decryp(req.Email, decryptedKey)
	if err != nil {
		respondErr(fasthttp.StatusInternalServerError, "decrypt", "DECRYPT_EMAIL", "email konnte nicht entschlüsselt werden: "+err.Error())
		return
	}
	emailPasswordDec, err := decryp(req.EmailPassword, decryptedKey)
	if err != nil {
		respondErr(fasthttp.StatusInternalServerError, "decrypt", "DECRYPT_PASSWORD", "emailPassword konnte nicht entschlüsselt werden: "+err.Error())
		return
	}
	emailServerDec, err := decryp(req.EmailServer, decryptedKey)
	if err != nil {
		respondErr(fasthttp.StatusInternalServerError, "decrypt", "DECRYPT_SERVER", "emailServer konnte nicht entschlüsselt werden: "+err.Error())
		return
	}
	decrypPart1 := req.Base64String

	log.Printf("[DEBUG] Entschlüsselung OK – From: %s, To: %s, Server: %s\n", emailDec, encYourEmail, emailServerDec)

	decrypPart2 := req.Base64String2

	buffer1, err := decodeBase64Safe(decrypPart1)
	if err != nil {
		log.Printf("[DEBUG] Part1 ist kein Base64 (nutze Roh-Bytes): %v\n", err)
		buffer1 = []byte(decrypPart1)
	}
	buffer2, err := decodeBase64Safe(decrypPart2)
	if err != nil {
		log.Printf("[DEBUG] Part2 ist kein Base64: %v\n", err)
	}

	combinedBuffer := append(buffer1, buffer2...)
	log.Printf("[DEBUG] Kombinierter PDF-Buffer: %d Bytes\n", len(combinedBuffer))
	log.Printf("[DEBUG] Buffer1 erste 16 Bytes: %X", buffer1[:min(len(buffer1), 16)])
	log.Printf("[DEBUG] Buffer2 erste 16 Bytes: %X", buffer2[:min(len(buffer2), 16)])
	log.Printf("[DEBUG] Combined erste 16 Bytes: %X", combinedBuffer[:min(len(combinedBuffer), 16)])
	if len(combinedBuffer) == 0 {
		respondErr(fasthttp.StatusInternalServerError, "pdf", "EMPTY_PDF",
			fmt.Sprintf("Der kombinierte PDF-Puffer ist leer (Teil 1: %d, Teil 2: %d Bytes)", len(buffer1), len(buffer2)))
		return
	}
	if !strings.HasPrefix(strings.ToLower(string(combinedBuffer[:min(len(combinedBuffer), 5)])), "%pdf") {
		log.Printf("[DEBUG] WARNUNG: PDF beginnt nicht mit %%PDF (erste Bytes: %X)\n", combinedBuffer[:min(len(combinedBuffer), 8)])
	}

	boundary := fmt.Sprintf("----=_NextPart_%d", time.Now().UnixNano())
	var msgBuffer bytes.Buffer
	msgBuffer.WriteString(fmt.Sprintf("From: %s\r\n", emailDec))
	msgBuffer.WriteString(fmt.Sprintf("To: %s\r\n", encYourEmail))
	msgBuffer.WriteString(fmt.Sprintf("Cc: %s\r\n", emailDec))
	msgBuffer.WriteString(fmt.Sprintf("Subject: %s\r\n", req.Subject))
	msgBuffer.WriteString("MIME-Version: 1.0\r\n")
	msgBuffer.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n\r\n", boundary))

	msgBuffer.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msgBuffer.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n\r\n")
	msgBuffer.WriteString(req.Message + "\r\n\r\n")

	msgBuffer.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msgBuffer.WriteString("Content-Type: application/pdf; name=\"Bewerbungsmappe.pdf\"\r\n")
	msgBuffer.WriteString("Content-Disposition: attachment; filename=\"Bewerbungsmappe.pdf\"\r\n")
	msgBuffer.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")

	encodedPDF := base64.StdEncoding.EncodeToString(combinedBuffer)
	for i := 0; i < len(encodedPDF); i += 76 {
		end := i + 76
		if end > len(encodedPDF) {
			end = len(encodedPDF)
		}
		msgBuffer.WriteString(encodedPDF[i:end] + "\r\n")
	}
	// Direkt das schließende Boundary setzen (kein zusätzliches \r\n davor):
	msgBuffer.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	smtpAddr := fmt.Sprintf("%s:587", emailServerDec)
	auth := smtp.PlainAuth("", emailDec, emailPasswordDec, emailServerDec)
	recipients := []string{encYourEmail, emailDec}

	err = smtp.SendMail(smtpAddr, auth, emailDec, recipients, msgBuffer.Bytes())
	if err != nil {
		respondErr(fasthttp.StatusInternalServerError, "smtp", "SMTP_SEND_FAILED", fmt.Sprintf("Senden an %s fehlgeschlagen: %v", smtpAddr, err))
		return
	}

	log.Println("[DEBUG emailNativ] ERFOLG! E-Mail gesendet.")
	log.Println("==================================================")
	writeJSON(ctx, fasthttp.StatusOK, map[string]string{
		"step":    "done",
		"code":    "OK",
		"message": "Mail wurde erfolgreich gesendet!",
	})
}

func (a *App) getSecureLink(ctx *fasthttp.RequestCtx) {
	filenameVal := ctx.UserValue("filename")
	if filenameVal == nil {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Dateiname fehlt"})
		return
	}
	filename := filenameVal.(string)
	safeFilename := filepath.Base(filename)

	filePath := filepath.Join(".", "download", safeFilename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		writeJSON(ctx, fasthttp.StatusNotFound, map[string]string{"error": "Datei nicht gefunden"})
		return
	}

	claims := Claims{
		File: safeFilename,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(2 * time.Minute)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(a.JWTSecret)
	if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Token-Erstellung fehlgeschlagen"})
		return
	}

	downloadURL := fmt.Sprintf("https://api.jobapp2.de/download?file=%s&token=%s", url.QueryEscape(safeFilename), tokenString)
	writeJSON(ctx, fasthttp.StatusOK, map[string]string{"url": downloadURL})
}

func (a *App) downloadFile(ctx *fasthttp.RequestCtx) {
	fileQuery := string(ctx.QueryArgs().Peek("file"))
	tokenQuery := string(ctx.QueryArgs().Peek("token"))

	if fileQuery == "" || tokenQuery == "" {
		ctx.SetStatusCode(fasthttp.StatusBadRequest)
		ctx.SetBodyString("Missing file or token parameter")
		return
	}

	safeFilename := filepath.Base(fileQuery)
	if safeFilename != fileQuery {
		ctx.SetStatusCode(fasthttp.StatusBadRequest)
		ctx.SetBodyString("Invalid filename")
		return
	}

	token, err := jwt.ParseWithClaims(tokenQuery, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return a.JWTSecret, nil
	})

	if err != nil || !token.Valid {
		ctx.SetStatusCode(fasthttp.StatusUnauthorized)
		ctx.SetBodyString("Link expired or invalid token")
		return
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || claims.File != safeFilename {
		ctx.SetStatusCode(fasthttp.StatusForbidden)
		ctx.SetBodyString("Token not valid for this file")
		return
	}

	filePath := filepath.Join(".", "download", safeFilename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		ctx.SetStatusCode(fasthttp.StatusNotFound)
		ctx.SetBodyString("File not found")
		return
	}

	ctx.Response.Header.Set("Access-Control-Allow-Origin", "*")
	ctx.Response.Header.Set("Content-Type", "application/octet-stream")
	ctx.Response.Header.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, safeFilename))
	ctx.SendFile(filePath)
}

func (a *App) putCoinsIAP(ctx *fasthttp.RequestCtx) {
	var req PutCoinsIAPReq
	if err := json.Unmarshal(ctx.PostBody(), &req); err != nil || req.ProductID == "" || req.Username == "" {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Ungültige Anfragedaten"})
		return
	}

	if req.ProductID != "JA2C0002" {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Unbekannte Produkt-ID"})
		return
	}

	theCoins := 40

	_, err := a.DB.Exec("INSERT IGNORE INTO users (username, coins, takes) VALUES (?, 0, 0)", req.Username)
	if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Datenbankfehler"})
		return
	}

	_, err = a.DB.Exec("UPDATE users SET coins = coins + ? WHERE username = ?", theCoins, req.Username)
	if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Fehler beim Münz-Update"})
		return
	}

	writeJSON(ctx, fasthttp.StatusOK, map[string]interface{}{
		"submit":  true,
		"message": "Coins erfolgreich aufgefüllt",
	})
}

func (a *App) putCoins(ctx *fasthttp.RequestCtx) {
	var req PutCoinsReq
	if err := json.Unmarshal(ctx.PostBody(), &req); err != nil || req.Username == "" || req.Coins == 0 {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Coins oder Username fehlt"})
		return
	}

	res, err := a.DB.Exec("UPDATE users SET coins = coins + ? WHERE username = ?", req.Coins, req.Username)
	if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Datenbankfehler"})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		writeJSON(ctx, fasthttp.StatusNotFound, map[string]string{"error": "Benutzer nicht gefunden"})
		return
	}

	writeJSON(ctx, fasthttp.StatusOK, map[string]string{"message": "Coins erfolgreich aufgefüllt"})
}

func (a *App) getCoins(ctx *fasthttp.RequestCtx) {
	var req KeyReq
	if err := json.Unmarshal(ctx.PostBody(), &req); err != nil || req.Key == "" {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Kein Benutzername (key) angegeben"})
		return
	}

	var coins int
	err := a.DB.QueryRow("SELECT coins FROM users WHERE username = ?", req.Key).Scan(&coins)

	if err == sql.ErrNoRows {
		_, err = a.DB.Exec("INSERT INTO users (username, coins, takes) VALUES (?, 3, 0)", req.Key)
		if err != nil {
			writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Fehler beim Anlegen des Nutzers"})
			return
		}
		writeJSON(ctx, fasthttp.StatusOK, map[string]int{"response": 3})
		return
	}

	if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Serverfehler"})
		return
	}

	writeJSON(ctx, fasthttp.StatusOK, map[string]int{"response": coins})
}

func (a *App) getEmail(ctx *fasthttp.RequestCtx) {
	var req OpenAIReq
	if err := json.Unmarshal(ctx.PostBody(), &req); err != nil || req.Prompt1 == "" {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Prompt fehlt"})
		return
	}

	text, err := a.callOpenRouter(req.Prompt1)
	if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Fehler bei der Textgenerierung"})
		return
	}

	writeJSON(ctx, fasthttp.StatusOK, map[string]string{"response": text})
}

func (a *App) getText(ctx *fasthttp.RequestCtx) {
	var req GetTextReq
	if err := json.Unmarshal(ctx.PostBody(), &req); err != nil || req.Key == "" || req.Prompt1 == "" {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Key oder Prompt fehlt"})
		return
	}

	var coins int
	err := a.DB.QueryRow("SELECT coins FROM users WHERE username = ?", req.Key).Scan(&coins)

	if err == sql.ErrNoRows {
		_, err = a.DB.Exec("INSERT INTO users (username, coins, takes) VALUES (?, 3, 0)", req.Key)
		if err != nil {
			writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Fehler beim Anlegen des Nutzers"})
			return
		}
	} else if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Datenbankfehler"})
		return
	} else if coins <= 0 {
		writeJSON(ctx, fasthttp.StatusForbidden, map[string]string{"error": "Nicht genügend Coins."})
		return
	}

	text, err := a.callOpenRouter(req.Prompt1)
	if err != nil {
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Fehler bei der Textgenerierung"})
		return
	}

	_, _ = a.DB.Exec("UPDATE users SET coins = coins - 1, takes = takes + 1 WHERE username = ? AND coins > 0", req.Key)
	newText := lowercaseFirstWord(text)
	writeJSON(ctx, fasthttp.StatusOK, map[string]string{"response": newText})
}

func (a *App) handleSupport(ctx *fasthttp.RequestCtx) {
	var req SupportReq
	if err := json.Unmarshal(ctx.PostBody(), &req); err != nil || req.Name == "" || req.Email == "" || req.Message == "" {
		writeJSON(ctx, fasthttp.StatusBadRequest, map[string]string{"error": "Ungültiges Datenformat"})
		return
	}

	auth := smtp.PlainAuth("", a.SMTPUser, a.SMTPPass, a.SMTPHost)
	to := []string{"rickwaechter@mail.de"}

	msg := []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: Support Nachricht von %s (%s)\r\n\r\n%s",
		a.SMTPUser, to[0], req.Name, req.Email, req.Message,
	))

	addr := fmt.Sprintf("%s:%s", a.SMTPHost, a.SMTPPort)
	err := smtp.SendMail(addr, auth, a.SMTPUser, to, msg)
	if err != nil {
		log.Printf("E-Mail Fehler: %v", err)
		writeJSON(ctx, fasthttp.StatusInternalServerError, map[string]string{"error": "Fehler beim Senden der Mail"})
		return
	}

	writeJSON(ctx, fasthttp.StatusOK, map[string]string{"message": "Mail wurde erfolgreich gesendet!"})
}

// ======================================================
// HELPER & HTTP UTILITIES
// ======================================================

func writeJSON(ctx *fasthttp.RequestCtx, statusCode int, data interface{}) {
	ctx.SetStatusCode(statusCode)
	ctx.SetContentType("application/json; charset=utf-8")
	_ = json.NewEncoder(ctx).Encode(data)
}

func corsMiddleware(next fasthttp.RequestHandler) fasthttp.RequestHandler {
	return func(ctx *fasthttp.RequestCtx) {
		ctx.Response.Header.Set("Access-Control-Allow-Origin", "*")
		ctx.Response.Header.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		ctx.Response.Header.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if ctx.IsOptions() {
			ctx.SetStatusCode(fasthttp.StatusNoContent)
			return
		}
		next(ctx)
	}
}

func (a *App) callOpenRouter(prompt string) (string, error) {
	payload := map[string]interface{}{
		"model": "meta-llama/llama-3.3-70b-instruct",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"provider": map[string]interface{}{
			"order":           []string{"Groq", "Cerebras"},
			"allow_fallbacks": true,
		},
		"max_tokens": 400,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req := fasthttp.AcquireRequest()
	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseRequest(req)
	defer fasthttp.ReleaseResponse(resp)

	req.SetRequestURI("https://openrouter.ai/api/v1/chat/completions")
	req.Header.SetMethod(fasthttp.MethodPost)
	req.Header.SetContentType("application/json")
	req.Header.Set("Authorization", "Bearer "+a.OpenRouterKey)
	req.Header.Set("HTTP-Referer", "https://api.jobapp2.de")
	req.Header.Set("X-Title", "JobApp2 Backend")
	req.SetBody(jsonBytes)

	if err := a.HTTPClient.Do(req, resp); err != nil {
		return "", err
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &raw); err != nil {
		return "", err
	}

	if resp.StatusCode() != fasthttp.StatusOK {
		if errMsg, ok := raw["error"].(map[string]interface{}); ok {
			return "", fmt.Errorf("OpenRouter API Fehler HTTP %d: %v", resp.StatusCode(), errMsg["message"])
		}
		return "", fmt.Errorf("OpenRouter API Fehler HTTP %d", resp.StatusCode())
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("keine Antwort von OpenRouter")
	}

	return result.Choices[0].Message.Content, nil
}

// ======================================================
// CRYPTO FUNCTIONS
// ======================================================

func decryptRSA(cipherTextBase64, privateKeyPEM string) (string, error) {
	cipherTextBase64 = strings.TrimSpace(cipherTextBase64)
	cipherTextBase64 = strings.ReplaceAll(cipherTextBase64, "%2B", "+")
	cipherTextBase64 = strings.ReplaceAll(cipherTextBase64, "%2b", "+")
	cipherTextBase64 = strings.ReplaceAll(cipherTextBase64, " ", "+")

	privateKeyPEM = strings.TrimSpace(privateKeyPEM)
	privateKeyPEM = strings.ReplaceAll(privateKeyPEM, "\\n", "\n")

	cipherBytes, err := base64.StdEncoding.DecodeString(cipherTextBase64)
	if err != nil {
		return "", fmt.Errorf("Base64 Decode Error: %w", err)
	}

	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return "", errors.New("ungültiger PEM-Block für RSA Private Key (Prüfe NEXT_PUBLIC_KEY in .env)")
	}

	var privKey *rsa.PrivateKey
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		privKey = key
	} else if keyInterface, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
		var ok bool
		if privKey, ok = keyInterface.(*rsa.PrivateKey); !ok {
			return "", errors.New("kein RSA Private Key im PKCS8 Block")
		}
	} else {
		return "", fmt.Errorf("Private Key Parsing Fehler: %v", err)
	}

	decryptedBytes, err1 := rsa.DecryptPKCS1v15(rand.Reader, privKey, cipherBytes)
	if err1 == nil {
		log.Println("[DEBUG decryptRSA] Erfolgreich entschlüsselt mit PKCS1v15")
		return string(decryptedBytes), nil
	}

	decryptedBytes, err2 := rsa.DecryptOAEP(sha1.New(), rand.Reader, privKey, cipherBytes, nil)
	if err2 == nil {
		log.Println("[DEBUG decryptRSA] Erfolgreich entschlüsselt mit OAEP-SHA1")
		return string(decryptedBytes), nil
	}

	decryptedBytes, err3 := rsa.DecryptOAEP(sha256.New(), rand.Reader, privKey, cipherBytes, nil)
	if err3 == nil {
		log.Println("[DEBUG decryptRSA] Erfolgreich entschlüsselt mit OAEP-SHA256")
		return string(decryptedBytes), nil
	}

	return "", fmt.Errorf("RSA Entschlüsselung fehlgeschlagen (PKCS1v15: %v | OAEP-SHA1: %v)", err1, err2)
}

func decodeBase64Safe(s string) ([]byte, error) {
	s = strings.TrimSpace(s)

	s = strings.ReplaceAll(s, "%2B", "+")
	s = strings.ReplaceAll(s, "%2b", "+")
	s = strings.ReplaceAll(s, "%2F", "/")
	s = strings.ReplaceAll(s, "%2f", "/")
	s = strings.ReplaceAll(s, "%3D", "=")
	s = strings.ReplaceAll(s, "%3d", "=")
	s = strings.ReplaceAll(s, "%20", "+")

	if unescaped, err := url.QueryUnescape(s); err == nil {
		s = unescaped
	}

	s = strings.ReplaceAll(s, " ", "+")
	s = strings.ReplaceAll(s, "\n", "")
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\t", "")

	if data, err := base64.StdEncoding.DecodeString(s); err == nil {
		return data, nil
	}
	if data, err := base64.RawStdEncoding.DecodeString(s); err == nil {
		return data, nil
	}
	if data, err := base64.URLEncoding.DecodeString(s); err == nil {
		return data, nil
	}
	if data, err := base64.RawURLEncoding.DecodeString(s); err == nil {
		return data, nil
	}
	if data, err := hex.DecodeString(s); err == nil {
		return data, nil
	}

	return nil, fmt.Errorf("ungültiges Base64/Hex Format (Inhalt: '%s')", s)
}

func decryp(cipherText, secretKey string) (string, error) {
	cipherText = strings.TrimSpace(cipherText)

	var iv []byte
	var cipherTextBytes []byte

	if strings.Contains(cipherText, ":") {
		parts := strings.SplitN(cipherText, ":", 2)
		var err error

		iv, err = hex.DecodeString(parts[0])
		if err != nil {
			return "", fmt.Errorf("IV Hex Decode Fehler: %w", err)
		}

		cipherTextBytes, err = decodeBase64Safe(parts[1])
		if err != nil {
			return "", fmt.Errorf("Payload Base64 Decode Fehler: %w", err)
		}
	} else {
		data, err := decodeBase64Safe(cipherText)
		if err != nil {
			return "", fmt.Errorf("Base64/Hex Decode Fehler: %w", err)
		}

		if len(data) < aes.BlockSize {
			return "", fmt.Errorf("Ciphertext zu kurz (%d Bytes, Minimum %d Bytes)", len(data), aes.BlockSize)
		}

		iv = data[:aes.BlockSize]
		cipherTextBytes = data[aes.BlockSize:]
	}

	if len(iv) != aes.BlockSize {
		return "", fmt.Errorf("IV hat ungültige Länge (%d Bytes, erwartet: %d)", len(iv), aes.BlockSize)
	}

	if len(cipherTextBytes) == 0 || len(cipherTextBytes)%aes.BlockSize != 0 {
		return "", fmt.Errorf("Ciphertext-Payload hat ungültige Blocklänge (%d Bytes, muss Vielfaches von %d sein)", len(cipherTextBytes), aes.BlockSize)
	}

	var key []byte
	if len(secretKey) == 64 {
		if hexKey, err := hex.DecodeString(secretKey); err == nil && len(hexKey) == 32 {
			key = hexKey
		}
	}
	if len(key) == 0 {
		key = make([]byte, 32)
		copy(key, []byte(secretKey))
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("AES NewCipher Fehler: %w", err)
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	decrypted := make([]byte, len(cipherTextBytes))
	mode.CryptBlocks(decrypted, cipherTextBytes)

	if len(decrypted) == 0 {
		return "", errors.New("entschlüsselte Daten sind leer")
	}

	paddingLen := int(decrypted[len(decrypted)-1])
	if paddingLen == 0 || paddingLen > aes.BlockSize || paddingLen > len(decrypted) {
		return string(decrypted), nil
	}

	for i := len(decrypted) - paddingLen; i < len(decrypted); i++ {
		if int(decrypted[i]) != paddingLen {
			return string(decrypted), nil
		}
	}

	return string(decrypted[:len(decrypted)-paddingLen]), nil
}

func decryptBase(base64Str, secretKey string) (string, error) {
	if len(base64Str) > 32 {
		decrypted, err := decryp(base64Str, secretKey)
		if err == nil && len(decrypted) > 0 {
			return decrypted, nil
		}
	}
	return base64Str, nil
}

func lowercaseFirstWord(s string) string {
	trimmed := strings.TrimLeft(s, " \t\r\n")
	if trimmed == "" {
		return s
	}
	prefix := s[:len(s)-len(trimmed)]
	runes := []rune(trimmed)
	runes[0] = unicode.ToLower(runes[0])
	return prefix + string(runes)
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
