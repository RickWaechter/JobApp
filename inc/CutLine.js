export const sanitize = (name) => {
  if (!name) return "Dokument";
  // Entfernt Sonderzeichen und ersetzt sie durch normale Buchstaben oder entfernt sie
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
};
export function newLineComma(text) {
  const index = text.indexOf(',');
  
  if (index === -1) return text; // Kein Komma da -> nichts tun

  const rest = text.slice(index + 1);

  // Prüfen, ob nach dem Komma direkt \n\n kommt
  if (rest.startsWith('\n\n')) {
    return text; // Ist schon da -> ignorieren
  }

  // Kommt nicht -> \n\n einfügen (und eventuelle Leerzeichen direkt nach dem Komma entfernen)
  return text.slice(0, index + 1) + '\n\n' + rest.trimStart();
}