// lib/geocode.js
//
// Convertit une adresse texte (ex : "12 rue de Metz, Toulouse") en
// latitude/longitude via l'API Adresse du gouvernement français (Base
// Adresse Nationale) — gratuite, sans clé, sans compte à créer, et pensée
// spécifiquement pour l'autocomplétion d'adresses françaises (c'est la
// même API qui alimente le champ de recherche côté commerçant, voir
// pages/commercant.js). Utilisé pour les notifications de proximité : on
// géocode une fois l'adresse du commerçant, puis on donne ces coordonnées
// à Google Wallet (voir patchLoyaltyClassLocations dans lib/walletObjects.js)
// qui se charge lui-même d'envoyer une vraie notification native quand un
// client équipé s'approche.

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";

export async function geocodeAddress(address) {
  const query = (address || "").trim();
  if (!query) return null;

  const url = `${BAN_URL}?q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Géocodage impossible pour le moment (erreur ${res.status}).`);
  }

  const data = await res.json();
  const best = data.features && data.features[0];
  if (!best) return null;

  const coords = best.geometry && best.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, displayName: (best.properties && best.properties.label) || query };
}
