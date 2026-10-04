// lib/pricing.js
//
// Grille tarifaire partagée entre la page d'accueil marketing
// (pages/index.js, section "Tarifs") et l'assistant d'inscription
// (pages/commercant.js, étape "Tarification") — un seul endroit à modifier
// si les prix changent. Le palier "1 point de vente" est le tarif de base,
// à 49€/mois sans engagement — rester cohérent avec le tarif annoncé dans
// les CGV (pages/cgv.js, Article 4).

export const PRICING_TIERS = [
  {
    id: "1",
    label: "1 point de vente",
    desc: "Un seul établissement.",
    monthly: 49,
    price6: 35,
    priceYear: 29,
  },
  {
    id: "2-3",
    label: "2 à 3 points de vente",
    desc: "Plusieurs adresses, un seul compte.",
    monthly: 69,
    price6: 62,
    priceYear: 55,
  },
  {
    id: "4-6",
    label: "4 à 6 points de vente",
    desc: "Réseau de commerces ou franchise.",
    monthly: 99,
    price6: 89,
    priceYear: 79,
  },
  {
    id: "7+",
    label: "7 points de vente et plus",
    desc: "Tarif sur mesure — parlons-en ensemble.",
    monthly: null,
    price6: null,
    priceYear: null,
  },
];

export const BILLING_CYCLES = [
  { id: "mensuel", label: "Mensuel", priceKey: "monthly", suffix: "/mois" },
  { id: "6mois", label: "6 mois", priceKey: "price6", suffix: "/mois · engagement 6 mois" },
  { id: "annuel", label: "Annuel", priceKey: "priceYear", suffix: "/mois · engagement 1 an" },
];

export function getTierPrice(tier, billingCycle) {
  if (!tier) return null;
  const cycle = BILLING_CYCLES.find((c) => c.id === billingCycle) || BILLING_CYCLES[0];
  return tier[cycle.priceKey];
}

// Nombre de points de vente qu'une formule autorise à créer dans l'onglet
// "Points de vente" (voir lib/db.js: addLocation) — `null` = pas de
// limite technique (formule "7+", sur devis, pas de vrai palier chiffré).
// Un garde-fou, pas une mesure de sécurité : rien n'empêche techniquement
// un compte de mentir sur sa formule, exactement comme le reste du
// système de facturation (voir CGV, article 4 — le Client déclare son
// nombre réel de points de vente, vérifiable et facturable a posteriori).
const LOCATION_LIMITS = { "1": 1, "2-3": 3, "4-6": 6, "7+": null };

export function getLocationLimit(tierId) {
  return tierId in LOCATION_LIMITS ? LOCATION_LIMITS[tierId] : 1;
}

// Couleurs prédéfinies pour la carte de fidélité (étape "Mécanique de
// fidélité" de l'inscription).
export const CARD_COLOR_PRESETS = [
  "#16A69C",
  "#7C3AED",
  "#F97316",
  "#DC2626",
  "#111827",
  "#2563EB",
  "#DB2777",
  "#16A34A",
];
