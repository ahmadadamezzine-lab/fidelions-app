import { useState } from "react";

const PURPLE = "#7414F4";

export default function Home() {
  const [prenom, setPrenom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/create-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue");
      // Redirige vers Google pour l'ajout au Wallet
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <img src="/logo.png" alt="Fidélions" className="logo" />
        <h1>Bienvenue chez nous</h1>
        <p className="subtitle">
          Ajoutez votre carte de fidélité à votre téléphone en un geste — aucune
          application à installer.
        </p>

        <form onSubmit={handleAdd}>
          <label htmlFor="prenom">Votre prénom</label>
          <input
            id="prenom"
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Ex : Julie"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Un instant…" : "Ajouter à Google Wallet"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <p className="footnote">
          Vous n'avez pas Google Wallet ? Votre carte reste accessible via ce
          lien — gardez-le précieusement.
        </p>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, ${PURPLE} 0%, #4a0ba3 100%);
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .card {
          background: #fff;
          border-radius: 24px;
          padding: 40px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }
        .logo {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          margin-bottom: 16px;
        }
        h1 {
          font-size: 22px;
          margin: 0 0 8px;
          color: #1a1a1a;
        }
        .subtitle {
          color: #595959;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 28px;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
        }
        input {
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid #e0e0e0;
          font-size: 16px;
          margin-bottom: 16px;
        }
        input:focus {
          outline: none;
          border-color: ${PURPLE};
        }
        button {
          background: ${PURPLE};
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .error {
          color: #c0392b;
          font-size: 13px;
          margin-top: 12px;
        }
        .footnote {
          font-size: 12px;
          color: #8a8a8a;
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
}
