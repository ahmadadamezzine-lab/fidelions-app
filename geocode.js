// lib/geocode.js
//
// Convertit une adresse texte (ex : "12 rue de Metz, Toulouse") en
// latitude/longitude via Nominatim (OpenStreetMap) — gratuit, sans clé,
// sans compte à créer. Utilisé pour les notifications de proximité : on
// géocode une fois l'adresse du commerçant, puis on donne ces coordonnées
// à Google Wallet (voir patchLoyaltyClassLocations dans lib/walletObjects.js)
// qui se charge lui-même d'envoyer une vraie notification native quand un
// client équipé s'approche.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(address) {
  const query = (address || "").trim();
  if (!query) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      // La politique d'usage de Nominatim demande un User-Agent
      // identifiable — sans ça certaines requêtes sont silencieusement
      // limitées ou bloquées.
      "User-Agent": "Fidelions-App/1.0 (contact: ahmadadamezzine@gmail.com)",
    },
  });

  if (!res.ok) {
    throw new Error(`Géocodage impossible pour le moment (erreur ${res.status}).`);
  }

  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const best = results[0];
  const lat = parseFloat(best.lat);
  const lng = parseFloat(best.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, displayName: best.display_name || query };
}
