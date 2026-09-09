import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const PURPLE = "#7414F4";

// Page "lien employé" : accès volontairement minimal, sans mot de passe à
// retenir — juste un lien à envoyer (SMS/WhatsApp) à un employé. Il ne
// peut QUE scanner un QR et ajouter un tampon/point, jamais voir la liste
// des clients ni les statistiques. Le token dans l'URL fait office de clé
// d'accès (voir getRoleAsync dans lib/auth.js) — le régénérer depuis
// /commercant invalide immédiatement tous les liens déjà envoyés.
export default function ScanPage() {
  const router = useRouter();
  const { token } = router.query;

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [message, setMessage] = useState(null);
  const [found, setFound] = useState(null); // { objectId, prenom, points, blocked }
  const [confirming, setConfirming] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const jsQRRef = useRef(null);
  const pausedRef = useRef(false);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setMessage(null);
    setFound(null);
    setCameraStatus("Démarrage…");
    try {
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
          "L'accès à la caméra a été refusé pour ce site. Ouvre les réglages du navigateur (icône 🔒 à côté de l'adresse) → Autorisations → Caméra → Autoriser, puis recharge la page.";
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
        lookupClient(result.data.trim());
      }
    } catch {
      // On ignore l'erreur pour cette image et on continue au tick suivant.
    }
  }

  async function lookupClient(objectId) {
    setCameraStatus("Recherche du client…");
    try {
      const res = await fetch(`/api/scan-lookup?objectId=${encodeURIComponent(objectId)}`, {
        headers: { "x-employee-token": tokenRef.current || "" },
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Client introuvable." });
        resumeAfterDelay();
        return;
      }
      setFound(data);
      setCameraStatus("");
    } catch (err) {
      setMessage({ type: "error", text: "Connexion impossible : " + err.message });
      resumeAfterDelay();
    }
  }

  function resumeAfterDelay() {
    setTimeout(() => {
      pausedRef.current = false;
      setCameraStatus(cameraOn ? "Vise le QR affiché sur la carte du client…" : "");
    }, 2000);
  }

  async function confirmStamp() {
    if (!found) return;
    setConfirming(true);
    setMessage(null);
    try {
      const res = await fetch("/api/add-stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-employee-token": tokenRef.current || "" },
        body: JSON.stringify({ objectId: found.objectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Erreur lors de l'ajout." });
      } else {
        setMessage({
          type: "success",
          text: data.rewardReached
            ? `🎉 Récompense débloquée pour ${found.prenom} !`
            : `✅ +1 pour ${found.prenom} (total : ${data.client.points}).`,
        });
        setFound(null);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connexion impossible : " + err.message });
    } finally {
      setConfirming(false);
      pausedRef.current = false;
      setCameraStatus(cameraOn ? "Vise le QR affiché sur la carte du client…" : "");
    }
  }

  return (
    <div className="page">
      <div className="wrap">
        <h1>Fidélions — Scan</h1>
        <p className="subtitle">
          Accès employé : scanne la carte d'un client pour lui ajouter un tampon. Aucune autre
          information n'est accessible depuis cette page.
        </p>

        {message && <div className={`banner ${message.type}`}>{message.text}</div>}

        <div className="card">
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              borderRadius: 12,
              background: "#000",
              display: cameraOn ? "block" : "none",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!cameraOn && (
            <button className="primary" onClick={startCamera}>
              📷 Ouvrir le scanner
            </button>
          )}
          {cameraOn && (
            <button className="secondary" onClick={stopCamera}>
              Fermer le scanner
            </button>
          )}
          {cameraStatus && <p className="camera-status">{cameraStatus}</p>}
        </div>

        {found && (
          <div className="card found-card">
            <h2>{found.prenom}</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              {found.points} tampon{found.points > 1 ? "s" : ""} actuellement.
            </p>
            {found.blocked ? (
              <p className="banner error">Ce client est bloqué — impossible d'ajouter un tampon.</p>
            ) : (
              <button className="primary" disabled={confirming} onClick={confirmStamp}>
                {confirming ? "Ajout…" : "+ 1 tampon"}
              </button>
            )}
          </div>
        )}
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
    margin-bottom: 8px;
  }
  h2 {
    font-size: 18px;
    margin: 0 0 4px;
    color: #1a1a1a;
  }
  .subtitle {
    color: #595959;
    font-size: 14px;
    margin-bottom: 20px;
  }
  .card {
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .found-card {
    text-align: center;
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
    padding: 14px 16px;
    width: 100%;
  }
  button.primary:disabled {
    opacity: 0.6;
    cursor: default;
  }
  button.secondary {
    background: #eee;
    color: #333;
    padding: 10px 14px;
    width: 100%;
    margin-top: 10px;
  }
  .camera-status {
    margin-top: 12px;
    font-size: 13px;
    color: #595959;
    text-align: center;
  }
  .banner {
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 13.5px;
    margin-bottom: 16px;
  }
  .banner.error {
    background: #fde8e8;
    color: #a12b2b;
  }
  .banner.success {
    background: #e8f7ee;
    color: #1e7a42;
  }
`;
