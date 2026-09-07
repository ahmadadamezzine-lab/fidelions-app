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

  // --- Scanner caméra maison (getUserMedia + jsQR) ---
  // Pourquoi pas une librairie toute faite : html5-qrcode plantait sur
  // certains mobiles, et l'appareil photo natif (via <input capture>)
  // affichait un écran noir (permission caméra du site jamais demandée).
  // Ici on demande nous-mêmes l'autorisation caméra du navigateur (le vrai
  // popup "Autoriser l'accès à la caméra ?"), on affiche le flux dans une
  // vraie balise <video>, et on décode nous-mêmes image par image avec
  // jsQR — tout est dans un try/catch, rien ne peut faire planter la page.
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStatus, setCameraStatus] = useState(""); // message sous la vidéo pendant le scan
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const jsQRRef = useRef(null);
  const pausedRef = useRef(false);

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

  // Coupe bien la caméra si on quitte la page pendant qu'elle tourne.
  useEffect(() => {
    return () => stopCamera();
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

  async function startCamera() {
    setMessage(null);
    setCameraStatus("Démarrage…");
    try {
      // On charge jsQR une seule fois, avant d'ouvrir la caméra.
      if (!jsQRRef.current) {
        jsQRRef.current = (await import("jsqr")).default;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      pausedRef.current = false;
      setCameraOn(true);
      setCameraStatus("Vise le QR affiché sur la carte du client…");
      scanTimerRef.current = setInterval(scanFrame, 300);
    } catch (err) {
      let text = "Impossible d'accéder à la caméra : " + (err?.message || err);
      if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        text =
          "L'accès à la caméra a été refusé pour ce site. Sur ton téléphone : ouvre les réglages du navigateur (ou appuie sur l'icône 🔒/ⓘ à côté de l'adresse du site) → Autorisations → Caméra → Autoriser, puis recharge la page.";
      } else if (err && err.name === "NotFoundError") {
        text = "Aucune caméra détectée sur cet appareil.";
      }
      setMessage({ type: "error", text });
      setCameraStatus("");
      stopCamera();
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignoré
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        // ignoré
      }
    }
    setCameraOn(false);
    setCameraStatus("");
  }

  // Appelée toutes les 300ms tant que la caméra tourne. Protégée de bout
  // en bout : la moindre erreur ici ne fait qu'ignorer cette image, jamais
  // planter la page.
  function scanFrame() {
    if (pausedRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const jsQR = jsQRRef.current;
      if (!video || !canvas || !jsQR) return;
      if (video.readyState < video.HAVE_ENOUGH_DATA) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const result = jsQR(imageData.data, width, height);

      if (result && result.data) {
        pausedRef.current = true;
        setCameraStatus("QR détecté, ajout du tampon…");
        addStamp(result.data.trim()).finally(() => {
          setTimeout(() => {
            pausedRef.current = false;
            setCameraStatus("Vise le QR affiché sur la carte du client…");
          }, 2000);
        });
      }
    } catch {
      // On ignore l'erreur pour cette image et on continue au tick suivant.
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
            La première fois, ton navigateur va demander l'autorisation
            d'utiliser la caméra — accepte, c'est nécessaire pour scanner.
          </p>

          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              width: "100%",
              borderRadius: 12,
              background: "#000",
              display: cameraOn ? "block" : "none",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {cameraOn && cameraStatus && (
            <p className="subtitle" style={{ margin: "8px 0 0" }}>
              {cameraStatus}
            </p>
          )}

          {!cameraOn ? (
            <button className="primary" onClick={startCamera}>
              Activer la caméra
            </button>
          ) : (
            <button className="secondary" onClick={stopCamera}>
              Arrêter la caméra
            </button>
          )}
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
