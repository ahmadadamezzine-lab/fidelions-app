import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import LegalFooter from "../../components/LegalFooter";

const PURPLE = "#7414F4";

// --- Mode "marche sans connexion" (basique) ---------------------------
// Pas de vraie synchronisation en arrière-plan (Background Sync) — ce
// qu'on peut faire raisonnablement sans backend dédié : un service worker
// (public/sw-scan.js) qui garde une copie des pages/scripts déjà visités
// pour que l'écran continue de s'afficher hors-ligne, un cache local des
// dernières fiches clients scannées (pour reconnaître un client déjà vu
// même sans réseau), et une file d'actions "+1" en attente, rejouée dès
// que la connexion revient. Clé de stockage préfixée par le token du lien
// employé pour ne jamais mélanger deux restaurants sur le même appareil.
const QUEUE_KEY_PREFIX = "fidelions_scan_queue_";
const CACHE_KEY_PREFIX = "fidelions_scan_cache_";

function getQueue(token) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY_PREFIX + token);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function setQueue(token, queue) {
  try {
    localStorage.setItem(QUEUE_KEY_PREFIX + token, JSON.stringify(queue));
  } catch {
    // stockage local indisponible (navigation privée…) — la file ne
    // survivra pas au rechargement, mais l'action en cours n'est pas bloquée
  }
}

function enqueueStamp(token, item) {
  const queue = getQueue(token);
  queue.push({ ...item, queuedAt: Date.now() });
  setQueue(token, queue);
  return queue.length;
}

function getClientCache(token) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + token);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function setClientCacheEntry(token, objectId, data) {
  try {
    const cache = getClientCache(token);
    cache[objectId] = data;
    localStorage.setItem(CACHE_KEY_PREFIX + token, JSON.stringify(cache));
  } catch {
    // pas grave — juste pas de secours hors-ligne pour ce client
  }
}

/** Rejoue la file d'actions en attente. Ne retire de la file QUE ce qui ne
 * peut de toute façon jamais réussir : une vraie erreur réseau (toujours
 * hors-ligne, voir le catch), ou une erreur applicative définitive envoyée
 * par le serveur (4xx — client bloqué, introuvable, requête invalide :
 * rejouer à l'identique ne changerait rien). Une erreur serveur transitoire
 * (5xx) reste dans la file : ce n'est pas parce que le réseau répond que la
 * synchronisation a réellement pu aboutir. */
async function flushQueue(token, authHeadersFn) {
  const queue = getQueue(token);
  if (queue.length === 0) return { synced: 0, failed: 0, stillOffline: 0 };
  const remaining = [];
  let synced = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      const res = await fetch("/api/add-stamp", {
        method: "POST",
        headers: authHeadersFn({ "Content-Type": "application/json" }),
        body: JSON.stringify({ objectId: item.objectId, amount: item.amount, reviewGiven: item.reviewGiven }),
      });
      if (res.ok) {
        synced += 1;
      } else if (res.status >= 500) {
        remaining.push(item); // erreur serveur transitoire — on retentera plus tard
      } else {
        failed += 1; // erreur applicative définitive (4xx) — inutile de retenter
      }
    } catch {
      remaining.push(item);
    }
  }
  setQueue(token, remaining);
  return { synced, failed, stillOffline: remaining.length };
}

// Page "lien employé" : un seul lien à envoyer à toute l'équipe (SMS,
// WhatsApp…). Chaque employé s'identifie ensuite avec son propre code à 4
// chiffres (réglé par le patron dans l'onglet Équipe de /commercant), ce
// qui détermine ce qu'il peut faire : au minimum scanner une carte pour
// ajouter un point, et en plus la liste des clients / les
// statistiques / l'envoi de campagnes si le patron le lui a autorisé. Le
// token dans l'URL fait office de porte d'entrée commune (voir
// getRoleAsync dans lib/auth.js) — le régénérer depuis /commercant coupe
// l'accès à toute l'équipe d'un coup.
export default function ScanPage() {
  const router = useRouter();
  const { token } = router.query;
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // --- Identification par code à 4 chiffres ---
  const [auth, setAuth] = useState(null); // { employeeId, name, permissions, loyaltyMode, pointsConfig }
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);
  const pinRef = useRef("");

  const [section, setSection] = useState("scanner");
  const [message, setMessage] = useState(null);

  // --- Mode sans connexion : service worker (cache la page pour qu'elle se
  // recharge même hors-ligne) + suivi de l'état réseau + file d'actions en
  // attente (voir flushQueue plus haut).
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const goOnline = () => {
      setIsOnline(true);
      trySync();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-scan.js", { scope: "/scan/" }).catch(() => {
        // pas grave — l'écran fonctionne quand même, juste sans le
        // rechargement hors-ligne de la page elle-même
      });
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tokenRef.current) setQueueCount(getQueue(tokenRef.current).length);
  }, [auth]);

  async function trySync() {
    if (!tokenRef.current || !pinRef.current || syncing) return;
    const before = getQueue(tokenRef.current).length;
    if (before === 0) return;
    setSyncing(true);
    try {
      const result = await flushQueue(tokenRef.current, authHeaders);
      setQueueCount(getQueue(tokenRef.current).length);
      if (result.synced > 0) {
        setMessage({
          type: "success",
          text: `${result.synced} action${result.synced > 1 ? "s" : ""} synchronisée${result.synced > 1 ? "s" : ""} après le retour de connexion.`,
        });
      }
    } finally {
      setSyncing(false);
    }
  }

  function onQueueChange() {
    if (tokenRef.current) setQueueCount(getQueue(tokenRef.current).length);
  }

  async function submitPin(e) {
    e.preventDefault();
    if (!/^[0-9]{4}$/.test(pinInput)) {
      setPinError("Le code fait exactement 4 chiffres.");
      return;
    }
    setCheckingPin(true);
    setPinError("");
    try {
      const res = await fetch("/api/employee-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || "Code incorrect.");
        setCheckingPin(false);
        return;
      }
      pinRef.current = pinInput;
      setAuth({
        employeeId: data.employeeId,
        name: data.name,
        permissions: data.permissions,
        loyaltyMode: data.loyaltyMode || "stamps",
        pointsConfig: data.pointsConfig || { pointsPerAmount: 1, amountUnit: 10 },
      });
    } catch (err) {
      setPinError("Connexion impossible : " + err.message);
    } finally {
      setCheckingPin(false);
    }
  }

  function authHeaders(extra) {
    return {
      "x-employee-token": tokenRef.current || "",
      "x-employee-pin": pinRef.current || "",
      ...extra,
    };
  }

  function logout() {
    pinRef.current = "";
    setAuth(null);
    setPinInput("");
    setSection("scanner");
    setMessage(null);
  }

  if (!auth) {
    return (
      <div className="page">
        <div className="wrap">
          <h1>Fidélions — Équipe</h1>
          <p className="subtitle">Tape ton code personnel à 4 chiffres pour continuer.</p>
          <div className="card">
            <form onSubmit={submitPin}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Code à 4 chiffres"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                autoFocus
                maxLength={4}
                style={{ textAlign: "center", fontSize: 24, letterSpacing: 8 }}
              />
              <button className="primary" type="submit" disabled={checkingPin}>
                {checkingPin ? "Vérification…" : "Entrer"}
              </button>
            </form>
            {pinError && <p className="error">{pinError}</p>}
          </div>
          <LegalFooter />
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const sections = [{ id: "scanner", label: "Scanner" }];
  if (auth.permissions?.clients) sections.push({ id: "clients", label: "Clients" });
  if (auth.permissions?.stats) sections.push({ id: "stats", label: "Statistiques" });
  if (auth.permissions?.campagnes) sections.push({ id: "campagnes", label: "Campagnes" });

  return (
    <div className="page">
      <div className="wrap">
        <div className="top-row">
          <h1>Bonjour, {auth.name}</h1>
          <button className="link-btn" type="button" onClick={logout}>
            Se déconnecter
          </button>
        </div>

        {!isOnline && (
          <div className="banner offline">
            Hors connexion — le scan continue de fonctionner, les points seront synchronisés au retour du réseau.
          </div>
        )}
        {isOnline && queueCount > 0 && (
          <div className="banner offline">
            {queueCount} action{queueCount > 1 ? "s" : ""} en attente de synchronisation.{" "}
            <button type="button" className="link-btn" onClick={trySync} disabled={syncing}>
              {syncing ? "Synchronisation…" : "Synchroniser maintenant"}
            </button>
          </div>
        )}

        {message && <div className={`banner ${message.type}`}>{message.text}</div>}

        {sections.length > 1 && (
          <div className="tabs">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`tab-btn${section === s.id ? " active" : ""}`}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {section === "scanner" && (
          <ScannerSection
            authHeaders={authHeaders}
            setMessage={setMessage}
            token={token}
            loyaltyMode={auth.loyaltyMode}
            onQueueChange={onQueueChange}
          />
        )}
        {section === "clients" && auth.permissions?.clients && (
          <ClientsSection authHeaders={authHeaders} setMessage={setMessage} loyaltyMode={auth.loyaltyMode} />
        )}
        {section === "stats" && auth.permissions?.stats && (
          <StatsSection authHeaders={authHeaders} />
        )}
        {section === "campagnes" && auth.permissions?.campagnes && (
          <CampagneSection authHeaders={authHeaders} setMessage={setMessage} />
        )}

        <LegalFooter />
      </div>
      <style jsx>{styles}</style>
    </div>
  );
}

// --- Scanner (toujours disponible, y compris hors connexion) ---
function ScannerSection({ authHeaders, setMessage, token, loyaltyMode, onQueueChange }) {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [found, setFound] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [reviewGiven, setReviewGiven] = useState(false);

  // --- Nouveau client (carte créée EN CAISSE par l'employé) -------------
  // Compte pour le classement "cartes créées" de l'onglet Équipe (voir
  // recordEmployeeCardCreated, lib/db.js) — contrairement à l'inscription
  // que le client fait lui-même via le lien public /r/[slug], jamais
  // attribuée à un employé.
  const [showNewClient, setShowNewClient] = useState(false);
  const [newPrenom, setNewPrenom] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientResult, setNewClientResult] = useState(null); // { url, prenom }

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const jsQRRef = useRef(null);
  const pausedRef = useRef(false);

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
          "L'accès à la caméra a été refusé pour ce site. Ouvre les réglages du navigateur (icône cadenas à côté de l'adresse) → Autorisations → Caméra → Autoriser, puis recharge la page.";
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
    setAmountInput("");
    setReviewGiven(false);
    try {
      const res = await fetch(`/api/scan-lookup?objectId=${encodeURIComponent(objectId)}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Client introuvable." });
        resumeAfterDelay();
        return;
      }
      setFound(data);
      if (token) setClientCacheEntry(token, objectId, data);
      setCameraStatus("");
    } catch (err) {
      // Probablement hors connexion : si ce client a déjà été scanné sur cet
      // appareil, on peut continuer avec ses dernières infos connues (voir
      // setClientCacheEntry) plutôt que de bloquer l'employé.
      const cached = token ? getClientCache(token)[objectId] : null;
      if (cached) {
        setFound({ ...cached, _offline: true });
        setMessage({ type: "success", text: "Hors connexion — dernières infos connues de ce client." });
        setCameraStatus("");
      } else {
        setMessage({
          type: "error",
          text: "Hors connexion et ce client n'a encore jamais été scanné sur cet appareil — impossible de l'identifier sans réseau.",
        });
        resumeAfterDelay();
      }
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
    let amount;
    if (loyaltyMode === "points") {
      amount = Number(String(amountInput).replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) {
        setMessage({ type: "error", text: "Indique le montant dépensé par le client avant de valider." });
        return;
      }
    }
    setConfirming(true);
    setMessage(null);
    try {
      const res = await fetch("/api/add-stamp", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ objectId: found.objectId, amount, reviewGiven }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Erreur lors de l'ajout." });
      } else {
        let text = data.rewardReached
          ? `Récompense débloquée pour ${found.prenom} !`
          : `+${data.delta || 1} pour ${found.prenom} (total : ${data.client.points}).`;
        if (data.reviewBonusApplied) text += " Merci pour l'avis Google !";
        setMessage({ type: "success", text });
        setFound(null);
      }
    } catch (err) {
      // Hors connexion (ou réseau instable) : on met l'action de côté au
      // lieu de la perdre — elle sera rejouée automatiquement au retour du
      // réseau (voir flushQueue), sans bloquer le reste du service.
      enqueueStamp(token, { objectId: found.objectId, amount, reviewGiven });
      if (onQueueChange) onQueueChange();
      setMessage({
        type: "success",
        text: `Hors connexion — le point pour ${found.prenom} est enregistré et sera synchronisé automatiquement.`,
      });
      setFound(null);
    } finally {
      setConfirming(false);
      pausedRef.current = false;
      setCameraStatus(cameraOn ? "Vise le QR affiché sur la carte du client…" : "");
    }
  }

  async function createNewClient(e) {
    e.preventDefault();
    if (!newPrenom.trim() || !newEmail.trim()) return;
    setCreatingClient(true);
    setMessage(null);
    try {
      const res = await fetch("/api/create-pass", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ prenom: newPrenom, email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création.");
      setNewClientResult({ url: data.url, prenom: newPrenom.trim() });
      setNewPrenom("");
      setNewEmail("");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setCreatingClient(false);
    }
  }

  function resetNewClient() {
    setShowNewClient(false);
    setNewClientResult(null);
    setNewPrenom("");
    setNewEmail("");
  }

  return (
    <>
      <div className="card">
        {!cameraOn && !found && (
          <button
            type="button"
            className="secondary small"
            style={{ marginBottom: 12 }}
            onClick={() => setShowNewClient((v) => !v)}
          >
            {showNewClient ? "Annuler" : "+ Nouveau client (pas encore de carte)"}
          </button>
        )}

        {showNewClient && (
          <div className="new-client-box">
            {newClientResult ? (
              <>
                <p className="subtitle" style={{ marginBottom: 10 }}>
                  Carte créée pour {newClientResult.prenom} — fais-lui ajouter sa carte depuis ce téléphone :
                </p>
                <a className="walletLinkBtn" href={newClientResult.url}>
                  Ajouter à Google Wallet
                </a>
                <button type="button" className="secondary small" style={{ marginTop: 8 }} onClick={resetNewClient}>
                  Terminé
                </button>
              </>
            ) : (
              <form onSubmit={createNewClient}>
                <input
                  type="text"
                  value={newPrenom}
                  onChange={(e) => setNewPrenom(e.target.value)}
                  placeholder="Prénom du client"
                  required
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email du client"
                  required
                />
                <button className="primary" type="submit" disabled={creatingClient}>
                  {creatingClient ? "Création…" : "Créer sa carte"}
                </button>
              </form>
            )}
          </div>
        )}

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
            Ouvrir le scanner
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
            Solde actuel : {found.points}
            {found._offline ? " (dernières infos connues, hors connexion)" : ""}
          </p>
          {found.blocked ? (
            <p className="banner error">Ce client est bloqué — impossible d'ajouter un point.</p>
          ) : (
            <>
              {loyaltyMode === "points" && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant dépensé (€)"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  style={{ textAlign: "center" }}
                  autoFocus
                />
              )}
              {!found.reviewLeft && (
                <label className="review-check">
                  <input type="checkbox" checked={reviewGiven} onChange={(e) => setReviewGiven(e.target.checked)} />
                  Le client a laissé un avis Google (bonus de points)
                </label>
              )}
              <button className="primary" disabled={confirming} onClick={confirmStamp}>
                {confirming ? "Ajout…" : loyaltyMode === "points" ? "Valider" : "+1"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

// --- Clients (si le patron a coché la permission) ---
function ClientsSection({ authHeaders, setMessage, loyaltyMode }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clients", { headers: authHeaders() });
        const data = await res.json();
        if (!cancelled && res.ok) setClients(data.clients || []);
      } catch {
        // silencieux
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addStamp(objectId) {
    setMessage(null);
    let amount;
    if (loyaltyMode === "points") {
      const input = window.prompt("Montant dépensé par le client (en €) :", "");
      if (input === null) return;
      amount = Number(String(input).replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) {
        setMessage({ type: "error", text: "Montant invalide — l'ajout de point a été annulé." });
        return;
      }
    }
    try {
      const res = await fetch("/api/add-stamp", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ objectId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage({ type: "success", text: `+${data.delta || 1} pour ${data.client.prenom} (${data.client.points}).` });
      setClients((prev) => prev.map((c) => (c.objectId === objectId ? data.client : c)));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  const filtered = clients.filter((c) => c.prenom.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="card">
      <h2>Clients</h2>
      <input
        type="text"
        placeholder="Prénom du client…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading && <p className="subtitle">Chargement…</p>}
      <div className="list">
        {!loading && filtered.length === 0 && <p className="empty">Aucun client trouvé.</p>}
        {filtered.map((c) => (
          <div className={`row${c.blocked ? " blocked" : ""}`} key={c.objectId}>
            <div className="row-info">
              <strong>{c.prenom}</strong>
              <div className="meta">{c.points} actuellement</div>
            </div>
            {!c.blocked && (
              <button className="primary small" onClick={() => addStamp(c.objectId)}>
                {loyaltyMode === "points" ? "+ points" : "+1"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Statistiques (si le patron a coché la permission) : juste les 3
// tuiles, pas les graphes — l'essentiel pour un employé, sans dupliquer
// tout le composant de graphes de /commercant.
function StatsSection({ authHeaders }) {
  const [tiles, setTiles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats", { headers: authHeaders() });
        const data = await res.json();
        if (!cancelled && res.ok) setTiles(data.tiles);
      } catch {
        // silencieux
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <h2>Statistiques</h2>
      {loading && <p className="subtitle">Chargement…</p>}
      {!loading && tiles && (
        <div className="tiles-row">
          <div className="stat">
            <div className="stat-value">{tiles.pointsThisWeek}</div>
            <div className="stat-label">Cette semaine</div>
          </div>
          <div className="stat">
            <div className="stat-value">{tiles.newClientsThisWeek}</div>
            <div className="stat-label">Nouveaux clients</div>
          </div>
          <div className="stat">
            <div className="stat-value">{tiles.rewardsThisMonth}</div>
            <div className="stat-label">Récompenses ce mois-ci</div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Campagnes (si le patron a coché la permission) ---
function CampagneSection({ authHeaders, setMessage }) {
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!header.trim() || !body.trim()) {
      setMessage({ type: "error", text: "Écris un titre et un message avant d'envoyer." });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ header, body, channels: { wallet: true, email: false } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage({ type: "success", text: `Campagne envoyée à ${data.walletSent} client(s).` });
      setHeader("");
      setBody("");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <h2>Envoyer une campagne</h2>
      <input
        type="text"
        placeholder="Titre (ex : Menu spécial ce week-end)"
        value={header}
        onChange={(e) => setHeader(e.target.value)}
        maxLength={60}
      />
      <input
        type="text"
        placeholder="Message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={300}
      />
      <button className="primary" onClick={send} disabled={sending}>
        {sending ? "Envoi en cours…" : "Envoyer à tous les clients"}
      </button>
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
  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 10px;
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
    padding: 14px 16px;
    width: 100%;
  }
  button.primary.small {
    width: auto;
    padding: 8px 14px;
    font-size: 13px;
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
  button.secondary.small {
    width: auto;
    padding: 8px 14px;
    font-size: 13px;
    margin-top: 0;
  }
  .new-client-box {
    background: #faf9fd;
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 14px;
    text-align: left;
  }
  .new-client-box input {
    margin-bottom: 10px;
  }
  .walletLinkBtn {
    display: block;
    background: ${PURPLE};
    color: #fff;
    padding: 14px 16px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 14px;
    text-align: center;
    text-decoration: none;
  }
  .link-btn {
    background: none;
    border: none;
    padding: 0;
    width: auto;
    color: ${PURPLE};
    font-size: 13px;
    font-weight: 600;
    text-decoration: underline;
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
  .banner.offline {
    background: #fff4e0;
    color: #8a5a00;
  }
  .review-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: #444;
    margin: 8px 0 14px;
    text-align: left;
  }
  .review-check input {
    width: auto;
    margin: 0;
  }
  .error {
    color: #c0392b;
    font-size: 13px;
    margin-top: 10px;
  }
  .tabs {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    margin-bottom: 16px;
  }
  .tab-btn {
    flex: none;
    background: #fff;
    color: #595959;
    border: 1.5px solid #e6e2f2;
    border-radius: 99px;
    padding: 8px 14px;
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }
  .tab-btn.active {
    background: ${PURPLE};
    border-color: ${PURPLE};
    color: #fff;
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
    gap: 10px;
  }
  .row.blocked {
    opacity: 0.55;
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
  .tiles-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .stat {
    background: #faf9fd;
    border-radius: 12px;
    padding: 14px;
    text-align: center;
  }
  .stat-value {
    font-size: 20px;
    font-weight: 800;
    color: ${PURPLE};
    font-variant-numeric: tabular-nums;
  }
  .stat-label {
    font-size: 10.5px;
    color: #8a8a8a;
    margin-top: 2px;
  }
`;
