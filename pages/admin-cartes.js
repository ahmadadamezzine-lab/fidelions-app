// pages/admin-cartes.js
//
// Outil interne, réservé à Adam (aucun commerçant n'y a ni lien ni accès
// depuis /commercant) : générer des lots de cartes NFC/QR à commander chez
// l'imprimeur (voir lib/db.js, section "Cartes NFC/QR physiques"), puis
// relier chaque carte à un commerçant au moment où elle est vendue.
//
// Protégé par un seul mot de passe (variable d'environnement
// CARDS_ADMIN_PASSWORD, voir README) échangé contre un jeton signé
// (lib/session.js) gardé en mémoire dans localStorage — comme
// /commercant, pas besoin de se reconnecter à chaque visite sur cet
// appareil.

import { useEffect, useState } from "react";

const TOKEN_KEY = "fidelions_admin_token";
const PURPLE = "#7414F4";

export default function AdminCartes() {
  const [token, setToken] = useState(null);
  const [pwInput, setPwInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [cards, setCards] = useState(null);
  const [listError, setListError] = useState("");

  const [quantity, setQuantity] = useState(20);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [lastBatch, setLastBatch] = useState(null); // liste d'URLs du dernier lot généré
  const [copied, setCopied] = useState(false);

  const [assignInputs, setAssignInputs] = useState({}); // { [code]: slugSaisi }
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (token) loadCards(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadCards(t) {
    setListError("");
    try {
      const res = await fetch("/api/admin-cards", { headers: { "x-admin-password": t } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setCards(data.cards);
    } catch (err) {
      if (String(err.message).includes("Session")) {
        logout();
      } else {
        setListError(err.message);
      }
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin-cards-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPwInput("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCards(null);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenError("");
    setGenLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/admin-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": token },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setLastBatch(data.created);
      loadCards(token);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenLoading(false);
    }
  }

  function copyBatch() {
    if (!lastBatch) return;
    const text = lastBatch.map((c) => c.url).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleAssign(code) {
    setActionError("");
    const slug = (assignInputs[code] || "").trim();
    if (!slug) return;
    try {
      const res = await fetch("/api/admin-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": token },
        body: JSON.stringify({ code, merchantSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setAssignInputs((prev) => ({ ...prev, [code]: "" }));
      loadCards(token);
    } catch (err) {
      setActionError(`${code} : ${err.message}`);
    }
  }

  async function handleUnassign(code) {
    setActionError("");
    try {
      const res = await fetch("/api/admin-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": token },
        body: JSON.stringify({ code, merchantSlug: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      loadCards(token);
    } catch (err) {
      setActionError(`${code} : ${err.message}`);
    }
  }

  if (!token) {
    return (
      <div className="wrap">
        <form className="card" onSubmit={handleLogin}>
          <h1>Admin cartes</h1>
          <p className="sub">Réservé à Adam.</p>
          <input
            type="password"
            placeholder="Mot de passe"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            autoFocus
          />
          {loginError && <p className="error">{loginError}</p>}
          <button type="submit" disabled={loginLoading}>
            {loginLoading ? "..." : "Se connecter"}
          </button>
        </form>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <h1>Cartes NFC/QR</h1>
        <button type="button" className="link" onClick={logout}>
          Se déconnecter
        </button>
      </div>

      <div className="card">
        <h2>Générer un nouveau lot</h2>
        <p className="sub">
          Génère des codes uniques (pas encore liés à un commerçant) et leurs URLs complètes — à
          copier tel quel dans le formulaire de commande de l'imprimeur (encodage NFC + QR).
        </p>
        <form onSubmit={handleGenerate} className="row">
          <input
            type="number"
            min="1"
            max="500"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <button type="submit" disabled={genLoading}>
            {genLoading ? "..." : "Générer"}
          </button>
        </form>
        {genError && <p className="error">{genError}</p>}
        {lastBatch && (
          <div style={{ marginTop: 14 }}>
            <textarea readOnly rows={Math.min(10, lastBatch.length)} value={lastBatch.map((c) => c.url).join("\n")} />
            <button type="button" className="secondary" onClick={copyBatch} style={{ marginTop: 8 }}>
              {copied ? "Copié !" : "Copier les URLs"}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Toutes les cartes</h2>
        {actionError && <p className="error">{actionError}</p>}
        {listError && <p className="error">{listError}</p>}
        {!cards ? (
          <p className="sub">Chargement…</p>
        ) : cards.length === 0 ? (
          <p className="sub">Aucune carte générée pour l'instant.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.code}>
                  <td className="mono">{c.code}</td>
                  <td>
                    {c.merchantSlug ? (
                      <span className="tag tag-assigned">{c.restaurantName || c.merchantSlug}</span>
                    ) : (
                      <span className="tag tag-free">Libre</span>
                    )}
                  </td>
                  <td>
                    {c.merchantSlug ? (
                      <button type="button" className="link" onClick={() => handleUnassign(c.code)}>
                        Libérer
                      </button>
                    ) : (
                      <span className="assign-row">
                        <input
                          type="text"
                          placeholder="slug du commerçant"
                          value={assignInputs[c.code] || ""}
                          onChange={(e) =>
                            setAssignInputs((prev) => ({ ...prev, [c.code]: e.target.value }))
                          }
                        />
                        <button type="button" onClick={() => handleAssign(c.code)}>
                          Attribuer
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .wrap {
    max-width: 780px;
    margin: 0 auto;
    padding: 40px 20px 80px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a1a;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  h1 {
    font-size: 22px;
    margin: 0;
  }
  h2 {
    font-size: 16px;
    margin: 0 0 6px;
  }
  .sub {
    color: #777;
    font-size: 13px;
    margin: 0 0 14px;
  }
  .card {
    background: #fff;
    border: 1.5px solid #eee;
    border-radius: 16px;
    padding: 22px;
    margin-bottom: 20px;
  }
  form.card {
    max-width: 340px;
    margin: 80px auto 0;
    text-align: center;
  }
  input, textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1.5px solid #e2ddee;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
  }
  textarea {
    font-family: ui-monospace, monospace;
    font-size: 12.5px;
    resize: vertical;
  }
  .row {
    display: flex;
    gap: 10px;
  }
  .row input {
    flex: 1;
  }
  button {
    background: ${PURPLE};
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  button.secondary {
    background: #f3ecff;
    color: ${PURPLE};
  }
  button.link {
    background: none;
    color: ${PURPLE};
    padding: 4px 0;
    font-weight: 600;
    font-size: 12.5px;
  }
  .error {
    color: #c0392b;
    font-size: 12.5px;
    margin: 8px 0 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    text-align: left;
    color: #8a8a8a;
    font-weight: 600;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 8px 6px;
    border-bottom: 1.5px solid #eee;
  }
  td {
    padding: 8px 6px;
    border-bottom: 1px solid #f2f0f7;
    vertical-align: middle;
  }
  .mono {
    font-family: ui-monospace, monospace;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .tag {
    display: inline-block;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
  }
  .tag-free {
    background: #f3f0fa;
    color: #8a80ab;
  }
  .tag-assigned {
    background: #e9f9ee;
    color: #1e8e4a;
  }
  .assign-row {
    display: flex;
    gap: 6px;
  }
  .assign-row input {
    width: 150px;
  }
  .assign-row button {
    padding: 8px 12px;
    font-size: 12.5px;
    white-space: nowrap;
  }
`;
