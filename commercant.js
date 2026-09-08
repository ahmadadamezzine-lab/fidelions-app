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

// Présets pratiques pour remplir le champ "récompense" en un clic.
const REWARD_PRESETS = [
  "1 café offert",
  "1 dessert offert",
  "1 plat offert",
  "1 boisson offerte",
  "10% de réduction",
];

// Analyse du menu : la vraie analyse se fait maintenant côté serveur par
// une IA (Google Gemini, voir lib/ai.js) qui lit le texte, le PDF ou la
// photo envoyée et comprend le contenu toute seule. Les fonctions
// ci-dessous (parseMenu/analyzeMenu, règles simples sur le texte) ne
// servent plus que de filet de sécurité : si la clé IA n'est pas encore
// configurée ou si l'appel échoue, on retombe dessus pour que la
// fonctionnalité reste utilisable tout de suite (uniquement pour du texte
// collé/écrit — un PDF ou une photo nécessitent la vraie IA).
function parseMenu(text) {
  const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const match = line.match(/^(.+?)[\s.\-–:]*?(\d+(?:[.,]\d{1,2})?)\s*€/);
    if (match) {
      const name = match[1].replace(/[-–.:]+$/, "").trim();
      const price = parseFloat(match[2].replace(",", "."));
      if (name && Number.isFinite(price)) {
        items.push({ name, price });
      }
    }
  }
  return items;
}

function analyzeMenu(menuText, rewardLabel, rewardThreshold) {
  const items = parseMenu(menuText);
  if (items.length === 0) {
    return { items: [], suggestions: [] };
  }

  const sorted = [...items].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const priciest = sorted[sorted.length - 1];
  const priceAvg = items.reduce((s, i) => s + i.price, 0) / items.length;

  const suggestions = [];

  suggestions.push(
    `🍽️ Menu du midi à ${(priceAvg * 0.85).toFixed(2)}€ (prix moyen actuel : ${priceAvg.toFixed(2)}€) — attire les habitués du quartier en semaine.`
  );

  if (items.length >= 2 && cheapest.name !== priciest.name) {
    suggestions.push(
      `🤝 Formule duo "${cheapest.name}" + "${priciest.name}" à prix réduit — pousse à commander plus qu'un seul plat.`
    );
  }

  suggestions.push(
    `📅 Offre "lundi tranquille" : -20% sur "${priciest.name}" (ton plat le plus cher) pour remplir la salle en début de semaine.`
  );

  suggestions.push(
    `🎯 Débloquez "${rewardLabel || "votre récompense"}" à ${rewardThreshold || 10} tampons — mets une petite affiche à côté de "${cheapest.name}" pour donner envie de commencer la carte.`
  );

  suggestions.push(
    `📸 Mets "${priciest.name}" en avant sur tes réseaux — c'est souvent le plat qui donne le plus envie de venir.`
  );

  return {
    items,
    priceMin: cheapest.price,
    priceMax: priciest.price,
    priceAvg,
    suggestions,
  };
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

  // --- Gestion des fiches client : renommer / bloquer / supprimer ---
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // --- Menu du restaurant (texte/PDF/photo) + analyse IA + offre éditable ---
  const [menuText, setMenuText] = useState("");
  const [menuFile, setMenuFile] = useState(null); // { base64, mimeType, name } ou null
  const [savingMenu, setSavingMenu] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { items, suggestions, fallback? }
  const menuFileInputRef = useRef(null);
  const [offerText, setOfferText] = useState("");
  const [savingOffer, setSavingOffer] = useState(false);

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

  // Ferme le petit menu "⋮" d'une fiche client si on clique ailleurs.
  useEffect(() => {
    function handleClickOutside(e) {
      if (openMenuId && !e.target.closest(".row-actions")) {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

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

      // Le menu et l'offre ne sont utiles qu'au patron (owner) — pas la
      // peine d'appeler ces endpoints pour un caissier, il n'y a de toute
      // façon pas accès.
      if ((data.role || "owner") === "owner") {
        try {
          const menuRes = await fetch("/api/menu", { headers: { "x-merchant-password": pw } });
          const menuData = await menuRes.json();
          if (menuRes.ok) setMenuText(menuData.menuText || "");
        } catch {
          // silencieux — le menu se rechargera à la prochaine visite
        }
        try {
          const offerRes = await fetch("/api/offer", { headers: { "x-merchant-password": pw } });
          const offerData = await offerRes.json();
          if (offerRes.ok) setOfferText(offerData.offerText || "");
        } catch {
          // silencieux — l'offre se rechargera à la prochaine visite
        }
      }
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

  async function manageClient(objectId, action, value) {
    const res = await fetch("/api/manage-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-merchant-password": password,
      },
      body: JSON.stringify({ objectId, action, value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur");
    await refreshClients();
    return data;
  }

  function startRename(c) {
    setOpenMenuId(null);
    setConfirmDeleteId(null);
    setRenamingId(c.objectId);
    setRenameValue(c.prenom);
  }

  async function confirmRename(c) {
    const name = renameValue.trim();
    if (!name) {
      setMessage({ type: "error", text: "Le prénom ne peut pas être vide." });
      return;
    }
    setMessage(null);
    try {
      await manageClient(c.objectId, "rename", name);
      setRenamingId(null);
      setMessage({ type: "success", text: `${c.prenom} renommé en ${name}.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function toggleBlock(c) {
    setOpenMenuId(null);
    setMessage(null);
    try {
      await manageClient(c.objectId, c.blocked ? "unblock" : "block");
      setMessage({
        type: "success",
        text: c.blocked ? `${c.prenom} débloqué.` : `${c.prenom} bloqué — exclu des stats et des campagnes.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function doDelete(c) {
    setOpenMenuId(null);
    setConfirmDeleteId(null);
    setMessage(null);
    try {
      await manageClient(c.objectId, "delete");
      setMessage({ type: "success", text: `${c.prenom} supprimé définitivement.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function saveMenu() {
    if (!menuText.trim()) {
      setMessage({ type: "error", text: "Écris ou importe ton menu avant d'enregistrer." });
      return;
    }
    setSavingMenu(true);
    setMessage(null);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-password": password,
        },
        body: JSON.stringify({ menuText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMenuText(data.menuText);
      setMessage({ type: "success", text: "Menu enregistré." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingMenu(false);
    }
  }

  // Accepte .txt (lu tel quel comme texte) ou PDF/photo (envoyé à l'IA en
  // pièce jointe — c'est elle qui le lit, pas besoin d'OCR séparé ici).
  function handleMenuFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setMessage(null);
    setAiResult(null);

    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: "error", text: "Fichier trop lourd (8 Mo max) — réduis la taille de la photo ou du PDF." });
      return;
    }

    const isText = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    const isPdfOrImage = file.type === "application/pdf" || file.type.startsWith("image/");

    if (isText) {
      const reader = new FileReader();
      reader.onload = () => {
        setMenuText(String(reader.result || ""));
        setMenuFile(null);
      };
      reader.readAsText(file);
      return;
    }

    if (isPdfOrImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const base64 = dataUrl.split(",")[1] || "";
        setMenuFile({ base64, mimeType: file.type, name: file.name });
        setMenuText(""); // le contenu à analyser vient du fichier, pas du texte tapé
      };
      reader.readAsDataURL(file);
      return;
    }

    setMessage({ type: "error", text: "Format non reconnu — utilise un .txt, un PDF ou une photo (JPG/PNG)." });
  }

  function clearMenuFile() {
    setMenuFile(null);
  }

  // Vraie analyse IA côté serveur (Gemini). Si la clé n'est pas encore
  // configurée (ou que l'appel échoue) ET qu'on a du texte, on retombe sur
  // l'analyse par règles pour que le commerçant ait quand même un résultat
  // tout de suite, avec un message clair sur la raison.
  async function analyzeWithAI() {
    if (!menuText.trim() && !menuFile) {
      setMessage({ type: "error", text: "Écris ton menu, ou importe un fichier, avant d'analyser." });
      return;
    }
    setAnalyzing(true);
    setMessage(null);
    setAiResult(null);
    try {
      const res = await fetch("/api/analyze-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({
          text: menuText,
          fileBase64: menuFile?.base64 || null,
          mimeType: menuFile?.mimeType || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setAiResult({ items: data.items || [], suggestions: data.suggestions || [] });
      setMessage({ type: "success", text: "Analyse IA terminée." });
    } catch (err) {
      if (menuText.trim()) {
        const fallback = analyzeMenu(menuText, rewardLabel, rewardThreshold);
        if (fallback.items.length > 0) {
          setAiResult({ items: fallback.items, suggestions: fallback.suggestions, fallback: true });
          setMessage({
            type: "error",
            text: `${err.message} — analyse basique utilisée en attendant (moins précise qu'une vraie IA).`,
          });
          setAnalyzing(false);
          return;
        }
      }
      setMessage({ type: "error", text: err.message });
    } finally {
      setAnalyzing(false);
    }
  }

  // Ajoute les suggestions IA au texte de l'offre — le commerçant garde la
  // main pour tout réécrire ensuite, rien n'est figé.
  function useAiSuggestions() {
    if (!aiResult || !aiResult.suggestions || aiResult.suggestions.length === 0) return;
    const block = aiResult.suggestions.map((s) => `• ${s}`).join("\n");
    setOfferText((prev) => (prev.trim() ? `${prev.trim()}\n\n${block}` : block));
    setMessage({ type: "success", text: "Suggestions ajoutées à ton offre — modifie-les comme tu veux puis enregistre." });
  }

  // L'offre est un texte 100% libre : le commerçant peut tout écrire ou
  // réécrire directement ici, avec ou sans passer par l'IA.
  async function saveOffer() {
    setSavingOffer(true);
    setMessage(null);
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({ offerText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setOfferText(data.offerText);
      setMessage({ type: "success", text: "Offre enregistrée." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingOffer(false);
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

  // Liste de gestion : tous les clients, y compris bloqués (grisés) pour
  // pouvoir les débloquer ou les supprimer.
  const filtered = clients
    .filter((c) => c.prenom.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" }));

  // Stats, classement, analyse et campagnes : uniquement les clients actifs
  // (non bloqués) — un client bloqué n'entre plus dans aucun calcul.
  const activeClients = clients.filter((c) => !c.blocked);

  const totalTampons = activeClients.reduce((sum, c) => sum + (c.points || 0), 0);
  const safeThreshold = Number(rewardThreshold) > 0 ? Number(rewardThreshold) : 10;
  const totalRecompenses = activeClients.reduce(
    (sum, c) => sum + Math.floor((c.points || 0) / safeThreshold),
    0
  );
  const todayStr = new Date().toDateString();
  const visitesAujourdhui = activeClients.filter(
    (c) => c.lastVisitAt && new Date(c.lastVisitAt).toDateString() === todayStr
  ).length;
  const ranking = [...activeClients]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);
  const emailEligibleCount = activeClients.filter((c) => c.email).length;
  const insights = computeInsights(activeClients, safeThreshold);

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
                <div className="stat-value">{activeClients.length}</div>
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
            <div className="presets">
              {REWARD_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="preset-chip"
                  onClick={() => setRewardLabel(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="reward-preview">
              🎁 Après <strong>{rewardThreshold || "?"}</strong> tampon
              {Number(rewardThreshold) > 1 ? "s" : ""} : <strong>{rewardLabel || "…"}</strong>
            </div>
            <button className="primary" onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}

        {role === "owner" && (
          <div className="card">
            <h2>Analyse du menu & suggestions (IA)</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Écris ton menu, ou importe-le directement — texte (.txt), PDF, ou
              simple photo prise au téléphone. Une IA (gratuite) le lit et le
              comprend toute seule, puis propose des idées de promotions basées
              sur tes propres plats — comme le tableau de bord "boosté à l'IA"
              de Fidelix.
            </p>
            <textarea
              className="menu-textarea"
              placeholder={"Salade César - 9€\nBurger maison - 14€\nTiramisu - 6€\n\n(ou importe directement un PDF/photo ci-dessous)"}
              value={menuText}
              onChange={(e) => {
                setMenuText(e.target.value);
                if (menuFile) setMenuFile(null);
              }}
              rows={6}
            />
            <input
              type="file"
              accept=".txt,application/pdf,image/*"
              ref={menuFileInputRef}
              style={{ display: "none" }}
              onChange={handleMenuFile}
            />
            {menuFile && (
              <p className="subtitle" style={{ marginTop: 8, marginBottom: 0 }}>
                📎 {menuFile.name} prêt à analyser —{" "}
                <button type="button" className="link-btn" onClick={clearMenuFile}>
                  retirer
                </button>
              </p>
            )}
            <div className="menu-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => menuFileInputRef.current?.click()}
              >
                📄 Importer (txt / PDF / photo)
              </button>
              <button className="secondary" type="button" onClick={saveMenu} disabled={savingMenu}>
                {savingMenu ? "Enregistrement…" : "💾 Enregistrer le menu"}
              </button>
              <button className="primary" type="button" onClick={analyzeWithAI} disabled={analyzing}>
                {analyzing ? "Analyse en cours…" : "🤖 Analyser avec l'IA"}
              </button>
            </div>
            {aiResult && aiResult.items && aiResult.items.length > 0 && (
              <p className="subtitle" style={{ marginTop: 16, marginBottom: 8 }}>
                {aiResult.items.length} plat{aiResult.items.length > 1 ? "s" : ""} détecté
                {aiResult.items.length > 1 ? "s" : ""}
                {aiResult.fallback ? " (analyse basique, pas encore la vraie IA)" : ""}
              </p>
            )}
            {aiResult && aiResult.suggestions && aiResult.suggestions.length > 0 && (
              <>
                <div className="insights">
                  {aiResult.suggestions.map((s, i) => (
                    <div className="insight-row" key={i}>
                      {s}
                    </div>
                  ))}
                </div>
                <div className="menu-actions" style={{ marginTop: 10 }}>
                  <button className="secondary" type="button" onClick={useAiSuggestions}>
                    ⬇️ Utiliser ces suggestions dans mon offre
                  </button>
                </div>
              </>
            )}

            <h2 style={{ marginTop: 28 }}>Ton offre actuelle</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Ce texte est à toi : écris ou modifie librement ton offre du
              moment (tu peux partir des suggestions IA ci-dessus, ou tout
              écrire toi-même). C'est ce que tu affiches en caisse, sur tes
              réseaux, etc.
            </p>
            <textarea
              className="menu-textarea"
              placeholder="Ex : Formule du midi à 12€ jusqu'à vendredi, café offert pour toute commande avant 12h30…"
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              rows={5}
            />
            <div className="menu-actions">
              <button className="primary" type="button" onClick={saveOffer} disabled={savingOffer}>
                {savingOffer ? "Enregistrement…" : "💾 Enregistrer mon offre"}
              </button>
            </div>
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
              Un message envoyé d'un coup à tous tes {activeClients.length} client
              {activeClients.length > 1 ? "s" : ""} (promo, nouveau plat, événement…),
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
                Notification Wallet ({activeClients.length})
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
              disabled={campaignSending || activeClients.length === 0}
            >
              {campaignSending ? "Envoi en cours…" : "Envoyer à tous les clients"}
            </button>
          </div>
        )}

        <div className="card">
          <h2>Ou recherchez un client</h2>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            Tape le prénom du client (ou scanne son QR ci-dessus), puis clique
            "+1 tampon" sur sa ligne. Le menu "⋮" permet de renommer, bloquer
            ou supprimer une fiche.
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
              <div className={`row${c.blocked ? " blocked" : ""}`} key={c.objectId}>
                <div className="row-info">
                  {renamingId === c.objectId ? (
                    <div className="rename-row">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        maxLength={40}
                        autoFocus
                      />
                      <button className="primary small" type="button" onClick={() => confirmRename(c)}>
                        ✔
                      </button>
                      <button
                        className="secondary small"
                        type="button"
                        onClick={() => setRenamingId(null)}
                      >
                        ✖
                      </button>
                    </div>
                  ) : (
                    <strong>
                      {c.prenom}
                      {c.blocked ? " (bloqué)" : ""}
                    </strong>
                  )}
                  <div className="meta">
                    {c.points} tampon{c.points > 1 ? "s" : ""} · inscrit le{" "}
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                  {c.email && <div className="email-line">{c.email}</div>}
                </div>
                <div className="row-actions">
                  {!c.blocked ? (
                    <button className="primary small" onClick={() => addStamp(c.objectId)}>
                      +1 tampon
                    </button>
                  ) : (
                    <span className="blocked-label">Bloqué</span>
                  )}
                  <div className="menu-wrap">
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === c.objectId ? null : c.objectId)
                      }
                    >
                      ⋮
                    </button>
                    {openMenuId === c.objectId && (
                      <div className="row-menu">
                        <button type="button" onClick={() => startRename(c)}>
                          ✏️ Renommer
                        </button>
                        <button type="button" onClick={() => toggleBlock(c)}>
                          {c.blocked ? "🔓 Débloquer" : "🔒 Bloquer"}
                        </button>
                        {confirmDeleteId === c.objectId ? (
                          <button type="button" className="danger" onClick={() => doDelete(c)}>
                            ⚠️ Confirmer la suppression
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => setConfirmDeleteId(c.objectId)}
                          >
                            🗑️ Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: -6px 0 14px;
  }
  .preset-chip {
    background: #f3f0fa;
    color: ${PURPLE};
    border: none;
    border-radius: 99px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    width: auto;
  }
  .reward-preview {
    background: #faf9fd;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 13px;
    color: #333;
    margin-bottom: 12px;
  }
  .menu-textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid #e0e0e0;
    font-size: 14px;
    font-family: inherit;
    margin-bottom: 12px;
    box-sizing: border-box;
    resize: vertical;
  }
  .menu-textarea:focus {
    outline: none;
    border-color: ${PURPLE};
  }
  .link-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    width: auto;
    color: ${PURPLE};
    font-size: inherit;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }
  .menu-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }
  .menu-actions button.primary,
  .menu-actions button.secondary {
    width: auto;
    flex: 1;
    min-width: 110px;
    padding: 10px 10px;
    font-size: 12.5px;
    margin-top: 0;
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
    gap: 10px;
  }
  .row.blocked {
    opacity: 0.55;
    filter: grayscale(1);
  }
  .row-info {
    min-width: 0;
    flex: 1;
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
  .row-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .blocked-label {
    font-size: 12px;
    color: #8a8a8a;
    font-weight: 700;
    white-space: nowrap;
  }
  .menu-wrap {
    position: relative;
    flex: none;
  }
  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #eee;
    color: #333;
    border: none;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .row-menu {
    position: absolute;
    top: 38px;
    right: 0;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 5;
    min-width: 165px;
  }
  .row-menu button {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #1a1a1a;
    cursor: pointer;
    border-radius: 0;
  }
  .row-menu button:hover {
    background: #f5f4fb;
  }
  .row-menu button.danger {
    color: #c0392b;
  }
  .rename-row {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
  }
  .rename-row input {
    margin-bottom: 0;
    padding: 6px 8px;
    font-size: 13px;
    flex: 1;
  }
  .rename-row button {
    width: auto;
    padding: 6px 10px;
    font-size: 12px;
    flex: none;
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
