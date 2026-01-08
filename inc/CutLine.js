export const sanitize = (name) => {
  if (!name) return "Dokument";
  // Entfernt Sonderzeichen und ersetzt sie durch normale Buchstaben oder entfernt sie
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
};