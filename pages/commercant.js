import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

const PURPLE = "#7414F4";
const PW_STORAGE_KEY = "fidelions_merchant_pw";

// Petites icônes SVG "trait" (façon Lucide/Feather), dessinées à la main
// et regroupées ici pour être réutilisées partout dans la page — aucune
// librairie d'icônes n'est installée (et impossible d'en ajouter une sur
// cet environnement), donc tout est du SVG inline minimal.
const ICONS = {
  home: <><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9h5v-5h2v5h5v-9" /></>,
  share: <><circle cx="6" cy="12" r="2.2" /><circle cx="18" cy="6" r="2.2" /><circle cx="18" cy="18" r="2.2" /><path d="M8 10.8 16 7.2M8 13.2l8 3.6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.3" /><path d="M15.3 14a5 5 0 0 1 5.5 5" /></>,
  bell: <><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="2.2" /><path d="M3 10.5h18" /><path d="M6.5 14.5h4" /></>,
  gift: <><rect x="5.5" y="13" width="13" height="7" rx="1" /><rect x="4" y="9.3" width="16" height="3.7" rx="1" /><path d="M12 9.3V20" /><path d="M12 9.3C10 9.3 8.5 8 8.5 6.4 8.5 5.1 9.5 4 10.7 4c1.3 0 1.3 2.3 1.3 5.3Z" /><path d="M12 9.3c2 0 3.5-1.3 3.5-2.9C15.5 5.1 14.5 4 13.3 4c-1.3 0-1.3 2.3-1.3 5.3Z" /></>,
  badge: <><path d="M12 3.2 18.5 6v5.3c0 4.4-2.9 6.9-6.5 8.5-3.6-1.6-6.5-4.1-6.5-8.5V6Z" /><path d="m9.2 12 1.9 1.9L14.9 10" /></>,
  mappin: <><path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.4" /></>,
  barchart: <><rect x="4" y="12" width="3.4" height="8" /><rect x="10.3" y="7" width="3.4" height="13" /><rect x="16.6" y="3" width="3.4" height="17" /></>,
  building: <><rect x="5" y="3" width="10" height="18" /><path d="M9 21v-4h2v4" /><path d="M8 7h1M8 10h1M8 13h1M11 7h1M11 10h1M11 13h1" /><path d="M15 10h4v11h-4" /></>,
  star: <path d="M12 3.2 14.6 9l6.2.6-4.7 4.2 1.4 6.2L12 16.9l-5.5 2.9 1.4-6.2-4.7-4.2L9.4 9Z" />,
  headset: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.4" /><rect x="17" y="13" width="4" height="6" rx="1.4" /><path d="M19 19v1a3 3 0 0 1-3 3h-3" /></>,
  gear: <><circle cx="12" cy="12" r="3.1" /><path d="M12 3v2.3M12 18.7V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.3M18.7 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" /></>,
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  panel: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" /></>,
  chevronUpDown: <><path d="M8 10l4-4 4 4" /><path d="M8 14l4 4 4-4" /></>,
  check: <path d="M5 12.5 10 17 19 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  warning: <><path d="M12 3.4 21 20H3Z" /><path d="M12 9.4v4.6" /><path d="M12 17h.01" /></>,
  trash: <><path d="M4 7h16" /><path d="M9 7V4.5h6V7" /><path d="M6.5 7 7.3 20h9.4L18 7" /><path d="M10 11v6M14 11v6" /></>,
  edit: <path d="M4 20h4l10.5-10.5a2 2 0 0 0-4-4L4 16v4Z" />,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="1.8" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  unlock: <><rect x="5" y="10.5" width="14" height="9.5" rx="1.8" /><path d="M8 10.5V8a4 4 0 0 1 7.4-2" /></>,
  download: <><path d="M12 4v11" /><path d="m7.5 11 4.5 4.5L16.5 11" /><path d="M5 19.5h14" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="1.8" /><path d="M6 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8A1.8 1.8 0 0 1 4.8 3h8.4A1.8 1.8 0 0 1 15 4.8V6" /></>,
  refresh: <><path d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2" /><path d="M18 3v4.5h-4.5" /><path d="M6 21v-4.5h4.5" /></>,
  save: <><path d="M5 4h11l3 3v13H5Z" /><path d="M8 4v5h8V4" /><path d="M8 14h8v6H8Z" /></>,
  robot: <><rect x="5" y="8" width="14" height="10" rx="2.3" /><path d="M12 8V5" /><circle cx="12" cy="4" r="1.1" /><circle cx="9" cy="13" r="1.1" /><circle cx="15" cy="13" r="1.1" /><path d="M9 17h6" /></>,
  paperclip: <path d="M17 7.5 9.3 15.2a3 3 0 1 1-4.2-4.2l8-8a2 2 0 1 1 2.9 2.9l-7.7 7.7a1 1 0 1 1-1.4-1.4l6.9-6.9" />,
  file: <><path d="M7 3h7l4 4v14H7Z" /><path d="M14 3v4h4" /></>,
  trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0Z" /><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" /><path d="M12 12v3" /><path d="M9 20h6" /><path d="M10 17h4l.6 3H9.4Z" /></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2.2" /><path d="M8 7l1.5-2.5h5L16 7" /><circle cx="12" cy="13.5" r="3.4" /></>,
  sliders: <><path d="M4 6h10" /><circle cx="16.5" cy="6" r="2" /><path d="M4 12h4" /><circle cx="10.5" cy="12" r="2" /><path d="M14.5 12H20" /><path d="M4 18h9" /><circle cx="15.5" cy="18" r="2" /></>,
  briefcase: <><rect x="3" y="8" width="18" height="11" rx="2" /><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>,
};

function Icon({ name, size = 18, className }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

// Onglets de l'espace commerçant (patron uniquement — un caissier garde
// l'ancien écran simple : scanner + recherche, rien d'autre). Rubriques et
// ordre calqués sur la barre latérale de Sydely (captures envoyées par
// Adam) : liste principale, puis un groupe "Compte" séparé. "Aperçu" n'est
// pas dans ces captures mais reste en premier — c'est le tableau de bord
// (chiffres clés + classement clients), trop utile pour le supprimer, et
// cohérent avec le fait qu'une appli pro a presque toujours un accueil
// avant les rubriques métier. Sur mobile, reste en rangée de pastilles
// défilable (pas de place pour une vraie barre latérale) ; à partir de
// 900px de large, devient la barre latérale fixée à gauche que Adam a
// demandée.
const TABS = [
  { id: "apercu", icon: "home", label: "Aperçu" },
  { id: "partager", icon: "share", label: "Partager" },
  { id: "clients", icon: "users", label: "Clients" },
  { id: "campagnes", icon: "bell", label: "Notifications" },
  { id: "carte", icon: "card", label: "Ma carte" },
  { id: "fidelite", icon: "gift", label: "Récompenses" },
  { id: "equipe", icon: "briefcase", label: "Employés" },
  { id: "proximite", icon: "mappin", label: "Géolocalisation" },
  { id: "stats", icon: "barchart", label: "Statistiques" },
];

// Groupe "Compte" séparé, comme sur les captures. "Support" réutilise la
// vraie rubrique Aide (FAQ) déjà construite — pas de doublon. Abonnement et
// Paramètres n'ont pas encore de vrai contenu derrière (pas de
// facturation, pas de compte à personnaliser au-delà du mot de passe) :
// plutôt que de faire semblant, ces 2 rubriques affichent honnêtement
// "bientôt disponible" jusqu'à ce que ça existe pour de vrai. Établissement
// a, lui, un vrai contenu (voir plus bas).
const ACCOUNT_TABS = [
  { id: "etablissement", icon: "building", label: "Établissement" },
  { id: "abonnement", icon: "star", label: "Abonnement" },
  { id: "aide", icon: "headset", label: "Support" },
  { id: "parametres", icon: "sliders", label: "Paramètres" },
];

// Types d'activité proposés à l'inscription (étape 2 de l'assistant) et
// réutilisés dans l'onglet Établissement — mêmes identifiants des deux
// côtés. "autre" révèle un champ texte libre (businessTypeOther).
const BUSINESS_TYPES = [
  { id: "coiffeur", label: "Coiffeur" },
  { id: "beaute", label: "Soins & beauté" },
  { id: "supermarche", label: "Supermarché / épicerie" },
  { id: "restaurant", label: "Restaurant" },
  { id: "snack", label: "Snack / fast-food" },
  { id: "boulangerie", label: "Boulangerie / pâtisserie" },
  { id: "cafe", label: "Café / bar" },
  { id: "autre", label: "Autre" },
];

// Jours de la semaine pour les horaires d'ouverture (onglet Établissement)
// — mêmes identifiants que côté serveur (lib/db.js).
const ESTABLISHMENT_DAYS = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
  { id: "samedi", label: "Samedi" },
  { id: "dimanche", label: "Dimanche" },
];

// Sélecteur de période pour la courbe "évolution des clients fidélisés"
// (onglet Statistiques) — mêmes valeurs que EVOLUTION_RANGES côté API.
const EVOLUTION_RANGES = [
  { id: "jour", label: "Jour" },
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "annee", label: "Année" },
  { id: "debut", label: "Depuis le début" },
];

const DAY_OPTIONS = [
  { id: "lun", label: "Lun" },
  { id: "mar", label: "Mar" },
  { id: "mer", label: "Mer" },
  { id: "jeu", label: "Jeu" },
  { id: "ven", label: "Ven" },
  { id: "sam", label: "Sam" },
  { id: "dim", label: "Dim" },
];
const ALL_DAY_IDS = DAY_OPTIONS.map((d) => d.id);

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
    insights.push(`${newThisWeek} nouve${newThisWeek > 1 ? "aux clients" : "au client"} cette semaine.`);
  } else if (newLastWeek > 0) {
    const diff = newThisWeek - newLastWeek;
    const pct = Math.round((Math.abs(diff) / newLastWeek) * 100);
    insights.push(
      diff >= 0
        ? `Inscriptions en hausse de ${pct}% cette semaine (${newThisWeek} vs ${newLastWeek} la semaine passée).`
        : `Inscriptions en baisse de ${pct}% cette semaine (${newThisWeek} vs ${newLastWeek} la semaine passée).`
    );
  }

  const top = [...clients].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  if (top && top.points > 0) {
    insights.push(`${top.prenom} est ton client le plus fidèle avec ${top.points} points.`);
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
      `${nearReward} client${nearReward > 1 ? "s sont" : " est"} à 1-2 points de la récompense — bon moment pour une campagne.`
    );
  }

  const inactive = clients.filter((c) => now - (c.lastVisitAt || c.createdAt) > 30 * DAY).length;
  if (inactive > 0) {
    insights.push(
      `${inactive} client${inactive > 1 ? "s n'ont" : " n'a"} pas visité depuis plus de 30 jours — pense à une campagne de relance.`
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
    `Menu du midi à ${(priceAvg * 0.85).toFixed(2)}€ (prix moyen actuel : ${priceAvg.toFixed(2)}€) — attire les habitués du quartier en semaine.`
  );

  if (items.length >= 2 && cheapest.name !== priciest.name) {
    suggestions.push(
      `Formule duo "${cheapest.name}" + "${priciest.name}" à prix réduit — pousse à commander plus qu'un seul plat.`
    );
  }

  suggestions.push(
    `Offre "lundi tranquille" : -20% sur "${priciest.name}" (ton plat le plus cher) pour remplir la salle en début de semaine.`
  );

  suggestions.push(
    `Débloquez "${rewardLabel || "votre récompense"}" à ${rewardThreshold || 10} points — mets une petite affiche à côté de "${cheapest.name}" pour donner envie de commencer la carte.`
  );

  suggestions.push(
    `Mets "${priciest.name}" en avant sur tes réseaux — c'est souvent le plat qui donne le plus envie de venir.`
  );

  return {
    items,
    priceMin: cheapest.price,
    priceMax: priciest.price,
    priceAvg,
    suggestions,
  };
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.split(",")[1] || "";
      resolve({ base64, mimeType: file.type, filename: file.name });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Recadreur de logo partagé (carré, glisser pour déplacer, molette/curseur
// pour zoomer) — aucune librairie de crop n'étant installable, tout est
// fait à la main : un <img> "cover"-fitté dans un cadre fixe de
// VIEWPORT×VIEWPORT px, un décalage (offset) borné pour ne jamais laisser
// de zone vide visible, et un rendu final sur un <canvas> hors écran au
// moment de valider. Utilisé par les 3 sélecteurs de logo de la page (voir
// cropperTarget dans le composant principal) — un seul modal, jamais
// dupliqué trois fois.
const CROP_VIEWPORT = 280;
const CROP_OUTPUT = 512;

function clampCropOffset(offset, maxX, maxY) {
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

function LogoCropper({ file, onCancel, onConfirm }) {
  const [imgUrl, setImgUrl] = useState("");
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const probe = new Image();
    probe.onload = () => setNatural({ w: probe.naturalWidth, h: probe.naturalHeight });
    probe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = natural.w && natural.h ? Math.max(CROP_VIEWPORT / natural.w, CROP_VIEWPORT / natural.h) : 1;
  const scale = baseScale * zoom;
  const scaledW = natural.w * scale;
  const scaledH = natural.h * scale;
  const maxOffsetX = Math.max(0, (scaledW - CROP_VIEWPORT) / 2);
  const maxOffsetY = Math.max(0, (scaledH - CROP_VIEWPORT) / 2);

  // Re-borne le décalage à chaque changement de zoom (ou une fois l'image
  // chargée) — sans ça, dézoomer après avoir déplacé l'image en bord ferait
  // apparaître une bande vide.
  useEffect(() => {
    setOffset((prev) => clampCropOffset(prev, maxOffsetX, maxOffsetY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural.w, natural.h]);

  function onPointerDown(e) {
    if (!natural.w) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore — certains navigateurs mobiles anciens n'ont pas cette API
    }
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
  }
  function onPointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(
      clampCropOffset({ x: dragRef.current.offX + dx, y: dragRef.current.offY + dy }, maxOffsetX, maxOffsetY)
    );
  }
  function onPointerUp(e) {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;
  }

  function handleConfirm() {
    if (!natural.w || !natural.h || !imgRef.current) return;
    // Portion (en pixels réels de l'image source) qui correspond au cadre
    // carré actuellement visible, compte tenu du zoom et du glissement —
    // voir le commentaire au-dessus du composant.
    const srcW = CROP_VIEWPORT / scale;
    const srcH = CROP_VIEWPORT / scale;
    const srcX = (-CROP_VIEWPORT / 2 - offset.x) / scale + natural.w / 2;
    const srcY = (-CROP_VIEWPORT / 2 - offset.y) / scale + natural.h / 2;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_OUTPUT;
    canvas.height = CROP_OUTPUT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, CROP_OUTPUT, CROP_OUTPUT);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1] || "";
    onConfirm(base64, "image/jpeg");
  }

  return (
    <div className="crop-backdrop" onClick={onCancel}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal-head">
          <h3>Recadrer le logo</h3>
          <button type="button" className="crop-close" onClick={onCancel} aria-label="Fermer">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div
          className="crop-viewport"
          style={{ width: CROP_VIEWPORT, height: CROP_VIEWPORT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              draggable={false}
              className="crop-img"
              style={{
                width: scaledW || undefined,
                height: scaledH || undefined,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
        </div>
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="crop-zoom"
          disabled={!natural.w}
        />
        <div className="crop-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="primary" onClick={handleConfirm} disabled={!natural.w}>
            Valider le recadrage
          </button>
        </div>
      </div>
    </div>
  );
}

// Petit graphe en barres, une seule teinte (violet Fidélions) — inutile
// d'avoir une légende ou un dégradé de couleurs pour une seule série.
// Survol = tooltip avec la valeur exacte, comme sur les vrais tableaux de
// bord (voir compétence dataviz : marques fines, coins arrondis, axe discret).
function BarChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data || data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;
  const step = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
        {data.map((d, i) => {
          const barH = max > 0 ? (d.value / max) * 84 : 0;
          const x = i * barWidth;
          const y = 100 - barH;
          return (
            <rect
              key={i}
              x={x + barWidth * 0.18}
              y={y}
              width={barWidth * 0.64}
              height={Math.max(barH, 1)}
              rx="1.4"
              fill={PURPLE}
              opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.35}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
      </svg>
      <div className="chart-labels">
        {data.map((d, i) => (
          <span key={i} className={hoverIdx === i ? "active" : ""}>
            {i % step === 0 || hoverIdx === i ? d.label : ""}
          </span>
        ))}
      </div>
      <div className="chart-tooltip" style={{ visibility: hoverIdx === null ? "hidden" : "visible" }}>
        {hoverIdx !== null ? (
          <>
            {data[hoverIdx].label} : <strong>{data[hoverIdx].value}</strong>
          </>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}

// Courbe cumulative (nombre total de clients fidélisés au fil du temps) —
// même logique de survol que BarChart (cible plus large que le point visible,
// tooltip sous le graphe), mais en ligne + aire remplie à faible opacité :
// c'est une grandeur qui grandit dans le temps, pas des totaux indépendants.
function LineChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data || data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? 100 / (data.length - 1) : 0;
  const step = Math.max(1, Math.ceil(data.length / 8));

  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : 50,
    y: 100 - (d.value / max) * 84,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

  return (
    <div className="chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
        <path d={areaPath} fill={PURPLE} opacity={0.12} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={PURPLE}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 2.6 : 1.6}
            fill="#fff"
            stroke={PURPLE}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={p.x - (data.length > 1 ? stepX / 2 : 50)}
            y={0}
            width={data.length > 1 ? stepX : 100}
            height={100}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>
      <div className="chart-labels">
        {data.map((d, i) => (
          <span key={i} className={hoverIdx === i ? "active" : ""}>
            {i % step === 0 || hoverIdx === i ? d.label : ""}
          </span>
        ))}
      </div>
      <div className="chart-tooltip" style={{ visibility: hoverIdx === null ? "hidden" : "visible" }}>
        {hoverIdx !== null ? (
          <>
            {data[hoverIdx].label} : <strong>{data[hoverIdx].value} client{data[hoverIdx].value > 1 ? "s" : ""} fidélisé{data[hoverIdx].value > 1 ? "s" : ""}</strong>
          </>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}

function Delta({ pct }) {
  if (!Number.isFinite(pct) || pct === 0) return <span className="delta neutral">± 0%</span>;
  const up = pct > 0;
  return (
    <span className={`delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

export default function Commercant() {
  // `password` garde son nom historique mais contient depuis le passage
  // aux comptes un JETON DE SESSION (renvoyé par /api/auth-login ou
  // /api/auth-signup), plus un mot de passe en clair — c'est ce qui
  // permet à toutes les requêtes déjà écrites plus bas (headers:
  // {"x-merchant-password": password}) de continuer à fonctionner sans
  // rien changer d'autre.
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);

  // --- Écran de connexion / inscription (avant authentification) ---
  // "choice" est l'écran de départ : on demande d'abord de choisir entre
  // créer un compte et se connecter, plutôt que de présenter directement
  // un formulaire de connexion par défaut.
  const [authMode, setAuthMode] = useState("choice"); // "choice" | "login" | "signup"
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // --- Inscription : assistant en 3 étapes (voir handleSignupSubmit) ---
  const [signupStep, setSignupStep] = useState(1);
  const [signupRestaurantName, setSignupRestaurantName] = useState("");
  const [signupLogo, setSignupLogo] = useState(null); // { base64, mimeType, filename } ou null (optionnel)
  const [signupBusinessType, setSignupBusinessType] = useState("");
  const [signupBusinessTypeOther, setSignupBusinessTypeOther] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const signupLogoInputRef = useRef(null);

  // --- Identité du restaurant connecté (renvoyée par /api/clients juste
  // après la connexion) — utilisée pour construire le lien public
  // /r/[slug] affiché dans l'onglet Partager.
  const [restaurantName, setRestaurantName] = useState("");
  const [merchantSlug, setMerchantSlug] = useState("");

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [role, setRole] = useState(null); // "owner" | "employee"
  const [rewardThreshold, setRewardThreshold] = useState(10);
  const [rewardLabel, setRewardLabel] = useState("Récompense fidélité");
  const [activeTab, setActiveTab] = useState("apercu");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // --- Gestion des fiches client : renommer / bloquer / supprimer ---
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // --- Menu du restaurant (texte/PDF/photo) + analyse IA + offre éditable ---
  // (Rangé dans l'onglet Statistiques, comme demandé : les conseils de l'IA
  // sont une donnée d'analyse au même titre que les graphes.)
  const [menuText, setMenuText] = useState("");
  const [menuFile, setMenuFile] = useState(null); // { base64, mimeType, name } ou null
  const [menuDragOver, setMenuDragOver] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { items, suggestions, fallback? }
  const menuFileInputRef = useRef(null);
  const [offerText, setOfferText] = useState("");
  const [savingOffer, setSavingOffer] = useState(false);

  // --- Fidélité : paliers de récompense (système unique "points", voir
  // lib/loyalty.js) — un seul palier = carte classique, plusieurs = étapes.
  const [tiers, setTiers] = useState([{ threshold: 10, label: "Récompense fidélité" }]);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  // --- Statistiques (tuiles + graphes), chargées seulement à l'ouverture
  // de l'onglet pour ne pas ralentir la connexion.
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [evolutionRange, setEvolutionRange] = useState("mois");
  const [loadingEvolution, setLoadingEvolution] = useState(false);

  // --- Personnalisation de la carte : couleur + logo + bannière ---
  const [brandHexColor, setBrandHexColor] = useState(PURPLE);
  const [brandingInfo, setBrandingInfo] = useState(null); // dernier état enregistré (logoUrl/bannerUrl)
  const [logoFile, setLogoFile] = useState(null); // { base64, mimeType, filename } en attente d'envoi
  const [bannerFile, setBannerFile] = useState(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // --- Notifications de proximité ---
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoAddress, setGeoAddress] = useState("");
  const [geoMessage, setGeoMessage] = useState("");
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [savingGeo, setSavingGeo] = useState(false);
  const geoDebounceRef = useRef(null);

  // --- Fiche établissement (onglet "Établissement") : chargée seulement à
  // l'ouverture de l'onglet, comme les statistiques.
  const [establishment, setEstablishment] = useState(null);
  const [loadingEstablishment, setLoadingEstablishment] = useState(false);
  const [savingEstablishment, setSavingEstablishment] = useState(false);
  const [estBusinessType, setEstBusinessType] = useState("");
  const [estBusinessTypeOther, setEstBusinessTypeOther] = useState("");
  const [estPhone, setEstPhone] = useState("");
  const [estWebsite, setEstWebsite] = useState("");
  const [estInstagram, setEstInstagram] = useState("");
  const [estFacebook, setEstFacebook] = useState("");
  const [estDescription, setEstDescription] = useState("");
  const [estHours, setEstHours] = useState(null);
  const [estPhotos, setEstPhotos] = useState([]); // URLs déjà enregistrées
  const [estNewPhotos, setEstNewPhotos] = useState([]); // { base64, mimeType, filename } en attente d'envoi
  const estPhotoInputRef = useRef(null);
  const estLogoInputRef = useRef(null);
  const [savingEstLogo, setSavingEstLogo] = useState(false);

  // --- Recadrage de logo (modal partagé par les 3 sélecteurs de logo :
  // inscription, "Ma carte", Établissement) — cropperTarget dit quel
  // sélecteur a ouvert le modal, pour router le résultat vers le bon état.
  const [cropperFile, setCropperFile] = useState(null); // File brut en attente de recadrage, ou null
  const [cropperTarget, setCropperTarget] = useState(null); // "signup" | "branding" | "establishment" | null

  // --- Changement de mot de passe (onglet Paramètres) : mot de passe actuel
  // → code à 4 chiffres envoyé par email → nouveau mot de passe.
  const [pwStep, setPwStep] = useState("idle"); // "idle" | "current" | "code"
  const [pwCurrentInput, setPwCurrentInput] = useState("");
  const [pwCode, setPwCode] = useState("");
  const [pwNewPassword, setPwNewPassword] = useState("");
  const [pwRequesting, setPwRequesting] = useState(false);
  const [pwConfirming, setPwConfirming] = useState(false);
  const [pwMaskedEmail, setPwMaskedEmail] = useState("");

  // --- Partager : QR + lien d'inscription publics (onglet "Partager") ---
  // Chaque restaurant a son propre lien /r/[slug] (multi-comptes) — on
  // attend d'avoir récupéré le slug (voir tryAuth) avant de générer le QR.
  const [signupQrUrl, setSignupQrUrl] = useState("");
  useEffect(() => {
    if (typeof window === "undefined" || !merchantSlug) return;
    QRCode.toDataURL(`${window.location.origin}/r/${merchantSlug}`, {
      width: 500,
      margin: 2,
      color: { dark: "#1a1a1a" },
    })
      .then(setSignupQrUrl)
      .catch(() => setSignupQrUrl(""));
  }, [merchantSlug]);
  function copySignupLink() {
    if (typeof window === "undefined" || !merchantSlug) return;
    navigator.clipboard
      .writeText(`${window.location.origin}/r/${merchantSlug}`)
      .then(() => setMessage({ type: "success", text: "Lien copié !" }))
      .catch(() => setMessage({ type: "error", text: "Impossible de copier — copie-le à la main." }));
  }

  // --- Lien employé (scan seul, sans mot de passe à retenir) ---
  const [employeeToken, setEmployeeToken] = useState(null);
  const [regeneratingToken, setRegeneratingToken] = useState(false);

  // --- Équipe : chaque employé a un prénom + un code à 4 chiffres, des
  // jours/horaires d'accès, et des permissions par rubrique.
  const [employees, setEmployees] = useState([]);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [empName, setEmpName] = useState("");
  const [empPin, setEmpPin] = useState("");
  const [empDays, setEmpDays] = useState(ALL_DAY_IDS);
  const [empStart, setEmpStart] = useState("");
  const [empEnd, setEmpEnd] = useState("");
  const [empPerms, setEmpPerms] = useState({ clients: false, stats: false, campagnes: false });
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [revealedPinId, setRevealedPinId] = useState(null);

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
        // Ce cas ne se produit plus qu'au rechargement automatique avec un
        // jeton déjà enregistré sur l'appareil (voir plus bas) — la
        // connexion elle-même passe maintenant par /api/auth-login, qui
        // renvoie sa propre erreur avant même d'arriver ici.
        setAuthError("Session expirée — reconnecte-toi.");
        setChecking(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setClients(data.clients || []);
      setRole(data.role || "owner");
      if (data.rewardThreshold) setRewardThreshold(data.rewardThreshold);
      if (data.rewardLabel) setRewardLabel(data.rewardLabel);
      if (data.restaurantName) setRestaurantName(data.restaurantName);
      if (data.slug) setMerchantSlug(data.slug);
      setAuthed(true);
      localStorage.setItem(PW_STORAGE_KEY, pw);

      // Les rubriques suivantes ne sont utiles qu'au patron (owner) — pas
      // la peine d'appeler ces endpoints pour un caissier, il n'y a de
      // toute façon pas accès.
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
        try {
          const res2 = await fetch("/api/loyalty-settings", { headers: { "x-merchant-password": pw } });
          const data2 = await res2.json();
          if (res2.ok) {
            setTiers(data2.tiers);
          }
        } catch {
          // silencieux
        }
        try {
          const res3 = await fetch("/api/branding", { headers: { "x-merchant-password": pw } });
          const data3 = await res3.json();
          if (res3.ok) {
            setBrandHexColor(data3.hexColor);
            setBrandingInfo(data3);
          }
        } catch {
          // silencieux
        }
        try {
          const res4 = await fetch("/api/geolocation", { headers: { "x-merchant-password": pw } });
          const data4 = await res4.json();
          if (res4.ok) {
            setGeoEnabled(data4.enabled);
            setGeoAddress(data4.address);
            setGeoMessage(data4.message || "");
          }
        } catch {
          // silencieux
        }
        try {
          const res5 = await fetch("/api/employee-link", { headers: { "x-merchant-password": pw } });
          const data5 = await res5.json();
          if (res5.ok) setEmployeeToken(data5.token);
        } catch {
          // silencieux
        }
        try {
          const res6 = await fetch("/api/employees", { headers: { "x-merchant-password": pw } });
          const data6 = await res6.json();
          if (res6.ok) setEmployees(data6.employees || []);
        } catch {
          // silencieux
        }
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setChecking(false);
    }
  }

  // --- Écran de départ : choisir entre créer un compte et se connecter ---
  function goToChoice() {
    setAuthMode("choice");
    setAuthError("");
  }
  function goToLogin() {
    setAuthMode("login");
    setAuthError("");
  }
  function startSignup() {
    setAuthMode("signup");
    setSignupStep(1);
    setAuthError("");
  }

  // --- Connexion (compte déjà créé) ---
  async function handleLoginSubmit(e) {
    e.preventDefault();
    setChecking(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Connexion impossible.");
        setChecking(false);
        return;
      }
      setPassword(data.token);
      await tryAuth(data.token);
    } catch (err) {
      setAuthError("Connexion impossible : " + err.message);
      setChecking(false);
    }
  }

  // --- Inscription (nouveau restaurant) : assistant en 3 étapes ---
  // Étape 1 : nom + logo (optionnel, gardé en mémoire, pas encore envoyé).
  // Étape 2 : type d'activité (bulles). Étape 3 : identifiants + téléphone
  // (optionnel), puis un seul appel à /api/auth-signup avec tout ce qui a
  // été accumulé — pas d'écran de confirmation intermédiaire, accès direct
  // au tableau de bord dès le succès, comme avant l'assistant.
  function handleSignupLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAuthError("Le logo doit être une image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAuthError("Logo trop lourd (8 Mo max).");
      return;
    }
    setCropperFile(file);
    setCropperTarget("signup");
  }

  function goSignupStep2() {
    if (!signupRestaurantName.trim()) {
      setAuthError("Le nom de ton établissement est obligatoire.");
      return;
    }
    setAuthError("");
    setSignupStep(2);
  }

  function goSignupStep1() {
    setAuthError("");
    setSignupStep(1);
  }

  function goSignupStep3() {
    if (!signupBusinessType) {
      setAuthError("Choisis le type de ton activité.");
      return;
    }
    if (signupBusinessType === "autre" && !signupBusinessTypeOther.trim()) {
      setAuthError("Décris ton activité.");
      return;
    }
    setAuthError("");
    setSignupStep(3);
  }

  function goSignupStep2Back() {
    setAuthError("");
    setSignupStep(2);
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    if (signupPassword.length < 4) {
      setAuthError("Le mot de passe doit faire au moins 4 caractères.");
      return;
    }
    setChecking(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          restaurantName: signupRestaurantName,
          businessType: signupBusinessType,
          businessTypeOther: signupBusinessType === "autre" ? signupBusinessTypeOther : "",
          phone: signupPhone,
          logo: signupLogo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Inscription impossible.");
        setChecking(false);
        return;
      }
      setPassword(data.token);
      await tryAuth(data.token);
    } catch (err) {
      setAuthError("Inscription impossible : " + err.message);
      setChecking(false);
    }
  }

  // --- Déconnexion : clic sur le logo/wordmark Fidélions de la barre
  // latérale (voir sidebar) — remet l'écran de pré-connexion sur le choix
  // initial plutôt que de rouvrir directement le formulaire de connexion.
  function handleLogout() {
    setAuthed(false);
    setPassword("");
    setRole(null);
    setAuthMode("choice");
    setAuthError("");
    try {
      localStorage.removeItem(PW_STORAGE_KEY);
    } catch {
      // ignoré — au pire l'appareil réessaiera l'ancien jeton au prochain chargement
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
        ? `${data.client.prenom} a débloqué sa récompense ! (${data.client.points} points)`
        : `+1 pour ${data.client.prenom} (${data.client.points} point${data.client.points > 1 ? "s" : ""})`;
      if (data.notificationSent === false) {
        text += " — bien ajouté, mais la notification n'a pas pu partir (trop de notifications déjà envoyées à cette carte aujourd'hui).";
      }
      setMessage({ type: "success", text });
      refreshClients();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  // --- Fidélité : paliers de récompense ---
  function addTier() {
    if (tiers.length >= 10) return;
    const last = tiers[tiers.length - 1];
    const nextThreshold = last ? Number(last.threshold || 0) + 10 : 10;
    setTiers([...tiers, { threshold: nextThreshold, label: "" }]);
  }

  function updateTier(i, field, value) {
    setTiers(tiers.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  function removeTier(i) {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, idx) => idx !== i));
  }

  async function saveLoyalty() {
    for (const t of tiers) {
      const threshold = Number(t.threshold);
      if (!Number.isFinite(threshold) || threshold < 1 || threshold > 1000) {
        setMessage({ type: "error", text: "Chaque palier doit être entre 1 et 1000." });
        return;
      }
      if (!(t.label || "").trim()) {
        setMessage({ type: "error", text: "Décris la récompense de chaque palier." });
        return;
      }
    }
    setSavingLoyalty(true);
    setMessage(null);
    try {
      const res = await fetch("/api/loyalty-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({ tiers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTiers(data.tiers);
      setRewardThreshold(data.tiers[0].threshold);
      setRewardLabel(data.tiers[0].label);
      setMessage({ type: "success", text: "Réglages de fidélité enregistrés." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingLoyalty(false);
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
  // Fonction commune : appelée par le sélecteur de fichier ET par le
  // glisser-déposer, pour ne pas dupliquer la logique de lecture.
  function processMenuFile(file) {
    if (!file) return;
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

  function handleMenuFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    processMenuFile(file);
  }

  function handleMenuDrop(e) {
    e.preventDefault();
    setMenuDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    processMenuFile(file);
  }

  function handleMenuDragOver(e) {
    e.preventDefault();
    setMenuDragOver(true);
  }

  function handleMenuDragLeave(e) {
    e.preventDefault();
    setMenuDragOver(false);
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

  async function loadStats() {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/stats?range=${evolutionRange}`, {
        headers: { "x-merchant-password": password },
      });
      const data = await res.json();
      if (res.ok) setStatsData(data);
    } catch {
      // silencieux — l'onglet affichera "pas encore de données"
    } finally {
      setLoadingStats(false);
    }
  }

  // Change uniquement la période de la courbe "évolution des clients
  // fidélisés" — pas besoin de recharger les tuiles/autres graphes.
  async function changeEvolutionRange(range) {
    setEvolutionRange(range);
    setLoadingEvolution(true);
    try {
      const res = await fetch(`/api/stats?range=${range}`, {
        headers: { "x-merchant-password": password },
      });
      const data = await res.json();
      if (res.ok) {
        setStatsData((prev) => (prev ? { ...prev, evolutionClients: data.evolutionClients } : data));
      }
    } catch {
      // silencieux
    } finally {
      setLoadingEvolution(false);
    }
  }

  function switchTab(tab) {
    setActiveTab(tab);
    if (tab === "stats" && !statsData && !loadingStats) {
      loadStats();
    }
    if (tab === "etablissement" && !establishment && !loadingEstablishment) {
      loadEstablishment();
    }
  }

  // --- Fiche établissement ---
  async function loadEstablishment() {
    setLoadingEstablishment(true);
    try {
      const res = await fetch("/api/establishment", { headers: { "x-merchant-password": password } });
      const data = await res.json();
      if (res.ok) {
        setEstablishment(data);
        setEstBusinessType(data.businessType || "");
        setEstBusinessTypeOther(data.businessTypeOther || "");
        setEstPhone(data.phone || "");
        setEstWebsite(data.website || "");
        setEstInstagram(data.instagram || "");
        setEstFacebook(data.facebook || "");
        setEstDescription(data.description || "");
        setEstHours(data.hours || null);
        setEstPhotos(data.photos || []);
      }
    } catch {
      // silencieux — l'onglet réessaiera à la prochaine ouverture
    } finally {
      setLoadingEstablishment(false);
    }
  }

  function toggleEstDayClosed(dayId) {
    setEstHours((prev) => ({ ...prev, [dayId]: { ...prev[dayId], closed: !prev[dayId].closed } }));
  }

  function updateEstDayTime(dayId, field, value) {
    setEstHours((prev) => ({ ...prev, [dayId]: { ...prev[dayId], [field]: value } }));
  }

  async function handleEstPhotoChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const room = 4 - estPhotos.length - estNewPhotos.length;
    if (room <= 0) {
      setMessage({ type: "error", text: "4 photos maximum — retire-en une avant d'en ajouter une nouvelle." });
      return;
    }
    for (const file of files.slice(0, room)) {
      if (file.size > 4 * 1024 * 1024) continue;
      const encoded = await readFileAsBase64(file);
      setEstNewPhotos((prev) => [...prev, encoded]);
    }
  }

  function removeEstNewPhoto(i) {
    setEstNewPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function removeEstExistingPhoto(url) {
    setEstPhotos((prev) => prev.filter((u) => u !== url));
  }

  async function saveEstablishment() {
    if (estBusinessType === "autre" && !estBusinessTypeOther.trim()) {
      setMessage({ type: "error", text: "Décris ton activité." });
      return;
    }
    setSavingEstablishment(true);
    setMessage(null);
    try {
      const res = await fetch("/api/establishment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({
          businessType: estBusinessType,
          businessTypeOther: estBusinessType === "autre" ? estBusinessTypeOther : "",
          phone: estPhone,
          website: estWebsite,
          instagram: estInstagram,
          facebook: estFacebook,
          description: estDescription,
          hours: estHours,
          newPhotos: estNewPhotos,
          removedPhotoUrls: (establishment?.photos || []).filter((u) => !estPhotos.includes(u)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEstablishment(data);
      setEstPhotos(data.photos || []);
      setEstNewPhotos([]);
      setMessage({ type: "success", text: "Fiche établissement enregistrée." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingEstablishment(false);
    }
  }

  // Logo de la fiche établissement : contrairement au reste de l'onglet
  // (bouton "Enregistrer" unique), le logo est enregistré immédiatement dès
  // le recadrage validé — c'est la même image que celle de l'onglet "Ma
  // carte" (voir /api/branding), pas un champ propre à la fiche établissement.
  function handleEstLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Le logo doit être une image." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: "error", text: "Logo trop lourd (8 Mo max)." });
      return;
    }
    setCropperFile(file);
    setCropperTarget("establishment");
  }

  async function saveEstLogo(base64, mimeType) {
    setSavingEstLogo(true);
    setMessage(null);
    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({ logo: { base64, mimeType, filename: "logo.jpg" } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setBrandingInfo(data);
      setMessage({ type: "success", text: "Logo mis à jour." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingEstLogo(false);
    }
  }

  // --- Recadrage de logo : point d'entrée unique du modal partagé (voir
  // LogoCropper plus haut) — route le résultat vers le bon état selon quel
  // sélecteur a ouvert le modal.
  function handleCropConfirm(base64, mimeType) {
    const target = cropperTarget;
    setCropperFile(null);
    setCropperTarget(null);
    if (target === "signup") {
      setSignupLogo({ base64, mimeType, filename: "logo.jpg" });
    } else if (target === "branding") {
      setLogoFile({ base64, mimeType, filename: "logo.jpg" });
    } else if (target === "establishment") {
      saveEstLogo(base64, mimeType);
    }
  }

  function handleCropCancel() {
    setCropperFile(null);
    setCropperTarget(null);
  }

  // --- Personnalisation de la carte ---
  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Le logo doit être une image." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: "error", text: "Logo trop lourd (8 Mo max)." });
      return;
    }
    setCropperFile(file);
    setCropperTarget("branding");
  }

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image trop lourde (4 Mo max)." });
      return;
    }
    const encoded = await readFileAsBase64(file);
    setBannerFile(encoded);
  }

  async function saveBranding() {
    if (brandHexColor && !/^#[0-9a-fA-F]{6}$/.test(brandHexColor)) {
      setMessage({ type: "error", text: "Couleur invalide (format attendu : #7414F4)." });
      return;
    }
    setSavingBranding(true);
    setMessage(null);
    try {
      const payload = { hexColor: brandHexColor };
      if (logoFile) payload.logo = logoFile;
      if (bannerFile) payload.banner = bannerFile;
      const res = await fetch("/api/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setBrandingInfo(data);
      setLogoFile(null);
      setBannerFile(null);
      setMessage({
        type: "success",
        text: data.walletUpdated
          ? "Personnalisation enregistrée — les cartes déjà distribuées seront mises à jour d'ici quelques minutes."
          : `Personnalisation enregistrée, mais Google Wallet n'a pas pu être mis à jour tout de suite : ${data.walletError || "raison inconnue"} (réessaie plus tard).`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingBranding(false);
    }
  }

  // --- Changement de mot de passe (onglet Paramètres) ---
  function pwStartFlow() {
    setMessage(null);
    setPwStep("current");
  }

  function pwCancelToIdle() {
    setPwStep("idle");
    setPwCurrentInput("");
    setPwCode("");
    setPwNewPassword("");
    setPwMaskedEmail("");
  }

  async function pwSubmitCurrent() {
    if (!pwCurrentInput) {
      setMessage({ type: "error", text: "Saisis ton mot de passe actuel." });
      return;
    }
    setPwRequesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({ step: "request", currentPassword: pwCurrentInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setPwMaskedEmail(data.maskedEmail || "");
      setPwCode("");
      setPwNewPassword("");
      setPwStep("code");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPwRequesting(false);
    }
  }

  async function pwSubmitConfirm() {
    if (!/^[0-9]{4}$/.test(pwCode)) {
      setMessage({ type: "error", text: "Le code doit contenir 4 chiffres." });
      return;
    }
    if (pwNewPassword.length < 4) {
      setMessage({ type: "error", text: "Le mot de passe doit faire au moins 4 caractères." });
      return;
    }
    setPwConfirming(true);
    setMessage(null);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({ step: "confirm", code: pwCode, newPassword: pwNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage({ type: "success", text: "Mot de passe modifié." });
      pwCancelToIdle();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPwConfirming(false);
    }
  }

  // --- Notifications de proximité ---
  // Autocomplete d'adresse française : l'API Adresse du gouvernement
  // (gratuite, sans clé) renvoie des suggestions au fil de la saisie —
  // debounce de 300ms pour ne pas la spammer à chaque frappe.
  function handleGeoAddressChange(value) {
    setGeoAddress(value);
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    if (!value || value.trim().length < 3) {
      setGeoSuggestions([]);
      return;
    }
    geoDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`
        );
        const data = await res.json();
        setGeoSuggestions((data.features || []).map((f) => f.properties.label));
      } catch {
        setGeoSuggestions([]);
      }
    }, 300);
  }

  function pickGeoSuggestion(label) {
    setGeoAddress(label);
    setGeoSuggestions([]);
  }

  async function saveGeo() {
    if (geoEnabled && !geoAddress.trim()) {
      setMessage({ type: "error", text: "Indique l'adresse du commerce." });
      return;
    }
    setSavingGeo(true);
    setMessage(null);
    try {
      const res = await fetch("/api/geolocation", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({ enabled: geoEnabled, address: geoAddress, message: geoMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setGeoEnabled(data.enabled);
      setGeoAddress(data.address);
      setGeoMessage(data.message || "");
      setGeoSuggestions([]);
      const base = data.enabled ? "Notifications de proximité activées." : "Notifications de proximité désactivées.";
      setMessage({
        type: data.walletUpdated === false ? "error" : "success",
        text:
          data.walletUpdated === false
            ? `${base} Réglage enregistré, mais Google Wallet n'a pas pu être mis à jour tout de suite : ${data.walletError || "raison inconnue"} (réessaie plus tard).`
            : base,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingGeo(false);
    }
  }

  // --- Lien employé ---
  async function regenerateEmployeeLink() {
    setRegeneratingToken(true);
    setMessage(null);
    try {
      const res = await fetch("/api/employee-link", {
        method: "POST",
        headers: { "x-merchant-password": password },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEmployeeToken(data.token);
      setMessage({ type: "success", text: "Nouveau lien généré — l'ancien ne fonctionne plus." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setRegeneratingToken(false);
    }
  }

  function copyEmployeeLink() {
    if (typeof window === "undefined" || !employeeToken) return;
    const url = `${window.location.origin}/scan/${employeeToken}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => setMessage({ type: "success", text: "Lien copié !" }),
        () => setMessage({ type: "error", text: "Impossible de copier — sélectionne et copie le lien manuellement." })
      );
    }
  }

  // --- Équipe : chaque employé a son propre code, ses jours/horaires
  // d'accès, et ses permissions par rubrique — le lien ci-dessus reste
  // commun, c'est le code qui identifie qui l'utilise.
  function toggleEmpDay(day) {
    setEmpDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function startEditEmployee(emp) {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpPin("");
    setEmpDays(emp.days && emp.days.length > 0 ? emp.days : ALL_DAY_IDS);
    setEmpStart(emp.startTime || "");
    setEmpEnd(emp.endTime || "");
    setEmpPerms({
      clients: !!emp.permissions?.clients,
      stats: !!emp.permissions?.stats,
      campagnes: !!emp.permissions?.campagnes,
    });
  }

  function resetEmployeeForm() {
    setEditingEmpId(null);
    setEmpName("");
    setEmpPin("");
    setEmpDays(ALL_DAY_IDS);
    setEmpStart("");
    setEmpEnd("");
    setEmpPerms({ clients: false, stats: false, campagnes: false });
  }

  async function saveEmployee() {
    if (!empName.trim()) {
      setMessage({ type: "error", text: "Le prénom de l'employé est obligatoire." });
      return;
    }
    if (!editingEmpId && !/^[0-9]{4}$/.test(empPin)) {
      setMessage({ type: "error", text: "Le code doit faire exactement 4 chiffres." });
      return;
    }
    if (empPin && !/^[0-9]{4}$/.test(empPin)) {
      setMessage({ type: "error", text: "Le code doit faire exactement 4 chiffres." });
      return;
    }
    if (empStart && empEnd && empStart >= empEnd) {
      setMessage({ type: "error", text: "L'heure de fin doit être après l'heure de début." });
      return;
    }
    setSavingEmployee(true);
    setMessage(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({
          id: editingEmpId,
          name: empName,
          pin: empPin || undefined,
          days: empDays,
          startTime: empStart || null,
          endTime: empEnd || null,
          permissions: empPerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEmployees(data.employees || []);
      resetEmployeeForm();
      setMessage({ type: "success", text: "Employé enregistré." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingEmployee(false);
    }
  }

  async function toggleEmployeeActive(emp) {
    setMessage(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({
          id: emp.id,
          name: emp.name,
          active: !emp.active,
          days: emp.days,
          startTime: emp.startTime,
          endTime: emp.endTime,
          permissions: emp.permissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEmployees(data.employees || []);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function deleteEmployeeRow(emp) {
    setMessage(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-merchant-password": password },
        body: JSON.stringify({ action: "delete", id: emp.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEmployees(data.employees || []);
      setMessage({ type: "success", text: `${emp.name} supprimé de l'équipe.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
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
          `Campagne envoyée : ${parts.join(" + ")}` +
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
          "L'accès à la caméra a été refusé pour ce site. Sur ton téléphone : ouvre les réglages du navigateur (ou appuie sur l'icône cadenas/i à côté de l'adresse du site) → Autorisations → Caméra → Autoriser, puis recharge la page.";
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
          setCameraStatus(`${match.prenom} trouvé — clique "+1" ci-dessous pour valider.`);
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

  const totalPoints = activeClients.reduce((sum, c) => sum + (c.points || 0), 0);
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
          <img src="/logo.png" alt="Fidélions" className="auth-logo" />

          {authMode === "choice" && (
            <>
              <h1>Espace commerçant</h1>
              <p className="subtitle">Un seul site, un compte par établissement.</p>
              <div className="auth-choice">
                <button type="button" className="primary" onClick={startSignup}>
                  Créer un compte
                </button>
                <button type="button" className="secondary" onClick={goToLogin}>
                  Se connecter
                </button>
              </div>
            </>
          )}

          {authMode === "login" && (
            <>
              <h1>Espace commerçant</h1>
              <p className="subtitle">Connecte-toi à ton compte.</p>
              <form onSubmit={handleLoginSubmit}>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Email du commerce"
                  autoFocus
                  required
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mot de passe"
                  required
                />
                <button type="submit" disabled={checking}>
                  {checking ? "Connexion…" : "Se connecter"}
                </button>
              </form>
              {authError && <p className="error">{authError}</p>}
              <p className="auth-switch">
                <button type="button" className="link-btn" onClick={goToChoice}>
                  Retour
                </button>
                {" · "}
                Pas encore de compte ?{" "}
                <button type="button" className="link-btn" onClick={startSignup}>
                  Crée ton établissement sur Fidélions
                </button>
              </p>
            </>
          )}

          {authMode === "signup" && (
            <>
              <h1>Créer mon compte</h1>
              <p className="subtitle">Étape {signupStep}/3</p>
              <div className="step-dots">
                <span className={signupStep >= 1 ? "active" : ""} />
                <span className={signupStep >= 2 ? "active" : ""} />
                <span className={signupStep >= 3 ? "active" : ""} />
              </div>

              {signupStep === 1 && (
                <div className="signup-step">
                  <input
                    type="text"
                    value={signupRestaurantName}
                    onChange={(e) => setSignupRestaurantName(e.target.value)}
                    placeholder="Nom de ton établissement"
                    autoFocus
                    required
                  />
                  <div className="signup-logo-row">
                    {signupLogo && (
                      <img
                        className="upload-preview"
                        src={`data:${signupLogo.mimeType};base64,${signupLogo.base64}`}
                        alt="Aperçu du logo"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      ref={signupLogoInputRef}
                      style={{ display: "none" }}
                      onChange={handleSignupLogoChange}
                    />
                    <button type="button" className="secondary" onClick={() => signupLogoInputRef.current?.click()}>
                      <Icon name="paperclip" /> {signupLogo ? "Changer le logo" : "Ajouter un logo (optionnel)"}
                    </button>
                  </div>
                  {authError && <p className="error">{authError}</p>}
                  <button type="button" className="primary" onClick={goSignupStep2}>
                    Valider
                  </button>
                </div>
              )}

              {signupStep === 2 && (
                <div className="signup-step">
                  <p className="subtitle" style={{ marginBottom: 10 }}>
                    Quel type d'activité ?
                  </p>
                  <div className="bubble-group">
                    {BUSINESS_TYPES.map((bt) => (
                      <button
                        key={bt.id}
                        type="button"
                        className={`bubble-chip${signupBusinessType === bt.id ? " active" : ""}`}
                        onClick={() => setSignupBusinessType(bt.id)}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                  {signupBusinessType === "autre" && (
                    <input
                      type="text"
                      value={signupBusinessTypeOther}
                      onChange={(e) => setSignupBusinessTypeOther(e.target.value)}
                      placeholder="Décris ton activité"
                      maxLength={60}
                      autoFocus
                    />
                  )}
                  {authError && <p className="error">{authError}</p>}
                  <div className="signup-nav-row">
                    <button type="button" className="secondary" onClick={goSignupStep1}>
                      Retour
                    </button>
                    <button type="button" className="primary" onClick={goSignupStep3}>
                      Continuer
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 3 && (
                <form className="signup-step" onSubmit={handleSignupSubmit}>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="Ton email"
                    autoFocus
                    required
                  />
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Mot de passe (4 caractères minimum)"
                    required
                  />
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="Téléphone (optionnel)"
                  />
                  {authError && <p className="error">{authError}</p>}
                  <div className="signup-nav-row">
                    <button type="button" className="secondary" onClick={goSignupStep2Back}>
                      Retour
                    </button>
                    <button type="submit" className="primary" disabled={checking}>
                      {checking ? "Création…" : "Créer mon compte"}
                    </button>
                  </div>
                </form>
              )}

              <p className="auth-switch">
                Déjà un compte ?{" "}
                <button type="button" className="link-btn" onClick={goToLogin}>
                  Connecte-toi
                </button>
              </p>
            </>
          )}

          <p className="legal-links">
            <Link href="/cgv">CGV</Link>
            <span> · </span>
            <Link href="/confidentialite">Confidentialité</Link>
          </p>
        </div>
        {cropperFile && cropperTarget && (
          <LogoCropper file={cropperFile} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
        )}
        <style jsx>{styles}</style>
      </div>
    );
  }

  const pointLabel = "point";

  return (
    <div className="page">
      <div className={`wrap${sidebarCollapsed && role === "owner" ? " sb-collapsed" : ""}`}>
        <h1>Espace commerçant</h1>

        {message && (
          <div className={`banner ${message.type}`}>{message.text}</div>
        )}

      <div className="dashboard">
        {role === "owner" && (
          <div className={`sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
            <button
              type="button"
              className="sb-brand"
              onClick={handleLogout}
              title="Se déconnecter"
              aria-label="Fidélions — se déconnecter et revenir à l'accueil"
            >
              <img src="/logo.png" alt="Fidélions" className="sb-logo" />
              <span className="sb-wordmark">Fidélions</span>
            </button>
            <div className="sb-topbar">
              <button
                type="button"
                className="sb-icon-btn"
                onClick={handleLogout}
                aria-label="Revenir à l'accueil (déconnexion)"
                title="Revenir à l'accueil"
              >
                <Icon name="chevronLeft" size={17} />
              </button>
              <button
                type="button"
                className="sb-icon-btn"
                onClick={() => setSidebarCollapsed((c) => !c)}
                aria-label={sidebarCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
                title={sidebarCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
              >
                <Icon name="panel" size={17} />
              </button>
            </div>
            <nav className="sb-nav">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`sb-item${activeTab === t.id ? " active" : ""}`}
                  onClick={() => switchTab(t.id)}
                  title={t.label}
                >
                  <span className="sb-item-icon">
                    <Icon name={t.icon} />
                  </span>
                  <span className="sb-item-label">{t.label}</span>
                </button>
              ))}
              <div className="sb-section-label">Compte</div>
              {ACCOUNT_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`sb-item${activeTab === t.id ? " active" : ""}`}
                  onClick={() => switchTab(t.id)}
                  title={t.label}
                >
                  <span className="sb-item-icon">
                    <Icon name={t.icon} />
                  </span>
                  <span className="sb-item-label">{t.label}</span>
                </button>
              ))}
            </nav>
            <div className="sb-footer">
              <div className="sb-avatar">{(restaurantName || "F").trim().charAt(0).toUpperCase()}</div>
              <div className="sb-footer-text">
                <strong className="sb-footer-name">{restaurantName || "Mon établissement"}</strong>
                <span className="sb-footer-role">Commerçant</span>
              </div>
              <span className="sb-footer-chevron">
                <Icon name="chevronUpDown" size={16} />
              </span>
            </div>
          </div>
        )}

        <div className="dashboard-content">
        {role === "owner" && activeTab === "apercu" && (
          <div className="card">
            <h2>Aperçu</h2>
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value">{activeClients.length}</div>
                <div className="stat-label">Clients inscrits</div>
              </div>
              <div className="stat">
                <div className="stat-value">{totalPoints}</div>
                <div className="stat-label">Points distribués</div>
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
                <p className="subtitle icon-heading" style={{ marginTop: 16, marginBottom: 8 }}>
                  <Icon name="trophy" size={15} /> Classement de fidélité
                </p>
                <div className="ranking">
                  {ranking.map((c, i) => (
                    <div className="rank-row" key={c.objectId}>
                      <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                      <span className="rank-name">{c.prenom}</span>
                      <span className="rank-points">
                        {c.points} {pointLabel}
                        {c.points > 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {insights.length > 0 && (
              <>
                <p className="subtitle icon-heading" style={{ marginTop: 16, marginBottom: 8 }}>
                  <Icon name="robot" size={15} /> Analyse automatique
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

        {role === "owner" && activeTab === "partager" && (
          <div className="card">
            <h2>Partager Fidélions</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Affiche ce QR code en caisse ou sur tes tables : tes clients le
              scannent avec leur téléphone pour créer leur carte de fidélité
              en quelques secondes, sans rien installer.
            </p>
            {signupQrUrl ? (
              <div style={{ textAlign: "center" }}>
                <img
                  src={signupQrUrl}
                  alt="QR code d'inscription Fidélions"
                  style={{ width: 220, height: 220, borderRadius: 12, border: "1.5px solid #e6e2f2" }}
                />
                <p style={{ marginTop: 12 }}>
                  <a href={signupQrUrl} download="qr-fidelions.png" className="link-btn icon-heading">
                    <Icon name="download" size={14} /> Télécharger l'image à imprimer
                  </a>
                </p>
              </div>
            ) : (
              <p className="subtitle">Génération du QR code…</p>
            )}
            <p className="subtitle" style={{ marginTop: 16, marginBottom: 6 }}>
              Ou partage directement le lien :
            </p>
            <div className="link-box">
              {typeof window !== "undefined" && merchantSlug
                ? `${window.location.origin}/r/${merchantSlug}`
                : ""}
            </div>
            <button className="secondary icon-heading" type="button" onClick={copySignupLink}>
              <Icon name="copy" size={15} /> Copier le lien
            </button>
          </div>
        )}

        {role === "owner" && activeTab === "fidelite" && (
          <div className="card">
            <h2>Programme de fidélité</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Écris librement autant de récompenses que tu veux, chacune avec
              son propre seuil de points — ex : 20 points = une pizza offerte,
              30 = une pizza + une boisson offertes. Une seule récompense, ça
              fait cheap : ajoutes-en plusieurs pour donner plusieurs objectifs
              à tes clients.
            </p>

            {tiers.map((t, i) => (
              <div key={i} className="tier-block">
                <div className="tier-row">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={t.threshold}
                    onChange={(e) => updateTier(i, "threshold", e.target.value === "" ? "" : Number(e.target.value))}
                  />
                  <input
                    type="text"
                    placeholder={`Récompense (ex : 1 pizza offerte)`}
                    value={t.label}
                    onChange={(e) => updateTier(i, "label", e.target.value)}
                    maxLength={80}
                  />
                  <button type="button" onClick={() => removeTier(i)} disabled={tiers.length <= 1}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
                <div className="presets">
                  {REWARD_PRESETS.map((p) => (
                    <button key={p} type="button" className="preset-chip" onClick={() => updateTier(i, "label", p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className="secondary" onClick={addTier} disabled={tiers.length >= 10}>
              + Ajouter une récompense
            </button>

            <div className="reward-preview" style={{ marginTop: 12 }}>
              {tiers
                .filter((t) => t.threshold && t.label)
                .sort((a, b) => a.threshold - b.threshold)
                .map((t, i) => (
                  <div key={i}>
                    À <strong>{t.threshold}</strong> point{t.threshold > 1 ? "s" : ""} : <strong>{t.label}</strong>
                  </div>
                ))}
            </div>

            <button className="primary" style={{ marginTop: 14 }} onClick={saveLoyalty} disabled={savingLoyalty}>
              {savingLoyalty ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}

        {role === "owner" && activeTab === "stats" && (
          <div className="card">
            <h2>Statistiques</h2>
            {loadingStats && <p className="subtitle">Chargement…</p>}
            {!loadingStats && statsData && (
              <>
                <div className="tiles-row">
                  <div className="stat">
                    <div className="stat-value">{statsData.tiles.pointsThisWeek}</div>
                    <div className="stat-label">Points cette semaine</div>
                    <Delta pct={statsData.tiles.pointsChangePct} />
                  </div>
                  <div className="stat">
                    <div className="stat-value">{statsData.tiles.newClientsThisWeek}</div>
                    <div className="stat-label">Nouveaux clients</div>
                    <Delta pct={statsData.tiles.newClientsChangePct} />
                  </div>
                  <div className="stat">
                    <div className="stat-value">{statsData.tiles.rewardsThisMonth}</div>
                    <div className="stat-label">Récompenses ce mois-ci</div>
                  </div>
                </div>

                <p className="chart-title" style={{ marginTop: 6 }}>Évolution du nombre de clients fidélisés</p>
                <div className="range-selector">
                  {EVOLUTION_RANGES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={evolutionRange === r.id ? "active" : ""}
                      onClick={() => changeEvolutionRange(r.id)}
                      disabled={loadingEvolution}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {loadingEvolution && <p className="subtitle" style={{ marginBottom: 8 }}>Chargement…</p>}
                {!loadingEvolution && statsData.evolutionClients && statsData.evolutionClients.length > 0 && (
                  <LineChart data={statsData.evolutionClients} />
                )}
                {!loadingEvolution && (!statsData.evolutionClients || statsData.evolutionClients.length === 0) && (
                  <p className="subtitle">Pas encore de client fidélisé sur cette période.</p>
                )}

                <p className="chart-title">Points distribués par jour (14 derniers jours)</p>
                <BarChart data={statsData.pointsParJour} />

                <p className="chart-title">Heures de pointe</p>
                <BarChart data={statsData.heuresDePointe} />

                <p className="chart-title">Jours de la semaine</p>
                <BarChart data={statsData.joursDeLaSemaine} />

                <p className="chart-title">Nouveaux clients par semaine</p>
                <BarChart data={statsData.nouveauxClientsParSemaine} />
              </>
            )}
            {!loadingStats && !statsData && (
              <p className="subtitle">Pas encore de données — reviens après quelques points ajoutés.</p>
            )}

            <h2 style={{ marginTop: 28 }}>Analyse du menu & suggestions (IA)</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Écris ton menu, ou importe-le directement — texte (.txt), PDF, ou
              simple photo prise au téléphone. Une IA (gratuite) le lit et le
              comprend toute seule, puis propose des idées de promotions basées
              sur tes propres plats — c'est notre plus par rapport à la
              concurrence, gardé ici avec le reste de l'analyse.
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
            <div
              className={"dropzone" + (menuDragOver ? " drag-over" : "")}
              onClick={() => menuFileInputRef.current?.click()}
              onDrop={handleMenuDrop}
              onDragOver={handleMenuDragOver}
              onDragEnter={handleMenuDragOver}
              onDragLeave={handleMenuDragLeave}
              role="button"
              tabIndex={0}
            >
              {menuFile ? (
                <p className="subtitle icon-heading" style={{ margin: 0 }}>
                  <Icon name="paperclip" size={14} /> {menuFile.name} prêt à analyser —{" "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearMenuFile();
                    }}
                  >
                    retirer
                  </button>
                </p>
              ) : (
                <p className="subtitle icon-heading" style={{ margin: 0 }}>
                  <Icon name="file" size={14} /> Glisse-dépose un fichier ici (.txt, PDF, photo), ou clique pour en choisir un
                </p>
              )}
            </div>
            <div className="menu-actions">
              <button className="secondary icon-heading" type="button" onClick={saveMenu} disabled={savingMenu}>
                {savingMenu ? "Enregistrement…" : (<><Icon name="save" size={15} /> Enregistrer le menu</>)}
              </button>
              <button className="primary icon-heading" type="button" onClick={analyzeWithAI} disabled={analyzing}>
                {analyzing ? "Analyse en cours…" : (<><Icon name="robot" size={15} /> Analyser avec l'IA</>)}
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
                  <button className="secondary icon-heading" type="button" onClick={useAiSuggestions}>
                    <Icon name="download" size={15} /> Utiliser ces suggestions dans mon offre
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
              <button className="primary icon-heading" type="button" onClick={saveOffer} disabled={savingOffer}>
                {savingOffer ? "Enregistrement…" : (<><Icon name="save" size={15} /> Enregistrer mon offre</>)}
              </button>
            </div>
          </div>
        )}

        {role === "owner" && activeTab === "carte" && (
          <div className="card">
            <h2>Personnaliser ma carte</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Couleur, logo et bannière affichés sur la carte Google Wallet de
              tes clients. Les cartes déjà distribuées sont mises à jour
              automatiquement, sans rien demander aux clients.
            </p>

            <div className="color-row">
              <input type="color" value={brandHexColor} onChange={(e) => setBrandHexColor(e.target.value)} />
              <input
                type="text"
                value={brandHexColor}
                onChange={(e) => setBrandHexColor(e.target.value)}
                maxLength={7}
                placeholder="#7414F4"
              />
            </div>

            <div className="upload-row">
              <p className="subtitle" style={{ marginBottom: 6 }}>Logo (carré, affiché en haut de la carte)</p>
              {(logoFile || brandingInfo?.logoUrl) && (
                <img
                  className="upload-preview"
                  src={logoFile ? `data:${logoFile.mimeType};base64,${logoFile.base64}` : brandingInfo.logoUrl}
                  alt="Logo actuel"
                />
              )}
              <input type="file" accept="image/*" ref={logoInputRef} style={{ display: "none" }} onChange={handleLogoChange} />
              <button type="button" className="secondary icon-heading" onClick={() => logoInputRef.current?.click()}>
                <Icon name="paperclip" size={15} /> Choisir un logo
              </button>
            </div>

            <div className="upload-row">
              <p className="subtitle" style={{ marginBottom: 6 }}>Bannière (image large, en haut de la carte)</p>
              {(bannerFile || brandingInfo?.bannerUrl) && (
                <img
                  className="upload-preview"
                  src={bannerFile ? `data:${bannerFile.mimeType};base64,${bannerFile.base64}` : brandingInfo.bannerUrl}
                  alt="Bannière actuelle"
                />
              )}
              <input type="file" accept="image/*" ref={bannerInputRef} style={{ display: "none" }} onChange={handleBannerChange} />
              <button type="button" className="secondary icon-heading" onClick={() => bannerInputRef.current?.click()}>
                <Icon name="paperclip" size={15} /> Choisir une bannière
              </button>
            </div>

            <button className="primary" onClick={saveBranding} disabled={savingBranding}>
              {savingBranding ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}

        {role === "owner" && activeTab === "proximite" && (
          <div className="card">
            <h2>Notifications de proximité</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Indique l'adresse de ton commerce : Google Wallet avertit alors
              automatiquement, avec une vraie notification sur le téléphone,
              tout client équipé qui passe à proximité — aucune app ni réglage
              supplémentaire de ton côté.
            </p>
            <label className="channel" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={geoEnabled} onChange={(e) => setGeoEnabled(e.target.checked)} />
              Activer les notifications de proximité
            </label>
            <div className="suggest-wrap">
              <input
                type="text"
                placeholder="Commence à taper ton adresse (ex : 12 rue de Metz, Toulouse)"
                value={geoAddress}
                onChange={(e) => handleGeoAddressChange(e.target.value)}
                disabled={!geoEnabled}
                autoComplete="off"
              />
              {geoSuggestions.length > 0 && (
                <div className="suggest-list">
                  {geoSuggestions.map((label, i) => (
                    <button key={i} type="button" className="icon-heading" onClick={() => pickGeoSuggestion(label)}>
                      <Icon name="mappin" size={14} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="subtitle" style={{ marginTop: 4, marginBottom: 6 }}>
              Message affiché en permanence sur la carte de tes clients (pas
              seulement quand ils sont à proximité — le popup natif de
              proximité, lui, est généré par Google et n'a pas de texte
              personnalisable, c'est une limite de leur API, pas de Fidélions).
            </p>
            <textarea
              className="menu-textarea"
              placeholder="Ex : On a hâte de vous voir ! Passez nous dire bonjour."
              value={geoMessage}
              onChange={(e) => setGeoMessage(e.target.value)}
              maxLength={200}
              rows={3}
            />

            <button className="primary" onClick={saveGeo} disabled={savingGeo}>
              {savingGeo ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}

        {role === "owner" && activeTab === "equipe" && (
          <div className="card">
            <h2>Lien employé</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Envoie ce lien à toute ton équipe (SMS, WhatsApp…) : chaque
              employé s'identifie ensuite avec son propre code à 4 chiffres
              (onglet "Équipe" juste après) et peut ajouter un {pointLabel},
              plus les rubriques que tu lui as ouvertes. Régénère le lien à
              tout moment pour couper l'accès à toute l'équipe d'un coup.
            </p>
            {employeeToken ? (
              <div className="link-box">
                {typeof window !== "undefined" ? `${window.location.origin}/scan/${employeeToken}` : `/scan/${employeeToken}`}
              </div>
            ) : (
              <p className="subtitle">Chargement du lien…</p>
            )}
            <div className="menu-actions">
              <button className="secondary icon-heading" type="button" onClick={copyEmployeeLink} disabled={!employeeToken}>
                <Icon name="copy" size={15} /> Copier le lien
              </button>
              <button className="primary icon-heading" type="button" onClick={regenerateEmployeeLink} disabled={regeneratingToken}>
                {regeneratingToken ? "…" : (<><Icon name="refresh" size={15} /> Régénérer le lien</>)}
              </button>
            </div>
          </div>
        )}

        {role === "owner" && activeTab === "equipe" && (
          <div className="card">
            <h2>{editingEmpId ? "Modifier l'employé" : "Ajouter un employé"}</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Chaque employé a son propre code à 4 chiffres pour s'identifier
              sur le lien ci-dessus, des jours/horaires d'accès, et des
              permissions par rubrique — certains employés peuvent n'avoir
              que le scan, d'autres plus de responsabilités.
            </p>
            <input
              type="text"
              placeholder="Son prénom"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              maxLength={40}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder={editingEmpId ? "Nouveau code à 4 chiffres (laisser vide pour garder l'ancien)" : "Son code à 4 chiffres"}
              value={empPin}
              onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
            />
            <p className="subtitle" style={{ marginBottom: 6 }}>
              Jours d'accès — clique pour activer/désactiver un jour
            </p>
            <div className="day-chips">
              {DAY_OPTIONS.map((d) => {
                const on = empDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={on ? "active" : ""}
                    onClick={() => toggleEmpDay(d.id)}
                    aria-pressed={on}
                    title={on ? `${d.label} : accès activé` : `${d.label} : accès désactivé`}
                  >
                    <span className="day-chip-mark"><Icon name={on ? "check" : "x"} size={12} /></span> {d.label}
                  </button>
                );
              })}
            </div>
            <p className="day-chips-summary icon-heading">
              {empDays.length === 0 ? (
                <>
                  <Icon name="warning" size={14} /> Aucun jour activé — l'employé ne pourra jamais se connecter.
                </>
              ) : empDays.length === 7 ? (
                "Accès activé tous les jours."
              ) : (
                `Accès activé ${empDays.length} jour${empDays.length > 1 ? "s" : ""} sur 7 : ${DAY_OPTIONS.filter((d) => empDays.includes(d.id)).map((d) => d.label).join(", ")}.`
              )}
            </p>
            <p className="subtitle" style={{ marginBottom: 6 }}>
              Plage horaire (optionnel — laisse vide pour un accès à toute heure les jours cochés)
            </p>
            <div className="time-row">
              <input type="time" value={empStart} onChange={(e) => setEmpStart(e.target.value)} />
              <span>à</span>
              <input type="time" value={empEnd} onChange={(e) => setEmpEnd(e.target.value)} />
            </div>
            <p className="subtitle" style={{ marginBottom: 6 }}>Accès en plus du scan</p>
            <label className="channel">
              <input
                type="checkbox"
                checked={empPerms.clients}
                onChange={(e) => setEmpPerms({ ...empPerms, clients: e.target.checked })}
              />
              Voir la liste des clients
            </label>
            <label className="channel">
              <input
                type="checkbox"
                checked={empPerms.stats}
                onChange={(e) => setEmpPerms({ ...empPerms, stats: e.target.checked })}
              />
              Voir les statistiques
            </label>
            <label className="channel" style={{ marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={empPerms.campagnes}
                onChange={(e) => setEmpPerms({ ...empPerms, campagnes: e.target.checked })}
              />
              Envoyer des campagnes
            </label>
            <div className="menu-actions">
              <button className="primary" type="button" onClick={saveEmployee} disabled={savingEmployee}>
                {savingEmployee ? "Enregistrement…" : editingEmpId ? "Enregistrer les modifications" : "Ajouter cet employé"}
              </button>
              {editingEmpId && (
                <button className="secondary" type="button" onClick={resetEmployeeForm}>
                  Annuler
                </button>
              )}
            </div>

            {employees.length > 0 && (
              <>
                <h2 style={{ marginTop: 28 }}>Ton équipe</h2>
                <div className="list">
                  {employees.map((emp) => (
                    <div className={`emp-row${emp.active ? "" : " blocked"}`} key={emp.id}>
                      <div className="row-info">
                        <strong>
                          {emp.name}
                          {!emp.active ? " (désactivé)" : ""}
                        </strong>
                        <div className="meta">
                          Code : {revealedPinId === emp.id ? emp.pin : "••••"}{" "}
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setRevealedPinId(revealedPinId === emp.id ? null : emp.id)}
                          >
                            {revealedPinId === emp.id ? "masquer" : "afficher"}
                          </button>
                        </div>
                        <div className="meta">
                          {emp.days && emp.days.length === 7 ? "Tous les jours" : (emp.days || []).join(", ")}
                          {emp.startTime && emp.endTime ? ` · ${emp.startTime}-${emp.endTime}` : ""}
                        </div>
                        <div className="perm-badges">
                          <span className="perm-badge">Scan</span>
                          {emp.permissions?.clients && <span className="perm-badge">Clients</span>}
                          {emp.permissions?.stats && <span className="perm-badge">Stats</span>}
                          {emp.permissions?.campagnes && <span className="perm-badge">Campagnes</span>}
                        </div>
                      </div>
                      <div className="row-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                        <button className="secondary small" type="button" onClick={() => toggleEmployeeActive(emp)}>
                          {emp.active ? "Désactiver" : "Activer"}
                        </button>
                        <button className="secondary small" type="button" onClick={() => startEditEmployee(emp)}>
                          Modifier
                        </button>
                        <button className="secondary small danger-btn" type="button" onClick={() => deleteEmployeeRow(emp)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {role === "owner" && activeTab === "campagnes" && (
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

        {(role !== "owner" || activeTab === "clients") && (
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
        )}

        {(role !== "owner" || activeTab === "clients") && (
          <div className="card">
            <h2>Ou recherchez un client</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Tape le prénom du client (ou scanne son QR ci-dessus), puis clique
              "+1" sur sa ligne. Le menu "⋮" permet de renommer, bloquer
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
                          <Icon name="check" size={14} />
                        </button>
                        <button
                          className="secondary small"
                          type="button"
                          onClick={() => setRenamingId(null)}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ) : (
                      <strong>
                        {c.prenom}
                        {c.blocked ? " (bloqué)" : ""}
                      </strong>
                    )}
                    <div className="meta">
                      {c.points} {pointLabel}
                      {c.points > 1 ? "s" : ""} · inscrit le{" "}
                      {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                    {c.email && <div className="email-line">{c.email}</div>}
                  </div>
                  <div className="row-actions">
                    {!c.blocked ? (
                      <button className="primary small" onClick={() => addStamp(c.objectId)}>
                        +1
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
                          <button type="button" className="icon-heading" onClick={() => startRename(c)}>
                            <Icon name="edit" size={14} /> Renommer
                          </button>
                          <button type="button" className="icon-heading" onClick={() => toggleBlock(c)}>
                            <Icon name={c.blocked ? "unlock" : "lock"} size={14} /> {c.blocked ? "Débloquer" : "Bloquer"}
                          </button>
                          {confirmDeleteId === c.objectId ? (
                            <button type="button" className="danger icon-heading" onClick={() => doDelete(c)}>
                              <Icon name="warning" size={14} /> Confirmer la suppression
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="danger icon-heading"
                              onClick={() => setConfirmDeleteId(c.objectId)}
                            >
                              <Icon name="trash" size={14} /> Supprimer
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
        )}

        {role === "owner" && activeTab === "etablissement" && (
          <div className="card">
            <h2>Établissement</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Ces informations aident tes clients à te connaître avant de
              venir. L'adresse utilisée pour les notifications de proximité
              se règle, elle, dans son propre onglet "Géolocalisation".
            </p>
            {loadingEstablishment && <p className="subtitle">Chargement…</p>}
            {!loadingEstablishment && estHours && (
              <>
                <p className="subtitle" style={{ marginBottom: 6 }}>Logo</p>
                <div className="est-logo-row">
                  {brandingInfo?.logoUrl ? (
                    <img className="est-logo-preview" src={brandingInfo.logoUrl} alt="Logo actuel" />
                  ) : (
                    <div className="est-logo-placeholder">
                      {(restaurantName || "F").trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={estLogoInputRef}
                    style={{ display: "none" }}
                    onChange={handleEstLogoChange}
                  />
                  <button
                    type="button"
                    className="secondary icon-heading"
                    onClick={() => estLogoInputRef.current?.click()}
                    disabled={savingEstLogo}
                  >
                    <Icon name="paperclip" size={15} />{" "}
                    {savingEstLogo ? "Enregistrement…" : "Changer le logo"}
                  </button>
                </div>

                <p className="subtitle" style={{ marginBottom: 6 }}>Type d'activité</p>
                <div className="bubble-group">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt.id}
                      type="button"
                      className={`bubble-chip${estBusinessType === bt.id ? " active" : ""}`}
                      onClick={() => setEstBusinessType(bt.id)}
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
                {estBusinessType === "autre" && (
                  <input
                    type="text"
                    value={estBusinessTypeOther}
                    onChange={(e) => setEstBusinessTypeOther(e.target.value)}
                    placeholder="Décris ton activité"
                    maxLength={60}
                  />
                )}

                <p className="subtitle" style={{ marginTop: 6, marginBottom: 6 }}>Coordonnées</p>
                <input type="tel" value={estPhone} onChange={(e) => setEstPhone(e.target.value)} placeholder="Téléphone" />
                <input
                  type="url"
                  value={estWebsite}
                  onChange={(e) => setEstWebsite(e.target.value)}
                  placeholder="Site web (https://...)"
                />
                <input
                  type="text"
                  value={estInstagram}
                  onChange={(e) => setEstInstagram(e.target.value)}
                  placeholder="Instagram (lien ou @pseudo)"
                />
                <input
                  type="text"
                  value={estFacebook}
                  onChange={(e) => setEstFacebook(e.target.value)}
                  placeholder="Facebook (lien)"
                />

                <p className="subtitle" style={{ marginBottom: 6 }}>À propos</p>
                <textarea
                  className="menu-textarea"
                  value={estDescription}
                  onChange={(e) => setEstDescription(e.target.value)}
                  placeholder="Quelques phrases pour te présenter à tes clients…"
                  maxLength={600}
                  rows={4}
                />

                <p className="subtitle" style={{ marginBottom: 6 }}>Horaires d'ouverture</p>
                <div className="hours-table">
                  {ESTABLISHMENT_DAYS.map((d) => {
                    const day = estHours[d.id] || { closed: false, start: "09:00", end: "19:00" };
                    return (
                      <div className="hours-row" key={d.id}>
                        <span className="hours-day">{d.label}</span>
                        <label className="channel hours-closed-toggle">
                          <input type="checkbox" checked={!!day.closed} onChange={() => toggleEstDayClosed(d.id)} />
                          Fermé
                        </label>
                        {!day.closed && (
                          <div className="time-row hours-time-row">
                            <input
                              type="time"
                              value={day.start}
                              onChange={(e) => updateEstDayTime(d.id, "start", e.target.value)}
                            />
                            <span>à</span>
                            <input
                              type="time"
                              value={day.end}
                              onChange={(e) => updateEstDayTime(d.id, "end", e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="subtitle" style={{ marginTop: 14, marginBottom: 6 }}>Photos (4 maximum)</p>
                <div className="photo-grid">
                  {estPhotos.map((url) => (
                    <div className="photo-thumb" key={url}>
                      <img src={url} alt="" />
                      <button type="button" className="photo-remove" onClick={() => removeEstExistingPhoto(url)}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ))}
                  {estNewPhotos.map((p, i) => (
                    <div className="photo-thumb" key={`new-${i}`}>
                      <img src={`data:${p.mimeType};base64,${p.base64}`} alt="" />
                      <button type="button" className="photo-remove" onClick={() => removeEstNewPhoto(i)}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ))}
                  {estPhotos.length + estNewPhotos.length < 4 && (
                    <button type="button" className="photo-add" onClick={() => estPhotoInputRef.current?.click()}>
                      <Icon name="paperclip" size={17} />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={estPhotoInputRef}
                  style={{ display: "none" }}
                  onChange={handleEstPhotoChange}
                />

                <button className="primary" style={{ marginTop: 14 }} onClick={saveEstablishment} disabled={savingEstablishment}>
                  {savingEstablishment ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            )}
          </div>
        )}

        {role === "owner" && activeTab === "abonnement" && (
          <div className="card">
            <h2>Abonnement</h2>
            <p className="subtitle">
              Bientôt disponible. Pas de facturation ni d'abonnement payant
              pour l'instant — Fidélions tourne pour toi tel quel, sans frais
              caché.
            </p>
          </div>
        )}

        {role === "owner" && activeTab === "parametres" && (
          <div className="card">
            <h2>Paramètres</h2>

            {pwStep === "idle" && (
              <>
                <p className="subtitle">
                  Change le mot de passe de ton compte. Une vérification par
                  email (code à 4 chiffres) te sera demandée avant de
                  valider le nouveau mot de passe.
                </p>
                <button type="button" className="primary small" onClick={pwStartFlow}>
                  Changer le mot de passe
                </button>
              </>
            )}

            {pwStep === "current" && (
              <div className="pw-flow">
                <p className="subtitle" style={{ marginBottom: 10 }}>
                  Confirme ton mot de passe actuel.
                </p>
                <input
                  type="password"
                  value={pwCurrentInput}
                  onChange={(e) => setPwCurrentInput(e.target.value)}
                  placeholder="Mot de passe actuel"
                  autoFocus
                />
                <div className="pw-flow-actions">
                  <button type="button" className="secondary" onClick={pwCancelToIdle} disabled={pwRequesting}>
                    Annuler
                  </button>
                  <button type="button" className="primary" onClick={pwSubmitCurrent} disabled={pwRequesting}>
                    {pwRequesting ? "Vérification…" : "Valider"}
                  </button>
                </div>
              </div>
            )}

            {pwStep === "code" && (
              <div className="pw-flow">
                <p className="subtitle" style={{ marginBottom: 10 }}>
                  Un code a été envoyé à {pwMaskedEmail}.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pwCode}
                  onChange={(e) => setPwCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  placeholder="Code à 4 chiffres"
                  autoFocus
                />
                <input
                  type="password"
                  value={pwNewPassword}
                  onChange={(e) => setPwNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe (4 caractères minimum)"
                />
                <div className="pw-flow-actions">
                  <button type="button" className="secondary" onClick={pwCancelToIdle} disabled={pwConfirming}>
                    Annuler
                  </button>
                  <button type="button" className="primary" onClick={pwSubmitConfirm} disabled={pwConfirming}>
                    {pwConfirming ? "Confirmation…" : "Confirmer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {role === "owner" && activeTab === "aide" && (
          <div className="card">
            <h2>Support</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Les réponses aux blocages les plus fréquents. Pas de chat en
              ligne ici : personne ne serait derrière pour répondre à temps —
              cette page répond tout de suite, à toute heure.
            </p>
            <details className="faq-item">
              <summary>Un client ne voit pas la notification quand j'ajoute un {pointLabel}</summary>
              <p>
                Deux causes possibles : (1) sur son téléphone, les notifications
                doivent être activées pour l'app Google Wallet (Réglages →
                Applications → Google Wallet → Notifications → Activer) ; (2)
                Google limite à 3 notifications-popup par carte et par 24h — au-delà,
                le {pointLabel} part quand même, seul le popup n'apparaît pas ce
                jour-là (le message reste visible en ouvrant la carte dans l'app Wallet).
              </p>
            </details>
            <details className="faq-item">
              <summary>La caméra reste noire ou refuse de s'activer</summary>
              <p>
                L'autorisation caméra du site a été refusée. Sur le téléphone :
                appuie sur l'icône cadenas/i à côté de l'adresse du site dans le
                navigateur → Autorisations (ou Paramètres du site) → Caméra →
                Autoriser, puis recharge la page.
              </p>
            </details>
            <details className="faq-item">
              <summary>L'envoi d'email de campagne échoue</summary>
              <p>
                Vérifie que la clé d'envoi d'email est bien configurée sur
                Vercel et qu'un redéploiement a suivi son ajout. Le compteur
                "(X avec email)" doit être supérieur à 0 — sinon, aucun client
                inscrit n'a renseigné son email.
              </p>
            </details>
            <details className="faq-item">
              <summary>"Analyser avec l'IA" échoue</summary>
              <p>
                Pour du texte collé/écrit, une analyse basique prend le relais
                automatiquement en attendant ; pour un PDF ou une photo, la clé
                IA est indispensable. Si le message parle d'un service
                "temporairement surchargé", c'est un pic de charge chez Google
                (pas un bug du site) — le site réessaie déjà une fois tout
                seul ; si ça persiste, réessaie manuellement dans une minute.
              </p>
            </details>
            <details className="faq-item">
              <summary>Comment donner accès à un employé sans lui donner le mot de passe ?</summary>
              <p>
                Utilise l'onglet "Équipe" : un lien commun (SMS/WhatsApp) plus
                un code personnel à 4 chiffres par employé. Chacun peut au
                minimum scanner une carte pour ajouter un {pointLabel} ; tu
                choisis en plus, pour chaque employé, s'il voit la liste des
                clients, les statistiques, et/ou peut envoyer des campagnes.
                Désactive ou supprime un employé à tout moment pour couper son
                accès, sans toucher à celui des autres.
              </p>
            </details>
          </div>
        )}
        </div>
      </div>
      </div>
      {cropperFile && cropperTarget && (
        <LogoCropper file={cropperFile} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
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
  .dropzone {
    border: 1.5px dashed #c9c2dd;
    border-radius: 10px;
    padding: 16px 14px;
    text-align: center;
    cursor: pointer;
    background: #faf9fd;
    margin-bottom: 12px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .dropzone:hover {
    border-color: ${PURPLE};
  }
  .dropzone.drag-over {
    border-color: ${PURPLE};
    background: #f3ecff;
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
  .tiles-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 8px;
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
  .delta {
    display: inline-block;
    margin-top: 4px;
    font-size: 11px;
    font-weight: 700;
  }
  .delta.up { color: #1a7a3f; }
  .delta.down { color: #c0392b; }
  .delta.neutral { color: #8a8a8a; }
  .chart-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 18px 0 6px;
  }
  .chart {
    margin-bottom: 6px;
  }
  .chart-svg {
    width: 100%;
    height: 100px;
    display: block;
  }
  .chart-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
  }
  .chart-labels span {
    font-size: 9.5px;
    color: #a3a3a3;
    flex: 1;
    text-align: center;
    white-space: nowrap;
  }
  .chart-labels span.active {
    color: ${PURPLE};
    font-weight: 700;
  }
  .chart-tooltip {
    text-align: center;
    font-size: 11.5px;
    color: #333;
    margin-top: 4px;
    min-height: 16px;
  }
  .range-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }
  .range-selector button {
    width: auto;
    background: #fff;
    color: #595959;
    border: 1.5px solid #e0e0e0;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 20px;
  }
  .range-selector button.active {
    background: ${PURPLE};
    color: #fff;
    border-color: ${PURPLE};
  }
  .range-selector button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  /* --- Barre latérale (voir aussi la media query 900px+ en bas de ce
     fichier pour la version "vraie barre latérale fixe") --- */
  .dashboard {
    display: flex;
    flex-direction: column;
  }
  .dashboard-content {
    min-width: 0;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    margin-bottom: 16px;
    overflow: hidden;
  }
  .sb-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  .sb-brand:hover {
    background: #faf9fd;
  }
  .sb-logo {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    flex: none;
  }
  .sb-wordmark {
    font-size: 15px;
    font-weight: 800;
    color: ${PURPLE};
    letter-spacing: -0.01em;
  }
  .sb-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px 10px;
    border-bottom: 1px solid #ece9f5;
  }
  .sb-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: none;
    border: none;
    color: #8a8a8a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
  }
  .sb-icon-btn:hover {
    background: #f5f4fb;
    color: ${PURPLE};
  }
  .sb-nav {
    display: flex;
    flex-direction: row;
    gap: 4px;
    overflow-x: auto;
    padding: 10px;
  }
  .sb-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 999px;
    background: none;
    border: none;
    color: #595959;
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    flex: none;
  }
  .sb-item:hover {
    background: #faf9fd;
  }
  .sb-item.active {
    background: #f0eef8;
    color: ${PURPLE};
  }
  .sb-item-icon {
    display: flex;
    width: 18px;
    height: 18px;
    flex: none;
    align-items: center;
    justify-content: center;
  }
  .sb-section-label {
    display: none;
  }
  .sb-footer {
    display: none;
  }
  .icon-heading {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .tier-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .tier-row input[type="number"] {
    width: 70px;
    margin: 0;
    flex: none;
  }
  .tier-row input[type="text"] {
    flex: 1;
    margin: 0;
  }
  .tier-row button {
    width: auto;
    flex: none;
    background: #fde8e8;
    color: #a12b2b;
    padding: 8px 10px;
    font-size: 12px;
  }
  .tier-block {
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0eef7;
  }
  .suggest-wrap {
    position: relative;
  }
  .suggest-list {
    position: absolute;
    top: calc(100% - 8px);
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    z-index: 6;
    max-height: 220px;
    overflow-y: auto;
    margin-bottom: 12px;
  }
  .suggest-list button {
    display: block;
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
  .suggest-list button:hover {
    background: #f5f4fb;
  }
  .day-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }
  .day-chips button {
    width: auto;
    background: #fff;
    color: #a3a3a3;
    border: 1.5px solid #e0e0e0;
    padding: 8px 12px;
    font-size: 12.5px;
    font-weight: 700;
    border-radius: 8px;
    opacity: 0.75;
  }
  .day-chips button.active {
    background: ${PURPLE};
    color: #fff;
    border-color: ${PURPLE};
    opacity: 1;
    box-shadow: 0 2px 8px rgba(116, 20, 244, 0.35);
  }
  .day-chip-mark {
    display: inline-block;
  }
  .day-chips-summary {
    font-size: 12.5px;
    color: #595959;
    margin-bottom: 14px;
  }
  .time-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }
  .time-row input {
    margin: 0;
    flex: 1;
  }
  .time-row span {
    color: #8a8a8a;
    font-size: 13px;
  }
  .emp-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 12px;
    background: #faf9fd;
    border-radius: 10px;
    gap: 10px;
  }
  .emp-row.blocked {
    opacity: 0.55;
  }
  .perm-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .perm-badge {
    background: #e9e4f8;
    color: ${PURPLE};
    font-size: 10.5px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 99px;
  }
  .danger-btn {
    background: #fde8e8 !important;
    color: #a12b2b !important;
  }
  .color-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .color-row input[type="color"] {
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    margin: 0;
  }
  .color-row input[type="text"] {
    flex: 1;
    margin: 0;
  }
  .upload-row {
    margin-bottom: 14px;
  }
  .upload-preview {
    display: block;
    width: 100%;
    max-height: 120px;
    object-fit: contain;
    border-radius: 10px;
    background: #faf9fd;
    margin-bottom: 8px;
  }
  .link-box {
    background: #faf9fd;
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 12px;
    font-size: 12.5px;
    color: #333;
    word-break: break-all;
  }
  .faq-item {
    border-bottom: 1px solid #eee;
    padding: 10px 0;
  }
  .faq-item summary {
    cursor: pointer;
    font-weight: 700;
    font-size: 13.5px;
    color: #1a1a1a;
  }
  .faq-item p {
    margin: 8px 0 0;
    font-size: 13px;
    color: #595959;
    line-height: 1.5;
  }
  .share-banner {
    display: block;
    text-align: center;
    background: #f3f0fa;
    color: ${PURPLE};
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    margin-top: 16px;
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
  .legal-links {
    margin-top: 20px;
    font-size: 11.5px;
    color: #b3b3b3;
  }
  .legal-links :global(a) {
    color: #b3b3b3;
    text-decoration: underline;
  }
  .auth-logo {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    margin-bottom: 14px;
  }
  .auth-switch {
    margin-top: 16px;
    font-size: 13px;
    color: #595959;
    text-align: center;
  }
  .auth-choice {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 4px;
  }
  .auth-choice button {
    margin-top: 0;
  }
  .step-dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 18px;
  }
  .step-dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #e0dcee;
  }
  .step-dots span.active {
    background: ${PURPLE};
  }
  .signup-step {
    display: flex;
    flex-direction: column;
  }
  .signup-logo-row {
    margin-bottom: 6px;
  }
  .signup-nav-row {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .signup-nav-row button {
    width: auto;
    flex: 1;
    margin-top: 0;
  }
  .bubble-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  .bubble-chip {
    width: auto;
    background: #f3f0fa;
    color: ${PURPLE};
    border: 1.5px solid transparent;
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .bubble-chip.active {
    background: ${PURPLE};
    color: #fff;
  }
  .hours-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }
  .hours-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: #faf9fd;
    border-radius: 10px;
  }
  .hours-day {
    width: 78px;
    flex: none;
    font-size: 12.5px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .hours-closed-toggle {
    flex: none;
    font-size: 12px;
    margin-bottom: 0;
  }
  .hours-time-row {
    margin-bottom: 0;
    flex: 1;
    min-width: 150px;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .photo-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    background: #faf9fd;
  }
  .photo-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .photo-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
  }
  .photo-add {
    aspect-ratio: 1;
    border-radius: 10px;
    border: 1.5px dashed #c9c2dd;
    background: #faf9fd;
    color: ${PURPLE};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    width: 100%;
    margin-top: 0;
  }

  /* Logo de la fiche établissement (onglet Établissement) */
  .est-logo-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }
  .est-logo-preview {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    object-fit: cover;
    background: #faf9fd;
    flex: none;
  }
  .est-logo-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    background: ${PURPLE};
    color: #fff;
    font-size: 24px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .est-logo-row button.secondary {
    width: auto;
    margin-top: 0;
  }

  /* Recadreur de logo (modal partagé — voir LogoCropper) */
  .crop-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 10, 35, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    box-sizing: border-box;
  }
  .crop-modal {
    background: #fff;
    border-radius: 18px;
    padding: 20px;
    width: 100%;
    max-width: 340px;
    box-sizing: border-box;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  }
  .crop-modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .crop-modal-head h3 {
    margin: 0;
    font-size: 16px;
    color: #1a1a1a;
  }
  .crop-close {
    background: none;
    border: none;
    padding: 4px;
    color: #888;
    display: flex;
    cursor: pointer;
  }
  .crop-viewport {
    position: relative;
    width: 280px;
    max-width: 100%;
    height: 280px;
    margin: 0 auto;
    border-radius: 14px;
    overflow: hidden;
    background: #f0eef7;
    cursor: grab;
    touch-action: none;
  }
  .crop-viewport:active {
    cursor: grabbing;
  }
  .crop-img {
    position: absolute;
    top: 50%;
    left: 50%;
    max-width: none;
    user-select: none;
    pointer-events: none;
  }
  .crop-zoom {
    width: 100%;
    margin: 16px 0 4px;
  }
  .crop-actions {
    display: flex;
    gap: 10px;
    margin-top: 12px;
  }
  .crop-actions button {
    flex: 1;
    width: auto;
    margin-top: 0;
  }

  /* Changement de mot de passe (onglet Paramètres) */
  .pw-flow-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .pw-flow-actions button {
    width: auto;
    flex: 1;
    margin-top: 0;
  }

  /* Barre latérale + pleine largeur à partir de 900px : placé tout à la
     fin du fichier de styles exprès — ".page"/".wrap" ont aussi des
     règles de base plus haut avec la même spécificité (juste ".page"/
     ".wrap"), et en CSS c'est la règle la plus BASSE dans le fichier qui
     gagne à spécificité égale, peu importe qu'elle soit dans un @media ou
     non. Avant ce déplacement, les règles de base plus bas dans le
     fichier écrasaient silencieusement cette media query : la barre
     latérale semblait correcte (fixe, aucune règle de base ne la
     contredit) mais le contenu retombait sur la mise en page mobile
     (colonne centrée à 480px) même en grand écran. */
  @media (min-width: 900px) {
    .page {
      display: block;
      padding: 0;
    }
    .wrap {
      max-width: none;
      width: 100%;
      box-sizing: border-box;
      padding: 32px 40px 60px 276px;
    }
    .dashboard {
      display: block;
    }
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 236px;
      margin-bottom: 0;
      border-radius: 0;
      border-right: 1px solid #ece9f5;
      box-shadow: none;
      z-index: 6;
      transition: width 0.15s ease;
    }
    .sidebar.collapsed {
      width: 68px;
    }
    .wrap.sb-collapsed {
      padding-left: 108px;
    }
    .sb-brand {
      padding: 14px 16px;
    }
    .sb-topbar {
      padding: 4px 12px 12px;
    }
    .sidebar.collapsed .sb-topbar {
      justify-content: center;
      gap: 4px;
    }
    .sidebar.collapsed .sb-brand .sb-wordmark,
    .sidebar.collapsed .sb-topbar .sb-icon-btn:first-child {
      display: none;
    }
    .sb-nav {
      flex: 1;
      flex-direction: column;
      align-items: stretch;
      overflow-x: visible;
      overflow-y: auto;
      padding: 12px;
      gap: 2px;
    }
    .sb-item {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
    }
    .sidebar.collapsed .sb-item {
      justify-content: center;
      padding: 10px;
    }
    .sidebar.collapsed .sb-item-label,
    .sidebar.collapsed .sb-section-label,
    .sidebar.collapsed .sb-footer-text,
    .sidebar.collapsed .sb-footer-chevron {
      display: none;
    }
    .sb-section-label {
      display: block;
      margin: 18px 10px 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #a79fc4;
      text-transform: uppercase;
    }
    .sb-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-top: 1px solid #ece9f5;
    }
    .sidebar.collapsed .sb-footer {
      justify-content: center;
      padding: 14px 8px;
    }
    .sb-avatar {
      width: 30px;
      height: 30px;
      flex: none;
      border-radius: 50%;
      background: ${PURPLE};
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sb-footer-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .sb-footer-name {
      font-size: 12.5px;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sb-footer-role {
      font-size: 11px;
      color: #a3a3a3;
    }
    .sb-footer-chevron {
      flex: none;
      color: #a3a3a3;
      display: flex;
    }
    .dashboard-content {
      width: 100%;
      max-width: 1200px;
    }
    .card {
      width: 100%;
      box-sizing: border-box;
    }
  }
`;
