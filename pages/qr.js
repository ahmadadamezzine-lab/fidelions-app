import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Page utilitaire : affiche le QR code à imprimer pour le restaurant.
// Ouvre cette page une fois le site déployé (ex: https://fidelions.vercel.app/qr)

export default function QrPage() {
  const [dataUrl, setDataUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  useEffect(() => {
    const url = window.location.origin;
    setSiteUrl(url);
    QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: "#1a1a1a" } })
      .then(setDataUrl)
      .catch((err) => console.error("Erreur génération QR :", err));
  }, []);

  return (
    <div style={{ textAlign: "center", padding: 40, fontFamily: "sans-serif" }}>
      <h1>QR code Fidélions</h1>
      <p>Pointe vers : {siteUrl}</p>
      {dataUrl && (
        <>
          <img src={dataUrl} alt="QR code" style={{ width: 320, height: 320 }} />
          <p>
            <a href={dataUrl} download="qr-fidelions.png">
              Télécharger l'image du QR code
            </a>
          </p>
        </>
      )}
    </div>
  );
}
