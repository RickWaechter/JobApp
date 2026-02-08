import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import fs from "fs";
import helmet from "helmet";
import NodeRSA from "node-rsa";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import poolJob from "./dbJob.js";
import { decryp, decryptBase } from "./func/cryp.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: "10mb" }));
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const port = 3000;
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  message: {
    status: 429,
    success: false,
    error: "Zu viele Anfragen – bitte versuch es in ein paar Minuten erneut.",
  },
});
app.use(helmet());
app.use(cors());
app.use(limiter);

const transporter = nodemailer.createTransport({
  host: "smtp.mail.de", // SMTP-Host des E-Mail-Dienstes
  port: 587, // Port des E-Mail-Dienstes
  secure: false, // true für 465, false für andere Ports
  auth: {
    user: "rickwaechter1993@mail.de", // deine E-Mail-Adresse
    pass: "Fghjnbvc3119!", // dein E-Mail-Passwort
  },
});



app.get("/download", (req, res) => {
  console.log("Received request to /download");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const UPLOAD_DIR = path.join(__dirname, "db");

  const { file } = req.query;

  if (!file) {
    console.log("Missing file parameter");
    return res.status(400).send("Missing file parameter");
  }

  console.log(`Received file parameter: ${file}`);

  // ✅ nur Dateiname — keine Ordner oder ../ erlauben
  const safeFilename = path.basename(file);

  if (safeFilename !== file) {
    console.log("Invalid filename");
    return res.status(400).send("Invalid filename");
  }

  const filePath = path.join(UPLOAD_DIR, safeFilename);

  console.log(`Checking if file exists at ${filePath}`);

  // Datei existiert?
  if (!fs.existsSync(filePath)) {
    console.log("Not found");
    return res.status(404).send("Not found");
  }

  console.log("Sending file");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${req.query.file}"`
  );
  res.setHeader("Content-Encoding", "identity");
  return res.sendFile(filePath);
});


app.post("/putCoinsIAP", async (req, res) => {
  let theCoins;
  if(req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST-Anfragen erlaubt" });
  }

  try {
    const { productId, username } = req.body;
    if (productId === null) {
      return res
        .status(400)
        .json({ error: "Keine Produkt-ID zum auffüllen freigegeben" });
    }

    if (!username) {
      return res
        .status(400)
        .json({ error: "Username fehlt" });
    }
console.log('ProductId', productId); 
 const [rowsS] = await poolJob.query(
      `SELECT COUNT(*) AS count FROM users WHERE username = ?`,
      [req.body.key]
    );

    if (rowsS[0].count === 0) {
      // Falls nicht vorhanden, einfügen
      await poolJob.query(
        `INSERT INTO users (username, coins, takes) VALUES (?, ?, ?)`,
        [username, 0, 0]
      );
      console.log("Eintrag hinzugefügt.");
    }

    if (productId === "JA2C0002") {
      theCoins = 40;
    }
    // Query ausführen
    const [rows] = await poolJob.query(
      `UPDATE users SET coins = coins + ? WHERE username = ?`,
      [theCoins, username]
    );
 
 

    // Erfolgreiche Antwort
    return res.status(200).json({submit:true, message: "Coins erfolgreich aufgefüllt" });
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Coins:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

app.post("/putCoins", async (req, res) => {
  if(req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST-Anfragen erlaubt" });
  }

  try {
    const { coins, username } = req.body;

    if (!coins) {
      return res
        .status(400)
        .json({ error: "Keine coins zum auffüllen freigegeben" });
    }

    // Query ausführen
    const [rows] = await poolJob.query(
      `UPDATE users SET coins = coins + ? WHERE username = ?`,
      [coins, username]
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    // Erfolgreiche Antwort
    return res.status(200).json({ message: "Coins erfolgreich aufgefüllt" });
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Coins:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

app.post("/getCoins", async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST-Anfragen erlaubt" });
  }

  try {
    const { key } = req.body;

    if (!key) {
      return res
        .status(400)
        .json({ error: "Kein Benutzername (key) angegeben" });
    }

    // Query ausführen
    const [rows] = await poolJob.query(
      `SELECT coins FROM users WHERE username = ?`,
      [key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    // Erfolgreiche Antwort
    const coins = rows[0].coins;
    console.log("Coins:", coins);

    return res.status(200).json({ response: coins });
  } catch (error) {
    console.error("Fehler beim Abrufen der Coins:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});
app.post("/getEmail", async (req, res) => {
  if (req.method === "POST") {
    try {
      // Empfange die benötigten Daten vom Client
      const {
        prompt1,
        // Boolean, um das Modell auszuwählen
      } = req.body;

      console.log(prompt1);

      const better = false;
      // Wähle das Modell abhängig vom "better"-Flag
      const model = better ? "gpt-4o" : "gpt-4.1-nano";

      // Anfrage an die OpenAI API
      const openaiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "user",
              content: prompt1,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(openaiResponse.data.choices[0].message.content);
      res
        .status(200)
        .json({ response: openaiResponse.data.choices[0].message.content });
    } catch (error) {
      console.error("Serverfehler:", error);
      res.status(500).json({ error: error.message });
    }
  }
});
app.post("/emailNativ", async (req, res) => {
  const privateKeyPem = process.env.NEXT_PUBLIC_KEY;
  console.log("Private Key PEM:", privateKeyPem);
  // PEM-Private Key mit NodeRSA laden
  const privateKey = new NodeRSA(privateKeyPem);
  if (req.method === "POST") {
    const {
      email,
      yourEmail,
      emailPassword,
      emailServer,
      subject,
      base64String,
      base64String2,
      key,
      message,
      name,
      add1,
    } = req.body;

    try {
      console.log("encrypt key:", key);
      const decryptedData = privateKey.decrypt(key, "utf8", {
        encryptionScheme: "pkcs1", // anstatt 'pkcs1_oaep'
      });
      const encYourEmail = await decryp(yourEmail, decryptedData);
      console.log("encYourEmail:", encYourEmail);
      const emailDec = await decryp(email, decryptedData);
      console.log("emailDec:", emailDec);
      const emailPasswordDec = await decryp(emailPassword, decryptedData);
      console.log("emailPasswordDec:", emailPasswordDec);
      const emailServerDec = await decryp(emailServer, decryptedData);
      console.log("emailServerDec:", emailServerDec);
      const decrypBase = await decryptBase(base64String, decryptedData);

      const cryp = decrypBase + base64String2;

      // Transporter erstellen
      const transporter = nodemailer.createTransport({
        host: emailServerDec, // SMTP-Host des E-Mail-Dienstes
        port: 587, // Port des E-Mail-Dienstes
        secure: false, // true für 465, false für andere Ports
        auth: {
          user: emailDec, // deine E-Mail-Adresse
          pass: emailPasswordDec, // dein E-Mail-Passwort
        },
      });

      // E-Mail-Inhalt erstellen
      const mailOptions = {
        from: emailDec,
        to: encYourEmail, // Ziel-E-Mail-Adresse
        subject: subject,
        cc: emailDec,
        text: message,
        attachments: [
          {
            filename: "Bewerbungsmappe.pdf",
            content: cryp,
            encoding: "base64",
          },
        ],
      };
      console.log("mailOptions:", mailOptions);

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Mail wurde erfolgreich gesendet !" });
    } catch (error) {
      console.error("Error sending mail or querying database:", error);
      res
        .status(500)
        .json({ message: "Error sending mail or querying database" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});

app.post("/support", async (req, res) => {
  const {name, email, message} = req.body
  console.log("Received support request from:", name, email, message);
  const transporter = nodemailer.createTransport({
        host: "smtp.mail.de", // SMTP-Host des E-Mail-Dienstes
        port: 587, // Port des E-Mail-Dienstes
        secure: false, // true für 465, false für andere Ports
        auth: {
          user: "rickwaechter1993@mail.de", // deine E-Mail-Adresse
          pass: "Fghjnbvc3119!", // dein E-Mail-Passwort
        },
      });

      // E-Mail-Inhalt erstellen
      const mailOptions = {
        from: "Rickwaechter1993@mail.de",
        to: "rickwaechter@mail.de", // Ziel-E-Mail-Adresse
        subject: `Support Nachricht von ${name}`,
        text: message,
      };
      console.log("Sending mail with options:", mailOptions);
      try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Mail wurde erfolgreich gesendet!" });
      } catch (error) {
        console.error("Error sending mail:", error);
        res.status(500).json({ error: "Error sending mail" });
      }
})
app.post("/getText", async (req, res) => {
  if (req.method === "POST") {
    const [rows] = await poolJob.query(
      `SELECT COUNT(*) AS count FROM users WHERE username = ?`,
      [req.body.key]
    );

    if (rows[0].count === 0) {
      // Falls nicht vorhanden, einfügen
      await poolJob.query(
        `INSERT INTO users (username, coins, takes) VALUES (?, ?, ?)`,
        [req.body.key, 3, 1]
      );
      console.log("Eintrag hinzugefügt.");
    } else {
      const [rows] = await poolJob.query(
        `SELECT coins FROM users WHERE username = ?`,
        [req.body.key]
      );
      if (rows[0].coins > 0) {
        await poolJob.query(
          `UPDATE users
         SET coins = coins - 1,
             takes  = takes + 1
       WHERE username = ? AND coins > 0`,

          [req.body.key]
        );
        console.log("! Coin abgezogen !");
      } else {
        console.log("Nicht genügend Coins.");
        res.status(403).json({ error: "Nicht genügend Coins." });
        return;
      }
    }

    try {
      // Empfange die benötigten Daten vom Client
      const {
        prompt1,
        // Boolean, um das Modell auszuwählen
      } = req.body;
      console.log(prompt1);

      const prompt = prompt1;
      const better = false;
      // Wähle das Modell abhängig vom "better"-Flag
      const model = better ? "gpt-4o" : "gpt-4.1-nano";
      console.log(model);

      // Anfrage an die OpenAI API
      const openaiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(
        "OpenAI response received",
        openaiResponse.data.choices[0].message.content
      );
      res
        .status(200)
        .json({ response: openaiResponse.data.choices[0].message.content });
    } catch (error) {
      console.log("Fehler bei der OpenAI-Anfrage:", error);
    }
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

