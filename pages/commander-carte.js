import { useState } from "react";
import Link from "next/link";
import Head from "next/head";

const EMERALD = "#16A69C";

// Page de commande de carte NFC/QR (20 €, paiement unique — voir la section
// tarifs de la page d'accueil). Remplace l'ancien bouton "Commander la
// mienne" qui redirigeait directement vers WhatsApp sans rien demander :
// ici on récupère d'abord les infos utiles à l'expédition (adresse,
// contact) avant qu'Adam ne recontacte le commerçant pour le paiement et
// le suivi de livraison. Voir pages/api/order-card.js pour la suite
// (enregistrement + email de notification).
export default function CommanderCarte() {
  const [form, setForm] = useState({
    restaurantName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    quantity: 1,
  });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/order-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur, réessaie.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  if (status === "sent") {
    return (
      <div className="page">
        <Head>
          <title>Commande envoyée — Fidions</title>
        </Head>
        <div className="box">
          <div className="check-icon" aria-hidden="true">✓</div>
          <h1>Commande bien reçue</h1>
          <p>
            On revient vers toi sous 24h par email pour le paiement (20 € par carte, paiement
            unique) et le suivi de livraison.
          </p>
          <Link href="/" className="btn">Retour à l'accueil</Link>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <Head>
        <title>Commander une carte NFC/QR — Fidions</title>
        <meta
          name="description"
          content="Commande ta carte NFC & QR code Fidions à poser en caisse."
        />
      </Head>
      <div className="box">
        <Link href="/" className="back">← Retour à l'accueil</Link>
        <h1>Commander ta carte NFC & QR code</h1>
        <p className="subtitle">
          20 € en paiement unique. Renseigne tes coordonnées, on te recontacte sous 24h pour le
          paiement et l'expédition.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Nom du commerce
            <input
              type="text"
              required
              maxLength={80}
              value={form.restaurantName}
              onChange={(e) => update("restaurantName", e.target.value)}
            />
          </label>
          <label>
            Ton nom
            <input
              type="text"
              required
              maxLength={80}
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
            />
          </label>
          <div className="row">
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </label>
            <label>
              Téléphone
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </label>
          </div>
          <label>
            Adresse de livraison
            <textarea
              required
              rows={3}
              maxLength={300}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </label>
          <label className="qty-label">
            Nombre de cartes
            <input
              type="number"
              min={1}
              max={50}
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              style={{ width: 80 }}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
            {status === "sending" ? "Envoi…" : "Envoyer ma commande"}
          </button>
        </form>
      </div>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    min-height: 100vh;
    background: #F7F8F7;
    font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
  }
  .box {
    background: #fff;
    border-radius: 16px;
    padding: 40px;
    max-width: 560px;
    width: 100%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    text-align: left;
  }
  .back {
    display: inline-block;
    color: ${EMERALD};
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    margin-bottom: 20px;
  }
  h1 {
    color: #111114;
    font-size: 24px;
    margin: 0 0 8px;
  }
  .subtitle {
    color: #5B5F5D;
    font-size: 14.5px;
    line-height: 1.55;
    margin: 0 0 28px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .row {
    display: flex;
    gap: 16px;
  }
  .row label {
    flex: 1;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #111114;
  }
  .qty-label {
    align-items: flex-start;
  }
  input, textarea {
    font-family: inherit;
    font-size: 14.5px;
    font-weight: 400;
    color: #111114;
    border: 1.5px solid #E5E7E5;
    border-radius: 10px;
    padding: 10px 12px;
    resize: vertical;
  }
  input:focus, textarea:focus {
    outline: none;
    border-color: ${EMERALD};
  }
  .error {
    color: #c0392b;
    font-size: 13px;
    margin: 0;
  }
  .btn {
    display: inline-block;
    text-align: center;
    text-decoration: none;
    border: none;
    border-radius: 10px;
    padding: 13px 20px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-primary {
    background: ${EMERALD};
    color: #fff;
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .box .btn:not(.btn-primary) {
    background: #111114;
    color: #fff;
    margin-top: 8px;
  }
  .check-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #E8F5F3;
    color: ${EMERALD};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 16px;
  }
  .box p {
    color: #5B5F5D;
    font-size: 14.5px;
    line-height: 1.6;
    margin: 0 0 24px;
  }
`;
