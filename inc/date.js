export const getCurrentDateTime = () => {
    const now = new Date();
  
    // Datum im Format DD:MM:YYYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Monate sind nullbasiert
    const year = now.getFullYear();
  
    // Uhrzeit im 24h-Format HH:mm
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
  
    return `${day}.${month}.${year} / ${hours}:${minutes}`;
  };
  