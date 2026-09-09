// lib/walletObjects.js
//
// Contrairement à lib/wallet.js (qui construit le LIEN "Ajouter à Wallet"
// via un JWT), ce fichier appelle directement l'API REST Google Wallet
// pour MODIFIER une carte déjà créée : changer son solde de tampons et
// lui envoyer une notification push. C'est ce qui permet au commerçant
// d'ajouter un tampon depuis son téléphone.

import { GoogleAuth } from "google-auth-library";

const CLASS_ID = (process.env.GOOGLE_WALLET_CLASS_ID || "").trim();

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
 * Met à jour le solde affiché sur la carte du client. `label` s'adapte au
 * mode de fidélité choisi par le commerçant : "Tampons" en mode classique,
 * "Points" en mode paliers (voir lib/loyalty.js) — par défaut "Tampons"
 * pour ne rien changer aux cartes existantes.
 */
export async function setLoyaltyPoints(objectId, points, label = "Tampons") {
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
 * Google Wallet, ex: "+1 tampon ! Plus que 3 avant votre récompense").
 *
 * Le champ messageType est OBLIGATOIRE pour déclencher un vrai popup sur
 * le téléphone (écran de verrouillage) : sans lui ("TEXT" par défaut), le
 * message est bien ajouté à l'historique de la carte mais aucune
 * notification n'apparaît jamais sur l'appareil du client — c'était le
 * bug. Attention : Google limite à 3 notifications "TEXT_AND_NOTIFY" par
 * carte et par 24h (au-delà, l'appel échoue avec une erreur de quota) —
 * largement suffisant pour un tampon + une campagne occasionnelle.
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
 * Applique la personnalisation (couleur, logo, bannière) à la CLASSE de
 * fidélité — donc à toutes les cartes déjà distribuées d'un coup, sans
 * avoir à repasser sur chaque carte individuellement. Remplace l'étape
 * manuelle "modifie ta classe dans la Wallet Console" du README.
 *
 * hexColor : ex "#7414F4". logoUrl/bannerUrl : URLs publiques HTTPS
 * (voir lib/blob.js) — Google Wallet exige une vraie adresse, pas un
 * fichier envoyé en base64.
 */
export async function patchLoyaltyClassBranding({ hexColor, logoUrl, bannerUrl }) {
  if (!CLASS_ID) {
    throw new Error("Variable d'environnement manquante : GOOGLE_WALLET_CLASS_ID");
  }
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(
    CLASS_ID
  )}`;

  const data = {};
  if (hexColor) data.hexBackgroundColor = hexColor;
  if (logoUrl) {
    data.programLogo = { sourceUri: { uri: logoUrl } };
  }
  if (bannerUrl) {
    data.heroImage = { sourceUri: { uri: bannerUrl } };
  }

  await client.request({ url, method: "PATCH", data });
}

/**
 * Message libre du commerçant, affiché en permanence comme bloc de texte
 * sur la carte (textModulesData) — c'est le seul canal honnête pour un
 * "message personnalisé" via l'API Wallet publique : le texte du popup
 * natif de proximité, lui, est généré par Google et n'est PAS
 * personnalisable (voir patchLoyaltyClassLocations ci-dessous). Passer une
 * chaîne vide retire le bloc.
 */
export async function patchLoyaltyClassMessage(message) {
  if (!CLASS_ID) {
    throw new Error("Variable d'environnement manquante : GOOGLE_WALLET_CLASS_ID");
  }
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(
    CLASS_ID
  )}`;
  const clean = (message || "").trim();
  await client.request({
    url,
    method: "PATCH",
    data: {
      textModulesData: clean ? [{ id: "commercant_message", header: "À l'affiche", body: clean }] : [],
    },
  });
}

/**
 * Renomme le libellé du solde sur la classe entière ("Tampons" ↔ "Points"),
 * pour rester cohérent quand le commerçant change de mode de fidélité.
 */
export async function patchLoyaltyClassPointsLabel(label) {
  if (!CLASS_ID) {
    throw new Error("Variable d'environnement manquante : GOOGLE_WALLET_CLASS_ID");
  }
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(
    CLASS_ID
  )}`;
  await client.request({
    url,
    method: "PATCH",
    data: { loyaltyPoints: { label } },
  });
}

/**
 * Notifications de proximité ("Nearby Notifications") : donne à Google
 * Wallet jusqu'à 10 emplacements (lat/lng). Google se charge lui-même
 * d'envoyer une vraie notification native au téléphone du client quand il
 * s'approche (et de la faire disparaître quand il s'éloigne) — aucun code
 * de géolocalisation côté client à écrire. `locations` : tableau vide pour
 * désactiver la fonctionnalité.
 */
export async function patchLoyaltyClassLocations(locations) {
  if (!CLASS_ID) {
    throw new Error("Variable d'environnement manquante : GOOGLE_WALLET_CLASS_ID");
  }
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(
    CLASS_ID
  )}`;
  const cleanLocations = (locations || [])
    .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
    .slice(0, 10)
    .map((l) => ({ latitude: l.lat, longitude: l.lng }));

  await client.request({
    url,
    method: "PATCH",
    data: { locations: cleanLocations },
  });
}
