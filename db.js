// lib/db.js
//
// Petite base de données (Upstash Redis, gratuit) qui mémorise chaque
// client, ses tampons, et les parrainages. Sans ça, les cartes Wallet
// restent bloquées à 0 tampon pour toujours — c'est ce qui rend la
// fidélité "vivante".

import { Redis } from "@upstash/redis";

// Pour l'instant un seul restaurant (le tien, en test). Le jour où tu
// as plusieurs restaurants clients, chacun aura son propre restaurantId.
const RESTAURANT_ID = "demo";

// Valeurs de départ tant que le commerçant n'a rien réglé lui-même
// (voir getSettings/updateSettings plus bas — réglable depuis /commercant).
export const DEFAULT_REWARD_THRESHOLD = 10;
export const DEFAULT_REWARD_LABEL = "Récompense fidélité";

let redis = null;
function getRedis() {
  if (!redis) {
    const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
    const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
    if (!url || !token) {
      throw new Error(
        "Base de données non configurée : il manque KV_REST_API_URL / KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) dans les variables d'environnement Vercel."
      );
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

function shortCode(len = 6) {
  // Alphabet sans caractères ambigus (0/O, 1/I, etc.) pour un code facile
  // à lire et à retaper à la main si besoin.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Crée l'enregistrement d'un nouveau client. Si un code de parrainage
 * valide est fourni, le nouveau client démarre avec 1 tampon bonus et
 * le parrain est retourné (pour qu'on lui ajoute aussi son tampon).
 */
export async function createClient({ objectId, prenom, email, telephone, referredByCode }) {
  const redis = getRedis();

  let referredByObjectId = null;
  if (referredByCode) {
    referredByObjectId = await redis.get(`referral:${referredByCode.trim().toUpperCase()}`);
  }

  const referralCode = shortCode();
  const record = {
    objectId,
    prenom: prenom || "Client",
    email: (email || "").trim() || null,
    telephone: (telephone || "").trim() || null,
    points: referredByObjectId ? 1 : 0,
    restaurantId: RESTAURANT_ID,
    referralCode,
    referredBy: referredByObjectId || null,
    createdAt: Date.now(),
  };

  await redis.set(`client:${objectId}`, record);
  await redis.set(`referral:${referralCode}`, objectId);
  await redis.sadd(`clients:${RESTAURANT_ID}`, objectId);

  return { record, referredByObjectId };
}

export async function getClient(objectId) {
  const redis = getRedis();
  return redis.get(`client:${objectId}`);
}

/**
 * Ajoute (ou retire, avec un delta négatif) des tampons à un client.
 * Retourne l'enregistrement mis à jour, ou null si le client est inconnu.
 */
export async function addPoints(objectId, delta = 1) {
  const redis = getRedis();
  const record = await redis.get(`client:${objectId}`);
  if (!record) return null;
  record.points = Math.max(0, (record.points || 0) + delta);
  record.lastVisitAt = Date.now();
  await redis.set(`client:${objectId}`, record);
  return record;
}

/**
 * Retrouve un client à partir d'un prénom (recherche approximative,
 * utilisée par le commerçant quand le scan QR n'est pas possible).
 */
export async function findClientsByName(query) {
  const all = await listClients();
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return all.filter((c) => c.prenom.toLowerCase().includes(q));
}

/**
 * Réglages propres au restaurant : combien de tampons avant la
 * récompense, et ce que le client gagne (ex : "1 café offert"). Modifiable
 * par le commerçant depuis /commercant, sans toucher au code.
 */
export async function getSettings() {
  const redis = getRedis();
  const settings = await redis.get(`settings:${RESTAURANT_ID}`);
  return {
    rewardThreshold:
      settings && Number(settings.rewardThreshold) > 0
        ? Math.round(Number(settings.rewardThreshold))
        : DEFAULT_REWARD_THRESHOLD,
    rewardLabel: (settings && settings.rewardLabel) || DEFAULT_REWARD_LABEL,
  };
}

export async function updateSettings({ rewardThreshold, rewardLabel }) {
  const redis = getRedis();
  const current = await getSettings();
  const next = {
    rewardThreshold:
      Number(rewardThreshold) > 0 ? Math.round(Number(rewardThreshold)) : current.rewardThreshold,
    rewardLabel: (rewardLabel || "").trim() || current.rewardLabel,
  };
  await redis.set(`settings:${RESTAURANT_ID}`, next);
  return next;
}

export async function listClients() {
  const redis = getRedis();
  const ids = await redis.smembers(`clients:${RESTAURANT_ID}`);
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => redis.get(`client:${id}`)));
  return records
    .filter(Boolean)
    .sort((a, b) => (b.lastVisitAt || b.createdAt) - (a.lastVisitAt || a.createdAt));
}

/**
 * Gestion d'un client depuis l'espace commerçant : renommer (corrige une
 * faute ou un test), bloquer/débloquer (grisé, exclu des stats/campagnes
 * mais gardé pour trace), ou supprimer définitivement (ex : les fiches de
 * test créées pendant le développement).
 */
export async function renameClient(objectId, newPrenom) {
  const redis = getRedis();
  const record = await redis.get(`client:${objectId}`);
  if (!record) return null;
  record.prenom = (newPrenom || "").trim() || record.prenom;
  await redis.set(`client:${objectId}`, record);
  return record;
}

export async function setClientBlocked(objectId, blocked) {
  const redis = getRedis();
  const record = await redis.get(`client:${objectId}`);
  if (!record) return null;
  record.blocked = !!blocked;
  await redis.set(`client:${objectId}`, record);
  return record;
}

export async function deleteClient(objectId) {
  const redis = getRedis();
  const record = await redis.get(`client:${objectId}`);
  if (!record) return false;
  await redis.del(`client:${objectId}`);
  await redis.srem(`clients:${RESTAURANT_ID}`, objectId);
  if (record.referralCode) {
    await redis.del(`referral:${record.referralCode}`);
  }
  return true;
}

/**
 * Menu du restaurant : collé/écrit une fois par le commerçant, réutilisé
 * pour générer des suggestions de promotions (voir analyzeMenu côté
 * frontend). Stocké tel quel, en texte brut — pas de parsing ici.
 */
export async function getMenuText() {
  const redis = getRedis();
  const stored = await redis.get(`menu:${RESTAURANT_ID}`);
  return (stored && stored.menuText) || "";
}

export async function saveMenuText(menuText) {
  const redis = getRedis();
  const clean = (menuText || "").slice(0, 8000);
  await redis.set(`menu:${RESTAURANT_ID}`, { menuText: clean, updatedAt: Date.now() });
  return clean;
}

/**
 * "Offre" du commerçant : texte librement modifiable depuis /commercant.
 * Peut être pré-rempli avec des suggestions générées par l'IA, mais le
 * commerçant peut tout réécrire à sa façon — c'est ce texte-là qui compte,
 * pas une sortie figée de l'analyse.
 */
export async function getOfferText() {
  const redis = getRedis();
  const stored = await redis.get(`offer:${RESTAURANT_ID}`);
  return (stored && stored.offerText) || "";
}

export async function saveOfferText(offerText) {
  const redis = getRedis();
  const clean = (offerText || "").slice(0, 2000);
  await redis.set(`offer:${RESTAURANT_ID}`, { offerText: clean, updatedAt: Date.now() });
  return clean;
}
