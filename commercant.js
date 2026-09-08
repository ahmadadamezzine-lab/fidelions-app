import { useEffect, useRef, useState } from "react";

const PURPLE = "#7414F4";
const PW_STORAGE_KEY = "fidelions_merchant_pw";

// Analyse automatique du tableau de bord : pas un vrai modèle d'IA (ça
// coûterait cher en appels API pour un gain flou), mais des règles
// simples qui lisent les mêmes données que Fidelix met en avant dans sa
// vidéo — croissance, client le plus fidèle, clients proches de la
// récompense, clients à relancer. Recalculé à chaque chargement des
// clients, aucun appel réseau supplémentaire.
function computeInsights(clients, rewardThreshold) {
  if (!clients || clients.length === 0) return [];
  const insights = [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const newThisWeek = clients.filter((c) => now - c.createdAt < 7 * DAY).length;
  const newLastWeek = clients.filter(
    (c) => now - c.createdAt >= 7 * DAY && now - c.createdAt < 14 * DAY
  ).length;
  if (newThisWeek > 0 && newLastWeek === 0) {
    insights.push(`📈 ${newThisWeek} nouve${newThisWeek > 1 ? "aux clients" : "au client"} cette semaine.`);
  } else if (newLastWeek > 0) {
    const diff = newThisWeek - newLastWeek;
    const pct = Math.round((Math.abs(diff) / newLastWeek) * 100);
    insights.push(
      diff >= 0
        ? `📈 Inscriptions en hausse de ${pct}% cette semaine (${newThisWeek} vs ${newLastWeek} la semaine passée).`
        : `📉 Inscriptions en baisse de ${pct}% cette semaine (${newThisWeek} vs ${newLastWeek} la semaine passée).`
    );
  }

  const top = [...clients].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  if (top && top.points > 0) {
    insights.push(`🏆 ${top.prenom} est ton client le plus fidèle avec ${top.points} tampons.`);
  }

  const threshold = rewardThreshold || 10;
  const nearReward = clients.filter((c) => {
    const pts = c.points || 0;
    if (pts === 0) return false;
    const remaining = threshold - (pts % threshold || threshold);
    return remaining > 0 && remaining <= 2;
  }).length;
  if (nearReward > 0) {
    insights.push(
      `🎯 ${nearReward} client${nearReward > 1 ? "s sont" : " est"} à 1-2 tampons de la récompense — bon moment pour une campagne.`
    );
  }

  const inactive = clients.filter((c) => now - (c.lastVisitAt || c.createdAt) > 30 * DAY).length;
  if (inactive > 0) {
    insights.push(
      `⚠️ ${inactive} client${inactive > 1 ? "s n'ont" : " n'a"} pas visité depuis plus de 30 jours — pense à une campagne de relance.`
    );
  }

  if (insights.length === 0) {
    insights.push("Pas encore assez de données pour une analyse utile — reviens avec plus de clients et de visites.");
  }

  return insights;
}

export default function Commercant() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [role, setRole] = useState(null); // "owner" | "cashier"
  const [rewardThreshold, setRewardThreshold] = useState(10);
  const [rewardLabel, setRewardLabel] = useState("Récompense fidélité");
  const [savingSettings, setSavingSettings] = useState(false);

  // --- Campagne : notification et/ou email envoyés à tous les clients d'un coup ---
  const [campaignHeader, setCampaignHeader] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [campaignSending, setCampaignSending] = useState(false);
  const [channelWallet, setChannelWallet] = useState(true);
  const [channelEmail, setChannelEmail] = useState(false);

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
  const clientsRef = useRef([]);

  // Toujours la liste la plus fraîche, même dans le callback de scan qui
  // tourne dans un setInterval démarré plus tôt (évite une liste de
  // clients périmée si de nouveaux clients s'inscrivent pendant le scan).
  useEffect(() => {
    clientsRef.current = clients;
  }, [clients]);

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
      setRole(data.role || "owner");
      if (data.rewardThreshold) setRewardThreshold(data.rewardThreshold);
      if (data.rewardLabel) setRewardLabel(data.rewardLabel);
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
      let text = data.rewardReached
        ? `🎉 ${data.client.prenom} a débloqué sa récompense ! (${data.client.points} tampons)`
        : `+1 tampon pour ${data.client.prenom} (${data.client.points} tampon${data.client.points > 1 ? "s" : ""})`;
      if (data.notificationSent === false) {
        text += " — tampon bien ajouté, mais la notification n'a pas pu partir (trop de notifications déjà envoyées à cette carte aujourd'hui).";
      }
      setMessage({ type: "success", text });
      refreshClients();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function saveSettings() {
    const threshold = Number(rewardThreshold);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
      setMessage({ type: "error", text: "Le nombre de tampons doit être entre 1 et 100." });
      return;
    }
    if (!rewardLabel.trim()) {
      setMessage({ type: "error", text: "Décris la récompense (ex : 1 café offert)." });
      return;
    }
    setSavingSettings(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-password": password,
        },
        body: JSON.stringify({ rewardThreshold: threshold, rewardLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setRewardThreshold(data.rewardThreshold);
      setRewardLabel(data.rewardLabel);
      setMessage({ type: "success", text: "Réglages de la récompense enregistrés." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingSettings(false);
    }
  }

  async function sendCampaign() {
    if (!campaignHeader.trim() || !campaignBody.trim()) {
      setMessage({ type: "error", text: "Écris un titre et un message avant d'envoyer." });
      return;
    }
    if (!channelWallet && !channelEmail) {
      setMessage({ type: "error", text: "Coche au moins un canal : notification et/ou email." });
      return;
    }
    setCampaignSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-password": password,
        },
        body: JSON.stringify({
          header: campaignHeader,
          body: campaignBody,
          channels: { wallet: channelWallet, email: channelEmail },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      const parts = [];
      if (data.sentWallet) parts.push(`${data.walletSent} notification(s) Wallet`);
      if (data.sentEmail) parts.push(`${data.emailSent}/${data.emailEligible} email(s)`);
      const failedParts = [];
      if (data.walletFailed > 0) failedParts.push(`${data.walletFailed} notification(s)`);
      if (data.emailFailed > 0) failedParts.push(`${data.emailFailed} email(s)`);

      setMessage({
        type: "success",
        text:
          `Campagne envoyée : ${parts.join(" + ")} 🎉` +
          (failedParts.length > 0 ? ` (échec : ${failedParts.join(", ")})` : ""),
      });
      setCampaignHeader("");
      setCampaignBody("");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setCampaignSending(false);
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
        const scannedId = result.data.trim();
        const match = clientsRef.current.find((c) => c.objectId === scannedId);
        pausedRef.current = true;

        if (match) {
          setSearch(match.prenom);
          setCameraStatus(`✅ ${match.prenom} trouvé — clique "+1 tampon" ci-dessous pour valider.`);
        } else {
          setCameraStatus("QR non reconnu — réessaie, ou cherche le client par prénom ci-dessous.");
        }

        setTimeout(() => {
          pausedRef.current = false;
          setCameraStatus("Vise le QR affiché sur la carte du client…");
        }, 2500);
      }
    } catch {
      // On ignore l'erreur pour cette image et on continue au tick suivant.
    }
  }

  const filtered = clients
    .filter((c) => c.prenom.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" }));

  // Stats calculées directement à partir des clients déjà chargés — pas
  // besoin d'un endpoint séparé pour une V1.
  const totalTampons = clients.reduce((sum, c) => sum + (c.points || 0), 0);
  const safeThreshold = Number(rewardThreshold) > 0 ? Number(rewardThreshold) : 10;
  const totalRecompenses = clients.reduce(
    (sum, c) => sum + Math.floor((c.points || 0) / safeThreshold),
    0
  );
  const todayStr = new Date().toDateString();
  const visitesAujourdhui = clients.filter(
    (c) => c.lastVisitAt && new Date(c.lastVisitAt).toDateString() === todayStr
  ).length;
  const ranking = [...clients]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);
  const emailEligibleCount = clients.filter((c) => c.email).length;
  const insights = computeInsights(clients, safeThreshold);

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

        {role === "owner" && (
          <div className="card">
            <h2>Aperçu</h2>
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value">{clients.length}</div>
                <div className="stat-label">Clients inscrits</div>
              </div>
              <div className="stat">
                <div className="stat-value">{totalTampons}</div>
                <div className="stat-label">Tampons distribués</div>
              </div>
              <div className="stat">
                <div className="stat-value">{visitesAujourdhui}</div>
                <div className="stat-label">Visites aujourd'hui</div>
              </div>
              <div className="stat">
                <div className="stat-value">{totalRecompenses}</div>
                <div className="stat-label">Récompenses débloquées</div>
              </div>
            </div>
            {ranking.length > 0 && (
              <>
                <p className="subtitle" style={{ marginTop: 16, marginBottom: 8 }}>
                  🏆 Classement de fidélité
                </p>
                <div className="ranking">
                  {ranking.map((c, i) => (
                    <div className="rank-row" key={c.objectId}>
                      <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                      <span className="rank-name">{c.prenom}</span>
                      <span className="rank-points">
                        {c.points} tampon{c.points > 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {insights.length > 0 && (
              <>
                <p className="subtitle" style={{ marginTop: 16, marginBottom: 8 }}>
                  🤖 Analyse automatique
                </p>
                <div className="insights">
                  {insights.map((text, i) => (
                    <div className="insight-row" key={i}>
                      {text}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {role === "owner" && (
          <div className="card">
            <h2>Réglages de la récompense</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Choisis combien de tampons il faut, et ce que le client gagne —
              comme chez Fidelix, réglable ici sans toucher au code.
            </p>
            <input
              type="number"
              min="1"
              max="100"
              placeholder="Nombre de tampons (ex : 10)"
              value={rewardThreshold}
              onChange={(e) => setRewardThreshold(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <input
              type="text"
              placeholder="Récompense (ex : 1 café offert)"
              value={rewardLabel}
              onChange={(e) => setRewardLabel(e.target.value)}
              maxLength={80}
            />
            <button className="primary" onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
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

        {role === "owner" && (
          <div className="card">
            <h2>Envoyer une campagne</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Un message envoyé d'un coup à tous tes {clients.length} client
              {clients.length > 1 ? "s" : ""} (promo, nouveau plat, événement…),
              visible directement dans leur Google Wallet.
            </p>
            <input
              type="text"
              placeholder="Titre (ex : Menu spécial ce week-end)"
              value={campaignHeader}
              onChange={(e) => setCampaignHeader(e.target.value)}
              maxLength={60}
            />
            <input
              type="text"
              placeholder="Message (ex : -20% sur toute la carte samedi et dimanche)"
              value={campaignBody}
              onChange={(e) => setCampaignBody(e.target.value)}
              maxLength={300}
            />
            <div className="channels">
              <label className="channel">
                <input
                  type="checkbox"
                  checked={channelWallet}
                  onChange={(e) => setChannelWallet(e.target.checked)}
                />
                Notification Wallet ({clients.length})
              </label>
              <label className="channel">
                <input
                  type="checkbox"
                  checked={channelEmail}
                  onChange={(e) => setChannelEmail(e.target.checked)}
                />
                Email ({emailEligibleCount} avec email)
              </label>
            </div>
            <button
              className="primary"
              onClick={sendCampaign}
              disabled={campaignSending || clients.length === 0}
            >
              {campaignSending ? "Envoi en cours…" : "Envoyer à tous les clients"}
            </button>
          </div>
        )}

        <div className="card">
          <h2>Ou recherchez un client</h2>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            Tape le prénom du client (ou scanne son QR ci-dessus), puis clique
            "+1 tampon" sur sa ligne.
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
                  {c.email && <div className="email-line">{c.email}</div>}
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
  .ranking {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rank-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: #faf9fd;
    border-radius: 10px;
  }
  .rank-badge {
    width: 22px;
    height: 22px;
    flex: none;
    border-radius: 50%;
    background: #e9e4f8;
    color: ${PURPLE};
    font-size: 12px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rank-badge.rank-1 { background: #f7d774; color: #7a5b00; }
  .rank-badge.rank-2 { background: #d9d9e3; color: #4a4a4a; }
  .rank-badge.rank-3 { background: #e3b98c; color: #6b3f14; }
  .rank-name {
    flex: 1;
    font-size: 13.5px;
    font-weight: 600;
    color: #1a1a1a;
  }
  .rank-points {
    font-size: 12.5px;
    color: #8a8a8a;
    font-variant-numeric: tabular-nums;
  }
  .insights {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .insight-row {
    font-size: 12.5px;
    line-height: 1.5;
    background: #faf9fd;
    border-radius: 10px;
    padding: 8px 10px;
    color: #333;
  }
  .channels {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: -4px 0 14px;
  }
  .channel {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    color: #1a1a1a;
    cursor: pointer;
  }
  .channel input {
    width: auto;
    margin: 0;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .stat {
    background: #faf9fd;
    border-radius: 12px;
    padding: 14px;
    text-align: center;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 800;
    color: ${PURPLE};
    font-variant-numeric: tabular-nums;
  }
  .stat-label {
    font-size: 11.5px;
    color: #8a8a8a;
    margin-top: 2px;
  }
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
  .email-line {
    font-size: 11px;
    color: #b0b0b0;
    margin-top: 1px;
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
