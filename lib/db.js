// lib/db.js
//
// Petite base de données (Upstash Redis, gratuit) qui mémorise chaque
// commerçant (compte), chaque client, ses tampons, et les parrainages.
// Sans ça, les cartes Wallet restent bloquées à 0 tampon pour toujours —
// c'est ce qui rend la fidélité "vivante".
//
// Depuis le passage à plusieurs restaurants clients sur un seul site
// (chacun crée son propre compte au lieu d'un site dédié par restaurant),
// PRESQUE toutes les fonctions ci-dessous prennent un `merchantId` en
// premier argument : c'est ce qui isole les données d'un restaurant de
// celles d'un autre dans la même base Redis. Les fiches clients
// (`client:${objectId}`) restent stockées à plat par identifiant unique
// (déjà un UUID, pas de risque de collision) mais portent un champ
// `restaurantId` vérifié à chaque lecture/écriture (voir
// `getOwnedClientRecord` plus bas) : impossible pour un restaurant
// d'accéder, même par erreur, à la fiche d'un client d'un autre
// restaurant.

import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import { hashPassword, verifyPassword } from "./password";

// Valeurs de départ tant que le commerçant n'a rien réglé lui-même
// (voir getSettings/updateSettings plus bas — réglable depuis /commercant).
export const DEFAULT_REWARD_THRESHOLD = 10;
export const DEFAULT_REWARD_LABEL = "Récompense fidélité";

const MAX_EVENTS = 5000;
const ALL_DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

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

// ---------------------------------------------------------------------
// Comptes commerçants
// ---------------------------------------------------------------------

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

/**
 * Dérive un identifiant d'URL lisible ("le-bistrot-du-coin") à partir du
 * nom du restaurant, sans accents ni caractères spéciaux. C'est ce qui
 * apparaît dans le lien d'inscription client (/r/le-bistrot-du-coin) — pas
 * un identifiant technique illisible.
 */
function slugify(text) {
  const base = (text || "restaurant")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents (marques diacritiques après normalisation NFD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "restaurant";
}

async function findAvailableSlug(base) {
  const redis = getRedis();
  let slug = base;
  let attempt = 1;
  while (await redis.get(`merchant-by-slug:${slug}`)) {
    attempt++;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

/**
 * Crée un nouveau compte commerçant. Le mot de passe est haché avant
 * stockage (jamais en clair — voir lib/password.js). L'email sert
 * d'identifiant de connexion (unique) ; le slug sert au lien public
 * d'inscription client (unique aussi, dérivé du nom, avec un suffixe
 * numérique en cas de doublon).
 */
export async function createMerchant({ email, password, restaurantName }) {
  const redis = getRedis();
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Adresse email invalide.");
  }
  if (!password || password.length < 8) {
    throw new Error("Le mot de passe doit faire au moins 8 caractères.");
  }
  const cleanName = (restaurantName || "").trim().slice(0, 60);
  if (!cleanName) {
    throw new Error("Le nom du restaurant est obligatoire.");
  }

  const existing = await redis.get(`merchant-by-email:${cleanEmail}`);
  if (existing) {
    throw new Error("Un compte existe déjà avec cet email.");
  }

  const id = uuidv4();
  const slug = await findAvailableSlug(slugify(cleanName));
  const passwordHash = await hashPassword(password);

  const record = {
    id,
    email: cleanEmail,
    passwordHash,
    restaurantName: cleanName,
    slug,
    walletClassId: null, // rempli juste après par setMerchantWalletClassId
    createdAt: Date.now(),
  };

  await redis.set(`merchant:${id}`, record);
  await redis.set(`merchant-by-email:${cleanEmail}`, id);
  await redis.set(`merchant-by-slug:${slug}`, id);

  return record;
}

export async function getMerchantById(id) {
  if (!id) return null;
  const redis = getRedis();
  return (await redis.get(`merchant:${id}`)) || null;
}

export async function getMerchantByEmail(email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;
  const redis = getRedis();
  const id = await redis.get(`merchant-by-email:${cleanEmail}`);
  if (!id) return null;
  return getMerchantById(id);
}

export async function getMerchantBySlug(slug) {
  const cleanSlug = (slug || "").trim().toLowerCase();
  if (!cleanSlug) return null;
  const redis = getRedis();
  const id = await redis.get(`merchant-by-slug:${cleanSlug}`);
  if (!id) return null;
  return getMerchantById(id);
}

/** Vérifie l'email/mot de passe d'une tentative de connexion. */
export async function verifyMerchantLogin(email, password) {
  const merchant = await getMerchantByEmail(email);
  if (!merchant) return null;
  const ok = await verifyPassword(password, merchant.passwordHash);
  return ok ? merchant : null;
}

/** Enregistre l'identifiant de la classe Google Wallet créée pour ce commerçant. */
export async function setMerchantWalletClassId(merchantId, walletClassId) {
  const redis = getRedis();
  const merchant = await getMerchantById(merchantId);
  if (!merchant) throw new Error("Compte commerçant introuvable.");
  merchant.walletClassId = walletClassId;
  await redis.set(`merchant:${merchantId}`, merchant);
  return merchant;
}

/**
 * Supprime un compte commerçant — utilisé UNIQUEMENT pour annuler une
 * inscription qui a échoué en cours de route (ex : le compte est créé
 * mais la classe Google Wallet associée n'a pas pu l'être), pour que
 * l'email redevienne disponible à une nouvelle tentative plutôt que de
 * rester bloqué sur un compte à moitié créé. Ne supprime pas les données
 * (clients, etc.) : n'a de sens qu'un compte tout juste créé et vide.
 */
export async function deleteMerchantAccount(merchantId) {
  const redis = getRedis();
  const merchant = await getMerchantById(merchantId);
  if (!merchant) return;
  await redis.del(`merchant:${merchantId}`);
  await redis.del(`merchant-by-email:${merchant.email}`);
  await redis.del(`merchant-by-slug:${merchant.slug}`);
}

/**
 * Migration à USAGE UNIQUE (voir pages/api/migrate-demo.js) : convertit les
 * données créées avant le passage multi-comptes — toutes stockées sous les
 * clés `*:demo` avec l'ancien système mono-restaurant — en un vrai premier
 * compte commerçant. On force l'id à "demo" (au lieu d'un uuid généré),
 * pour que clients, réglages, équipe, personnalisation, etc. déjà en base
 * restent attachés automatiquement, sans rien copier ni migrer clé par
 * clé. Refuse de s'exécuter si un compte "demo" existe déjà.
 */
export async function migrateLegacyDemoAccount({ email, password, restaurantName, walletClassId }) {
  const redis = getRedis();

  const already = await redis.get("merchant:demo");
  if (already) {
    throw new Error("Le compte demo existe déjà — migration déjà effectuée.");
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Adresse email invalide.");
  }
  if (!password || password.length < 8) {
    throw new Error("Le mot de passe doit faire au moins 8 caractères.");
  }
  const cleanName = (restaurantName || "").trim().slice(0, 60);
  if (!cleanName) {
    throw new Error("Le nom du restaurant est obligatoire.");
  }
  if (!walletClassId) {
    throw new Error("walletClassId manquant.");
  }

  const existingEmail = await redis.get(`merchant-by-email:${cleanEmail}`);
  if (existingEmail) {
    throw new Error("Un compte existe déjà avec cet email.");
  }

  const slug = await findAvailableSlug(slugify(cleanName) || "demo");
  const passwordHash = await hashPassword(password);

  const record = {
    id: "demo",
    email: cleanEmail,
    passwordHash,
    restaurantName: cleanName,
    slug,
    walletClassId,
    createdAt: Date.now(),
  };

  await redis.set("merchant:demo", record);
  await redis.set(`merchant-by-email:${cleanEmail}`, "demo");
  await redis.set(`merchant-by-slug:${slug}`, "demo");

  return record;
}

// ---------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------

/**
 * Lit une fiche client ET vérifie qu'elle appartient bien à ce
 * `merchantId` — centralisé ici pour que toute fonction qui passe par ce
 * helper isole automatiquement les restaurants entre eux, même si
 * l'`objectId` fourni (par ex. depuis une requête API) appartient en
 * réalité à un autre restaurant.
 */
async function getOwnedClientRecord(redis, merchantId, objectId) {
  if (!merchantId || !objectId) return null;
  const record = await redis.get(`client:${objectId}`);
  if (!record || record.restaurantId !== merchantId) return null;
  return record;
}

/**
 * Crée l'enregistrement d'un nouveau client. Si un code de parrainage
 * valide est fourni, le nouveau client démarre avec 1 tampon bonus et
 * le parrain est retourné (pour qu'on lui ajoute aussi son tampon). Le
 * code de parrainage est propre à CE restaurant (deux restaurants peuvent
 * avoir chacun un client avec le même code sans conflit).
 */
export async function createClient({ merchantId, objectId, prenom, email, telephone, referredByCode }) {
  const redis = getRedis();

  let referredByObjectId = null;
  if (referredByCode) {
    referredByObjectId = await redis.get(`referral:${merchantId}:${referredByCode.trim().toUpperCase()}`);
  }

  const referralCode = shortCode();
  const record = {
    objectId,
    prenom: prenom || "Client",
    email: (email || "").trim() || null,
    telephone: (telephone || "").trim() || null,
    points: referredByObjectId ? 1 : 0,
    restaurantId: merchantId,
    referralCode,
    referredBy: referredByObjectId || null,
    createdAt: Date.now(),
  };

  await redis.set(`client:${objectId}`, record);
  await redis.set(`referral:${merchantId}:${referralCode}`, objectId);
  await redis.sadd(`clients:${merchantId}`, objectId);

  return { record, referredByObjectId };
}

export async function getClient(merchantId, objectId) {
  const redis = getRedis();
  return getOwnedClientRecord(redis, merchantId, objectId);
}

/**
 * Ajoute (ou retire, avec un delta négatif) des tampons à un client.
 * Retourne l'enregistrement mis à jour, ou null si le client est inconnu
 * (ou n'appartient pas à ce restaurant).
 */
export async function addPoints(merchantId, objectId, delta = 1) {
  const redis = getRedis();
  const record = await getOwnedClientRecord(redis, merchantId, objectId);
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
export async function findClientsByName(merchantId, query) {
  const all = await listClients(merchantId);
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return all.filter((c) => c.prenom.toLowerCase().includes(q));
}

/**
 * Réglages propres au restaurant : combien de tampons avant la
 * récompense, et ce que le client gagne (ex : "1 café offert"). Modifiable
 * par le commerçant depuis /commercant, sans toucher au code.
 */
export async function getSettings(merchantId) {
  const redis = getRedis();
  const settings = await redis.get(`settings:${merchantId}`);
  return {
    rewardThreshold:
      settings && Number(settings.rewardThreshold) > 0
        ? Math.round(Number(settings.rewardThreshold))
        : DEFAULT_REWARD_THRESHOLD,
    rewardLabel: (settings && settings.rewardLabel) || DEFAULT_REWARD_LABEL,
  };
}

export async function updateSettings(merchantId, { rewardThreshold, rewardLabel }) {
  const redis = getRedis();
  const current = await getSettings(merchantId);
  const next = {
    rewardThreshold:
      Number(rewardThreshold) > 0 ? Math.round(Number(rewardThreshold)) : current.rewardThreshold,
    rewardLabel: (rewardLabel || "").trim() || current.rewardLabel,
  };
  await redis.set(`settings:${merchantId}`, next);
  return next;
}

export async function listClients(merchantId) {
  const redis = getRedis();
  const ids = await redis.smembers(`clients:${merchantId}`);
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
export async function renameClient(merchantId, objectId, newPrenom) {
  const redis = getRedis();
  const record = await getOwnedClientRecord(redis, merchantId, objectId);
  if (!record) return null;
  record.prenom = (newPrenom || "").trim() || record.prenom;
  await redis.set(`client:${objectId}`, record);
  return record;
}

export async function setClientBlocked(merchantId, objectId, blocked) {
  const redis = getRedis();
  const record = await getOwnedClientRecord(redis, merchantId, objectId);
  if (!record) return null;
  record.blocked = !!blocked;
  await redis.set(`client:${objectId}`, record);
  return record;
}

export async function deleteClient(merchantId, objectId) {
  const redis = getRedis();
  const record = await getOwnedClientRecord(redis, merchantId, objectId);
  if (!record) return false;
  await redis.del(`client:${objectId}`);
  await redis.srem(`clients:${merchantId}`, objectId);
  if (record.referralCode) {
    await redis.del(`referral:${merchantId}:${record.referralCode}`);
  }
  return true;
}

/**
 * Menu du restaurant : collé/écrit une fois par le commerçant, réutilisé
 * pour générer des suggestions de promotions (voir analyzeMenu côté
 * frontend). Stocké tel quel, en texte brut — pas de parsing ici.
 */
export async function getMenuText(merchantId) {
  const redis = getRedis();
  const stored = await redis.get(`menu:${merchantId}`);
  return (stored && stored.menuText) || "";
}

export async function saveMenuText(merchantId, menuText) {
  const redis = getRedis();
  const clean = (menuText || "").slice(0, 8000);
  await redis.set(`menu:${merchantId}`, { menuText: clean, updatedAt: Date.now() });
  return clean;
}

/**
 * "Offre" du commerçant : texte librement modifiable depuis /commercant.
 * Peut être pré-rempli avec des suggestions générées par l'IA, mais le
 * commerçant peut tout réécrire à sa façon — c'est ce texte-là qui compte,
 * pas une sortie figée de l'analyse.
 */
export async function getOfferText(merchantId) {
  const redis = getRedis();
  const stored = await redis.get(`offer:${merchantId}`);
  return (stored && stored.offerText) || "";
}

export async function saveOfferText(merchantId, offerText) {
  const redis = getRedis();
  const clean = (offerText || "").slice(0, 2000);
  await redis.set(`offer:${merchantId}`, { offerText: clean, updatedAt: Date.now() });
  return clean;
}

/**
 * Type de fidélité choisi par le commerçant :
 * - "tampons" : carte classique, un seul seuil (comportement historique).
 * - "points"  : points cumulés à paliers multiples (comme Sydely).
 *
 * On stocke tout dans le même objet `settings:${merchantId}` que
 * getSettings/updateSettings (au-dessus) pour ne rien casser du code
 * existant qui lit encore rewardThreshold/rewardLabel : ces deux champs
 * restent synchronisés sur le premier palier.
 */
export async function getLoyaltySettings(merchantId) {
  const redis = getRedis();
  const settings = await redis.get(`settings:${merchantId}`);
  const type = settings && settings.type === "points" ? "points" : "tampons";
  const tiers =
    Array.isArray(settings && settings.tiers) && settings.tiers.length > 0
      ? settings.tiers
      : [
          {
            threshold:
              settings && Number(settings.rewardThreshold) > 0
                ? Math.round(Number(settings.rewardThreshold))
                : DEFAULT_REWARD_THRESHOLD,
            label: (settings && settings.rewardLabel) || DEFAULT_REWARD_LABEL,
          },
        ];
  return { type, tiers };
}

export async function updateLoyaltySettings(merchantId, { type, tiers }) {
  const redis = getRedis();
  const current = (await redis.get(`settings:${merchantId}`)) || {};
  const nextType = type === "points" ? "points" : "tampons";
  const cleanTiers =
    Array.isArray(tiers) && tiers.length > 0
      ? tiers
          .map((t) => ({
            threshold: Math.max(1, Math.round(Number(t.threshold) || 0)),
            label: (t.label || "").trim() || "Récompense",
          }))
          .filter((t) => t.threshold > 0)
          .sort((a, b) => a.threshold - b.threshold)
      : current.tiers && current.tiers.length > 0
      ? current.tiers
      : [{ threshold: DEFAULT_REWARD_THRESHOLD, label: DEFAULT_REWARD_LABEL }];

  const next = {
    ...current,
    type: nextType,
    tiers: cleanTiers,
    rewardThreshold: cleanTiers[0].threshold,
    rewardLabel: cleanTiers[0].label,
  };
  await redis.set(`settings:${merchantId}`, next);
  return { type: next.type, tiers: next.tiers };
}

/**
 * Marque des paliers "points" comme débloqués sur la fiche d'un client,
 * pour qu'un palier déjà atteint ne redéclenche jamais la récompense
 * (voir computePointsRewards dans lib/loyalty.js).
 */
export async function markTiersUnlocked(merchantId, objectId, indexes) {
  const redis = getRedis();
  const record = await getOwnedClientRecord(redis, merchantId, objectId);
  if (!record) return null;
  const current = new Set(record.unlockedTiers || []);
  for (const i of indexes || []) current.add(i);
  record.unlockedTiers = Array.from(current).sort((a, b) => a - b);
  await redis.set(`client:${objectId}`, record);
  return record;
}

/**
 * Journal des passages : chaque ajout de tampon/point est loggé ici avec
 * son horodatage, pour calculer les graphes de la page Statistiques
 * (lib/stats.js) sans avoir à recalculer à partir des fiches clients, qui
 * ne gardent que le dernier passage.
 */
export async function logStampEvent(merchantId, { objectId, delta, rewardReached }) {
  const redis = getRedis();
  await redis.lpush(`events:${merchantId}`, {
    at: Date.now(),
    objectId,
    delta: delta || 0,
    rewardReached: !!rewardReached,
  });
  await redis.ltrim(`events:${merchantId}`, 0, MAX_EVENTS - 1);
}

export async function getRecentEvents(merchantId, limit = MAX_EVENTS) {
  const redis = getRedis();
  const raw = await redis.lrange(`events:${merchantId}`, 0, limit - 1);
  return raw || [];
}

// ---------------------------------------------------------------------
// Lien "employé" partagé + équipe
// ---------------------------------------------------------------------

/**
 * Lien "employé" : un token à part (pas le mot de passe du compte) qui
 * donne un accès volontairement très restreint — uniquement le scan QR,
 * sans liste ni recherche de clients (voir getRoleAsync dans lib/auth.js).
 * Régénérable à tout moment par le commerçant, ce qui invalide l'ancien
 * lien (utile si un employé part). Le token est unique tous restaurants
 * confondus (c'est lui qui permet de retrouver le bon restaurant quand un
 * employé ouvre /scan/[token], sans rien connaître d'autre) — voir
 * `getMerchantIdForEmployeeToken` ci-dessous pour la recherche inverse.
 */
export async function getEmployeeLinkToken(merchantId) {
  const redis = getRedis();
  const existing = await redis.get(`employee-token:${merchantId}`);
  if (existing) return existing;
  return regenerateEmployeeLinkToken(merchantId);
}

export async function regenerateEmployeeLinkToken(merchantId) {
  const redis = getRedis();
  const old = await redis.get(`employee-token:${merchantId}`);
  if (old) {
    await redis.del(`employee-token-owner:${old}`);
  }
  const token = shortCode(10);
  await redis.set(`employee-token:${merchantId}`, token);
  await redis.set(`employee-token-owner:${token}`, merchantId);
  return token;
}

/** Recherche inverse : à quel restaurant appartient ce token de lien employé ? */
export async function getMerchantIdForEmployeeToken(token) {
  if (!token) return null;
  const redis = getRedis();
  return (await redis.get(`employee-token-owner:${token}`)) || null;
}

/**
 * Équipe : chaque employé a un prénom (juste pour l'affichage côté
 * commerçant), un code à 4 chiffres (c'est lui qui l'identifie quand il
 * ouvre le lien partagé /scan/[token]), des jours d'accès, une plage
 * horaire optionnelle, et des permissions par rubrique — pensé pour
 * plusieurs employés avec des niveaux de responsabilité différents. Le
 * code à 4 chiffres n'a besoin d'être unique QUE dans l'équipe d'un même
 * restaurant (deux restaurants différents peuvent avoir chacun un employé
 * avec le code "1234" sans aucun conflit, le lien lui-même identifie déjà
 * le restaurant).
 */
export async function getEmployees(merchantId) {
  const redis = getRedis();
  const list = await redis.get(`employees:${merchantId}`);
  return Array.isArray(list) ? list : [];
}

function cleanEmployee(input, existing) {
  const pin = /^[0-9]{4}$/.test(input.pin || "") ? input.pin : existing ? existing.pin : null;
  const days =
    Array.isArray(input.days) && input.days.length > 0
      ? input.days.filter((d) => ALL_DAYS.includes(d))
      : ALL_DAYS;
  return {
    id: (existing && existing.id) || input.id || shortCode(8),
    name: (input.name || "").trim().slice(0, 40) || "Employé",
    pin,
    active: input.active !== undefined ? !!input.active : existing ? existing.active : true,
    days: days.length > 0 ? days : ALL_DAYS,
    startTime: input.startTime || null, // ex "09:00", ou null = pas de restriction d'horaire
    endTime: input.endTime || null,
    permissions: {
      scan: true, // toujours autorisé — c'est le minimum du lien employé
      clients: !!(input.permissions && input.permissions.clients),
      stats: !!(input.permissions && input.permissions.stats),
      campagnes: !!(input.permissions && input.permissions.campagnes),
    },
  };
}

/**
 * Crée ou met à jour un employé (si `input.id` correspond à un employé
 * existant). Renvoie l'employé enregistré, avec son code — c'est la seule
 * fonction qui doit servir à écrire dans la liste, pour ne jamais perdre
 * un code déjà attribué par erreur de saisie.
 */
export async function upsertEmployee(merchantId, input) {
  const list = await getEmployees(merchantId);
  const idx = input.id ? list.findIndex((e) => e.id === input.id) : -1;
  const existing = idx >= 0 ? list[idx] : null;
  const clean = cleanEmployee(input, existing);
  if (!clean.pin) {
    throw new Error("Code à 4 chiffres manquant ou invalide.");
  }
  if (idx >= 0) {
    list[idx] = clean;
  } else {
    list.push(clean);
  }
  const redis = getRedis();
  await redis.set(`employees:${merchantId}`, list);
  return clean;
}

export async function deleteEmployee(merchantId, id) {
  const list = await getEmployees(merchantId);
  const next = list.filter((e) => e.id !== id);
  const redis = getRedis();
  await redis.set(`employees:${merchantId}`, next);
  return next;
}

function isWithinSchedule(employee) {
  const now = new Date();
  const dayNames = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  const today = dayNames[now.getDay()];
  if (Array.isArray(employee.days) && employee.days.length > 0 && !employee.days.includes(today)) {
    return false;
  }
  if (employee.startTime && employee.endTime) {
    const [sh, sm] = employee.startTime.split(":").map(Number);
    const [eh, em] = employee.endTime.split(":").map(Number);
    if (Number.isFinite(sh) && Number.isFinite(eh)) {
      const startMin = sh * 60 + (sm || 0);
      const endMin = eh * 60 + (em || 0);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin < startMin || nowMin > endMin) return false;
    }
  }
  return true;
}

/**
 * Retrouve l'employé actif dont le code correspond, ET dont l'horaire
 * autorisé couvre l'instant présent. Un code qui existe mais hors-horaire
 * (ou désactivé) est traité comme invalide — c'est voulu : l'accès doit
 * réellement se couper, pas juste s'afficher grisé.
 */
export async function findEmployeeByPin(merchantId, pin) {
  if (!/^[0-9]{4}$/.test(pin || "")) return null;
  const list = await getEmployees(merchantId);
  const match = list.find((e) => e.pin === pin && e.active);
  if (!match) return null;
  if (!isWithinSchedule(match)) return null;
  return match;
}

// ---------------------------------------------------------------------
// Personnalisation de la carte + géolocalisation
// ---------------------------------------------------------------------

/**
 * Personnalisation de la carte (couleur, logo, bannière). Les URLs pointent
 * vers des fichiers hébergés sur Vercel Blob (voir lib/blob.js) — Google
 * Wallet exige une vraie URL publique, pas un fichier envoyé tel quel.
 */
export async function getBranding(merchantId) {
  const redis = getRedis();
  const stored = await redis.get(`branding:${merchantId}`);
  return {
    hexColor: (stored && stored.hexColor) || "#7414F4",
    logoUrl: (stored && stored.logoUrl) || null,
    bannerUrl: (stored && stored.bannerUrl) || null,
  };
}

export async function saveBranding(merchantId, { hexColor, logoUrl, bannerUrl }) {
  const redis = getRedis();
  const current = await getBranding(merchantId);
  const next = {
    hexColor: (hexColor || "").trim() || current.hexColor,
    logoUrl: logoUrl !== undefined ? logoUrl : current.logoUrl,
    bannerUrl: bannerUrl !== undefined ? bannerUrl : current.bannerUrl,
  };
  await redis.set(`branding:${merchantId}`, next);
  return next;
}

/**
 * Notifications de proximité : adresse géocodée (lib/geocode.js) puis
 * envoyée à Google Wallet (patchLoyaltyClassLocations) pour déclencher une
 * vraie notification native quand un client équipé s'approche.
 */
export async function getGeoSettings(merchantId) {
  const redis = getRedis();
  const stored = await redis.get(`geo:${merchantId}`);
  return {
    enabled: !!(stored && stored.enabled),
    address: (stored && stored.address) || "",
    lat: (stored && stored.lat) || null,
    lng: (stored && stored.lng) || null,
    message: (stored && stored.message) || "On a hâte de vous voir ! Passez nous dire bonjour 👋",
  };
}

export async function saveGeoSettings(merchantId, { enabled, address, lat, lng, message }) {
  const redis = getRedis();
  const current = await getGeoSettings(merchantId);
  const next = {
    enabled: enabled !== undefined ? !!enabled : current.enabled,
    address: address !== undefined ? (address || "").trim() : current.address,
    lat: lat !== undefined ? lat : current.lat,
    lng: lng !== undefined ? lng : current.lng,
    message: (message || "").trim() || current.message,
  };
  await redis.set(`geo:${merchantId}`, next);
  return next;
}
