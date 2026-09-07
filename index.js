import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const PURPLE = "#7414F4";

export default function Home() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, referralUrl, points }
  const [copied, setCopied] = useState(false);
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    if (router.isReady && router.query.ref) {
      setRefCode(String(router.query.ref));
    }
  }, [router.isReady, router.query.ref]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/create-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom, ref: refCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyReferral() {
    if (!result?.referralUrl) return;
    navigator.clipboard.writeText(result.referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="page">
      <div className="card">
        <img src="/logo.png" alt="Fidélions" className="logo" />

        {!result ? (
          <>
            <h1>Bienvenue chez nous</h1>
            <p className="subtitle">
              Ajoutez votre carte de fidélité à votre téléphone en un geste —
              aucune application à installer.
            </p>
            {refCode && (
              <p className="refNotice">🎁 Un ami vous a invité — vous démarrez avec un tampon offert !</p>
            )}

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
                {loading ? "Un instant…" : "Créer ma carte"}
              </button>
            </form>

            {error && <p className="error">{error}</p>}
          </>
        ) : (
          <>
            <h1>Votre carte est prête 🎉</h1>
            <p className="subtitle">
              {result.points > 0
                ? `Vous démarrez avec ${result.points} tampon${result.points > 1 ? "s" : ""} !`
                : "Ajoutez-la à Google Wallet pour commencer à collectionner vos tampons."}
            </p>

            <a className="walletBtn" href={result.url}>
              Ajouter à Google Wallet
            </a>

            <div className="referralBox">
              <p className="referralTitle">Invitez un ami, gagnez un tampon</p>
              <p className="referralText">
                Partagez votre lien : vous gagnez chacun 1 tampon quand il s'inscrit.
              </p>
              <div className="referralRow">
                <input readOnly value={result.referralUrl} onFocus={(e) => e.target.select()} />
                <button type="button" onClick={copyReferral}>
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
            </div>
          </>
        )}

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
        .refNotice {
          background: #f3ecff;
          color: ${PURPLE};
          font-size: 13px;
          font-weight: 600;
          border-radius: 10px;
          padding: 10px 14px;
          margin: -16px 0 20px;
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
        .walletBtn {
          display: block;
          background: ${PURPLE};
          color: #fff;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          margin-bottom: 24px;
        }
        .referralBox {
          background: #faf9fd;
          border-radius: 14px;
          padding: 18px;
          text-align: left;
        }
        .referralTitle {
          font-weight: 700;
          font-size: 14px;
          margin: 0 0 4px;
          color: #1a1a1a;
        }
        .referralText {
          font-size: 12px;
          color: #8a8a8a;
          margin: 0 0 12px;
        }
        .referralRow {
          display: flex;
          gap: 8px;
        }
        .referralRow input {
          flex: 1;
          margin-bottom: 0;
          font-size: 12px;
          padding: 10px 12px;
        }
        .referralRow button {
          padding: 10px 14px;
          font-size: 13px;
          white-space: nowrap;
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
