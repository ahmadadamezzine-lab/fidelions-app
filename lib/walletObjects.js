// lib/walletObjects.js
//
// Contrairement à lib/wallet.js (qui construit le LIEN "Ajouter à Wallet"
// via un JWT), ce fichier appelle directement l'API REST Google Wallet
// pour MODIFIER une carte déjà créée : changer son solde de points et
// lui envoyer une notification push. C'est ce qui permet au commerçant
// d'ajouter un point depuis son téléphone.

import { GoogleAuth } from "google-auth-library";

// Depuis le passage aux comptes commerçants, il n'y a plus UNE classe de
// fidélité pour tout le site : chaque restaurant a la sienne (créée
// automatiquement à l'inscription, voir insertLoyaltyClass plus bas), donc
// chaque fonction ci-dessous reçoit maintenant son `classId` en paramètre
// au lieu de lire une seule variable d'environnement globale. Seuls les
// identifiants du compte de service Google (email + clé privée) restent
// globaux : c'est le même compte "Fidélions" qui signe pour tous les
// restaurants, exactement comme un seul compte Stripe peut gérer les
// paiements de plusieurs marchands.

function normalizePrivateKey(raw) {
  let key = (raw || "").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\n/g, "\n");
}

/**
 * Les erreurs renvoyées par l'API Google (via gaxios, utilisé sous le
 * capot par google-auth-library) contiennent la vraie raison dans
 * err.response.data.error.message (ex : "Invalid image dimensions",
 * "Request had invalid authentication credentials", "Loyalty class not
 * found") — bien plus précis que err.message tout seul, qui n'est souvent
 * qu'un générique "Request failed with status code 400". Utilisé pour
 * remonter au commerçant la vraie raison plutôt qu'un vague "réessaie
 * plus tard" à chaque échec.
 */
export function describeWalletError(err) {
  const apiMessage = err?.response?.data?.error?.message;
  return apiMessage || err?.message || "Erreur inconnue";
}

let cachedClient = null;

async function getAuthedClient() {
  if (cachedClient) return cachedClient;

  const email = (process.env.GOOGLE_WALLET_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_WALLET_PRIVATE_KEY);

  if (!email || !privateKey) {
    throw new Error(
      "Variables d'environnement manquantes : GOOGLE_WALLET_CLIENT_EMAIL, GOOGLE_WALLET_PRIVATE_KEY"
    );
  }

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });

  cachedClient = await auth.getClient();
  return cachedClient;
}

/**
 * Met à jour le solde affiché sur la carte du client. Système de
 * fidélité unifié en "points" (voir lib/loyalty.js) : le libellé est
 * toujours "Points", quel que soit le nombre de paliers de récompense
 * définis par le commerçant.
 */
export async function setLoyaltyPoints(objectId, points, label = "Points") {
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(
    objectId
  )}`;
  await client.request({
    url,
    method: "PATCH",
    data: {
      loyaltyPoints: {
        label,
        balance: { int: String(points) },
      },
    },
  });
}

/**
 * Renomme la carte affichée dans le Google Wallet du client (corrige une
 * faute de frappe, ou un prénom mal tapé au moment de l'inscription).
 * Non bloquant si ça échoue : appelé dans un try/catch par l'appelant,
 * le renommage en base de données reste valable même si Google refuse.
 */
export async function renameLoyaltyObject(objectId, accountName) {
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(
    objectId
  )}`;
  await client.request({
    url,
    method: "PATCH",
    data: { accountName },
  });
}

/**
 * Envoie une notification push sur la carte du client (visible dans
 * Google Wallet, ex: "+1 point ! Plus que 3 avant votre récompense").
 *
 * Le champ messageType est OBLIGATOIRE pour déclencher un vrai popup sur
 * le téléphone (écran de verrouillage) : sans lui ("TEXT" par défaut), le
 * message est bien ajouté à l'historique de la carte mais aucune
 * notification n'apparaît jamais sur l'appareil du client — c'était le
 * bug. Attention : Google limite à 3 notifications "TEXT_AND_NOTIFY" par
 * carte et par 24h (au-delà, l'appel échoue avec une erreur de quota) —
 * largement suffisant pour un point + une campagne occasionnelle.
 */
export async function sendWalletMessage(objectId, header, body) {
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(
    objectId
  )}/addMessage`;
  await client.request({
    url,
    method: "POST",
    data: {
      message: {
        header,
        body,
        id: `msg_${Date.now()}`,
        messageType: "TEXT_AND_NOTIFY",
      },
    },
  });
}

/**
 * Toute modification d'une classe de fidélité DÉJÀ approuvée par Google
 * doit explicitement repasser son "reviewStatus" à "UNDER_REVIEW" dans la
 * même requête PATCH — sinon Google refuse la modification avec l'erreur
 * "Invalid review status \"APPROVED\". Use \"UNDER_REVIEW\" instead.",
 * documenté par Google comme le fonctionnement normal (une classe
 * approuvée reste modifiable, mais chaque mise à jour doit re-déclarer ce
 * champ ; Google la ré-approuve ensuite lui-même, en général très vite).
 * Centralisé ici pour que les 4 fonctions patchLoyaltyClass* ci-dessous
 * n'aient pas chacune à y penser séparément.
 */
async function patchLoyaltyClass(classId, data) {
  if (!classId) {
    throw new Error("Identifiant de classe Google Wallet manquant pour ce restaurant.");
  }
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(
    classId
  )}`;
  await client.request({
    url,
    method: "PATCH",
    data: { ...data, reviewStatus: "UNDER_REVIEW" },
  });
}

/**
 * Crée une TOUTE NOUVELLE classe de fidélité chez Google — appelé une
 * seule fois, au moment où un commerçant crée son compte Fidélions.
 * Avant l'inscription en libre-service, cette étape se faisait à la main
 * dans la Wallet Business Console (voir l'historique du README) ; elle est
 * maintenant automatique pour que n'importe quel restaurant puisse
 * démarrer seul, sans intervention.
 *
 * reviewStatus DOIT être "UNDER_REVIEW" dès la création, jamais "DRAFT" :
 * documenté par Google, une classe en "DRAFT" ne peut servir à créer
 * AUCUNE carte — le tout premier client du restaurant ne pourrait donc pas
 * ajouter sa carte tant qu'elle resterait en brouillon. Google fait passer
 * UNDER_REVIEW → APPROVED tout seul, généralement très vite (même
 * mécanisme que les mises à jour, voir patchLoyaltyClass ci-dessus).
 */
export async function insertLoyaltyClass({ classId, name, logoUrl, hexColor }) {
  if (!classId) {
    throw new Error("insertLoyaltyClass: classId manquant.");
  }
  const client = await getAuthedClient();
  const url = "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass";
  // Recommandation Google : 20 caractères max pour un affichage correct
  // sur petit écran.
  const cleanName = (name || "Fidélions").trim().slice(0, 20) || "Fidélions";
  const data = {
    id: classId,
    issuerName: cleanName,
    programName: cleanName,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: hexColor || "#7414F4",
  };
  if (logoUrl) {
    data.programLogo = {
      sourceUri: { uri: logoUrl },
      contentDescription: { defaultValue: { language: "fr", value: cleanName } },
    };
  }
  await client.request({ url, method: "POST", data });
}

/**
 * Applique la personnalisation (couleur, logo, bannière) à la CLASSE de
 * fidélité — donc à toutes les cartes déjà distribuées d'un coup, sans
 * avoir à repasser sur chaque carte individuellement. Remplace l'étape
 * manuelle "modifie ta classe dans la Wallet Console" du README.
 *
 * hexColor : ex "#7414F4". logoUrl/bannerUrl : URLs publiques HTTPS
 * (voir lib/blob.js) — Google Wallet exige une vraie adresse, pas un
 * fichier envoyé en base64.
 */
export async function patchLoyaltyClassBranding(classId, { hexColor, logoUrl, bannerUrl }) {
  const data = {};
  if (hexColor) data.hexBackgroundColor = hexColor;
  if (logoUrl) {
    data.programLogo = { sourceUri: { uri: logoUrl } };
  }
  if (bannerUrl) {
    data.heroImage = { sourceUri: { uri: bannerUrl } };
  }
  await patchLoyaltyClass(classId, data);
}

/**
 * Message libre du commerçant, affiché en permanence comme bloc de texte
 * sur la carte (textModulesData) — c'est le seul canal honnête pour un
 * "message personnalisé" via l'API Wallet publique : le texte du popup
 * natif de proximité, lui, est généré par Google et n'est PAS
 * personnalisable (voir patchLoyaltyClassLocations ci-dessous). Passer une
 * chaîne vide retire le bloc.
 */
export async function patchLoyaltyClassMessage(classId, message) {
  const clean = (message || "").trim();
  await patchLoyaltyClass(classId, {
    textModulesData: clean ? [{ id: "commercant_message", header: "À l'affiche", body: clean }] : [],
  });
}

/**
 * Renomme le libellé du solde sur la classe entière — conservé pour
 * corriger d'anciennes classes créées avant l'unification en "Points"
 * (voir setLoyaltyPoints ci-dessus), plus utilisé en fonctionnement normal.
 */
export async function patchLoyaltyClassPointsLabel(classId, label) {
  await patchLoyaltyClass(classId, { loyaltyPoints: { label } });
}

/**
 * Notifications de proximité ("Nearby Notifications") : donne à Google
 * Wallet jusqu'à 10 emplacements (lat/lng). Google se charge lui-même
 * d'envoyer une vraie notification native au téléphone du client quand il
 * s'approche (et de la faire disparaître quand il s'éloigne) — aucun code
 * de géolocalisation côté client à écrire. `locations` : tableau vide pour
 * désactiver la fonctionnalité.
 */
export async function patchLoyaltyClassLocations(classId, locations) {
  const cleanLocations = (locations || [])
    .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
    .slice(0, 10)
    .map((l) => ({ latitude: l.lat, longitude: l.lng }));
  await patchLoyaltyClass(classId, { locations: cleanLocations });
}
