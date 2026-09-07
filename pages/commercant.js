import { useEffect, useRef, useState } from "react";

const PURPLE = "#7414F4";
const PW_STORAGE_KEY = "fidelions_merchant_pw";

export default function Commercant() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);

  // Au chargement, si un mot de passe est déjà enregistré sur cet
  // appareil, on l'essaie automatiquement.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(PW_STORAGE_KEY) : null;
    if (saved) {
      setPassword(saved);
      tryAuth(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryAuth(pw) {
    setChecking(true);
    setAuthError("");
    try {
      const res = await fetch("/api/clients", {
        headers: { "x-merchant-password": pw },
      });
      if (res.status === 401) {
        setAuthError("Mot de passe incorrect.");
        setChecking(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setClients(data.clients || []);
      setAuthed(true);
      localStorage.setItem(PW_STORAGE_KEY, pw);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function refreshClients() {
    try {
      const res = await fetch("/api/clients", {
        headers: { "x-merchant-password": password },
      });
      const data = await res.json();
      if (res.ok) setClients(data.clients || []);
    } catch {
      // silencieux — ce n'est qu'un rafraîchissement
    }
  }

  async function addStamp(objectId) {
    setMessage(null);
    try {
      const res = await fetch("/api/add-stamp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-password": password,
        },
        body: JSON.stringify({ objectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage({
        type: "success",
        text: data.rewardReached
          ? `🎉 ${data.client.prenom} a débloqué sa récompense ! (${data.client.points} tampons)`
          : `+1 tampon pour ${data.client.prenom} (${data.client.points} tampon${data.client.points > 1 ? "s" : ""})`,
      });
      refreshClients();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  // Scanner QR par photo : on ouvre l'appareil photo natif du téléphone
  // (au lieu d'un flux vidéo en direct dans la page, source d'instabilité
  // sur certains navigateurs mobiles), on prend UNE photo, et on décode le
  // QR dessus. Tout est protégé par try/catch : au pire ça affiche un
  // message d'erreur, ça ne peut plus jamais faire planter la page.
  function openCamera() {
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.click();
  }

  async function handlePhoto(e) {
    const file = e.target.files && e.target.files[0];
    // On vide la valeur tout de suite pour pouvoir reprendre une photo
    // même si on annule ou si ça échoue.
    if (e.target) e.target.value = "";
    if (!file) return;

    setScanning(true);
    setMessage(null);
    try {
      const decodedText = await decodeQrFromFile(file);
      if (!decodedText) {
        setMessage({
          type: "error",
          text: "Aucun QR détecté sur la photo. Reprends la photo en te rapprochant, ou utilise la recherche ci-dessous.",
        });
        return;
      }
      await addStamp(decodedText.trim());
    } catch (err) {
      setMessage({
        type: "error",
        text: "Impossible de lire cette photo : " + (err?.message || err),
      });
    } finally {
      setScanning(false);
    }
  }

  async function decodeQrFromFile(file) {
    const jsQR = (await import("jsqr")).default;
    const imageUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Image illisible"));
        el.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      // On limite la taille pour que le décodage reste rapide sur mobile.
      const maxSize = 1200;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = jsQR(imageData.data, imageData.width, imageData.height);
      return result ? result.data : null;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  const filtered = clients.filter((c) =>
    c.prenom.toLowerCase().includes(search.trim().toLowerCase())
  );

  if (!authed) {
    return (
      <div className="page">
        <div className="card">
          <h1>Espace commerçant</h1>
          <p className="subtitle">Réservé au restaurant — entrez le mot de passe.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              tryAuth(password);
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
            />
            <button type="submit" disabled={checking}>
              {checking ? "Vérification…" : "Entrer"}
            </button>
          </form>
          {authError && <p className="error">{authError}</p>}
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap">
        <h1>Espace commerçant</h1>

        {message && (
          <div className={`banner ${message.type}`}>{message.text}</div>
        )}

        <div className="card">
          <h2>Scanner un client</h2>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            Prends une photo du QR affiché sur la carte du client.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            style={{ display: "none" }}
          />
          <button className="primary" onClick={openCamera} disabled={scanning}>
            {scanning ? "Lecture en cours…" : "📷 Prendre une photo du QR"}
          </button>
        </div>

        <div className="card">
          <h2>Ou recherchez un client</h2>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            Tape le prénom du client, puis clique "+1 tampon" sur sa ligne.
          </p>
          <input
            type="text"
            placeholder="Prénom du client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="list">
            {filtered.length === 0 && <p className="empty">Aucun client trouvé.</p>}
            {filtered.map((c) => (
              <div className="row" key={c.objectId}>
                <div>
                  <strong>{c.prenom}</strong>
                  <div className="meta">
                    {c.points} tampon{c.points > 1 ? "s" : ""} · inscrit le{" "}
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <button className="primary small" onClick={() => addStamp(c.objectId)}>
                  +1 tampon
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    min-height: 100vh;
    background: #f5f4fb;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px;
    display: flex;
    justify-content: center;
  }
  .wrap {
    width: 100%;
    max-width: 480px;
  }
  h1 {
    color: ${PURPLE};
    font-size: 22px;
    margin-bottom: 16px;
  }
  h2 {
    font-size: 16px;
    margin: 0 0 12px;
    color: #1a1a1a;
  }
  .card {
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .subtitle {
    color: #595959;
    font-size: 14px;
    margin-bottom: 20px;
  }
  input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid #e0e0e0;
    font-size: 15px;
    margin-bottom: 12px;
    box-sizing: border-box;
  }
  input:focus {
    outline: none;
    border-color: ${PURPLE};
  }
  button {
    cursor: pointer;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 14px;
  }
  button.primary {
    background: ${PURPLE};
    color: #fff;
    padding: 12px 16px;
    width: 100%;
  }
  button.primary.small {
    width: auto;
    padding: 8px 14px;
    font-size: 13px;
    white-space: nowrap;
  }
  button.secondary {
    background: #eee;
    color: #333;
    padding: 10px 14px;
    width: 100%;
    margin-top: 10px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 400px;
    overflow-y: auto;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #faf9fd;
    border-radius: 10px;
  }
  .meta {
    font-size: 12px;
    color: #8a8a8a;
  }
  .empty {
    color: #8a8a8a;
    font-size: 14px;
    text-align: center;
    padding: 12px 0;
  }
  .error {
    color: #c0392b;
    font-size: 13px;
    margin-top: 10px;
  }
  .banner {
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 600;
  }
  .banner.success {
    background: #e8f8ee;
    color: #1a7a3f;
  }
  .banner.error {
    background: #fdecea;
    color: #c0392b;
  }
`;
