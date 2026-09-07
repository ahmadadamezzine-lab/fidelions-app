// lib/wallet.js
//
// Génère le lien "Ajouter à Google Wallet" pour un client donné.
// Ne contient AUCUN secret : la clé privée est lue depuis les variables
// d'environnement (configurées sur Vercel, jamais écrites dans ce fichier).

import jwt from "jsonwebtoken";

// L'ID de la classe de fidélité créée dans la Google Wallet Business Console.
// Format : <MERCHANT_ID>.<nom_de_la_classe>
const CLASS_ID = process.env.GOOGLE_WALLET_CLASS_ID; // ex: "BCR2DN6DVKHLZ7JI.fidelions_test"

function getServiceAccount() {
  const email = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
  // Sur Vercel, les retours à la ligne d'une clé privée doivent être stockés
  // comme "\n" littéral dans la variable d'environnement, puis reconvertis ici.
  const privateKey = (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !privateKey || !CLASS_ID) {
    throw new Error(
      "Variables d'environnement manquantes : GOOGLE_WALLET_CLIENT_EMAIL, GOOGLE_WALLET_PRIVATE_KEY, GOOGLE_WALLET_CLASS_ID"
    );
  }
  return { email, privateKey };
}

/**
 * Construit le lien "Ajouter à Google Wallet" pour un nouveau client.
 * @param {string} objectSuffix - identifiant unique du client (ex: uuid)
 * @param {string} accountName - nom affiché sur la carte (ex: prénom du client)
 * @returns {string} URL à ouvrir pour ajouter la carte au Wallet
 */
function buildSaveToWalletUrl({ objectSuffix, accountName }) {
  const { email, privateKey } = getServiceAccount();

  const issuerId = CLASS_ID.split(".")[0];
  const objectId = `${issuerId}.${objectSuffix}`;

  const loyaltyObject = {
    id: objectId,
    classId: CLASS_ID,
    state: "ACTIVE",
    accountId: objectSuffix,
    accountName: accountName || "Client Fidélions",
    loyaltyPoints: {
      label: "Tampons",
      balance: { int: "0" },
    },
  };

  const claims = {
    iss: email,
    aud: "google",
    origins: [], // tableau vide = conforme au modèle officiel Google pour un lien direct (pas le bouton JS)
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  };

  const token = jwt.sign(claims, privateKey, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}

export { buildSaveToWalletUrl };
