// lib/walletObjects.js
//
// Contrairement à lib/wallet.js (qui construit le LIEN "Ajouter à Wallet"
// via un JWT), ce fichier appelle directement l'API REST Google Wallet
// pour MODIFIER une carte déjà créée : changer son solde de tampons et
// lui envoyer une notification push. C'est ce qui permet au commerçant
// d'ajouter un tampon depuis son téléphone.

import { GoogleAuth } from "google-auth-library";

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
 * Met à jour le solde de tampons affiché sur la carte du client.
 */
export async function setLoyaltyPoints(objectId, points) {
  const client = await getAuthedClient();
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(
    objectId
  )}`;
  await client.request({
    url,
    method: "PATCH",
    data: {
      loyaltyPoints: {
        label: "Tampons",
        balance: { int: String(points) },
      },
    },
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
