// lib/wallet.js
//
// Génère le lien "Ajouter à Google Wallet" pour un client donné.
// Ne contient AUCUN secret : la clé privée est lue depuis les variables
// d'environnement (configurées sur Vercel, jamais écrites dans ce fichier).

import jwt from "jsonwebtoken";

// L'ID de la classe de fidélité créée dans la Google Wallet Business Console.
// Format : <MERCHANT_ID>.<nom_de_la_classe>
const CLASS_ID = (process.env.GOOGLE_WALLET_CLASS_ID || "").trim(); // ex: "3388000000023199659.fidelions_loyalty"

// Nettoie la valeur collée dans Vercel, quelle que soit la façon dont elle a
// été copiée (avec ou sans guillemets autour, avec "\n" littéral ou de vrais
// retours à la ligne), pour reconstituer un PEM valide.
function normalizePrivateKey(raw) {
  let key = (raw || "").trim();

  // Si la valeur entière a été collée avec ses guillemets englobants
  // (ex: copiée telle quelle depuis le JSON), on les retire.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Convertit les séquences "\n" littérales (backslash + n) en vrais retours
  // à la ligne. Si la clé a déjà de vrais retours à la ligne, ceci ne change
  // rien.
  key = key.replace(/\\n/g, "\n");

  return key;
}

function getServiceAccount() {
  const email = (process.env.GOOGLE_WALLET_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_WALLET_PRIVATE_KEY);

  if (!email || !privateKey || !CLASS_ID) {
    throw new Error(
      "Variables d'environnement manquantes : GOOGLE_WALLET_CLIENT_EMAIL, GOOGLE_WALLET_PRIVATE_KEY, GOOGLE_WALLET_CLASS_ID"
    );
  }

  if (
    !privateKey.includes("BEGIN PRIVATE KEY") ||
    !privateKey.includes("END PRIVATE KEY")
  ) {
    throw new Error(
      "GOOGLE_WALLET_PRIVATE_KEY n'est pas au bon format (le texte -----BEGIN PRIVATE KEY----- est absent). Revérifie la valeur collée dans Vercel : copie uniquement le contenu du champ private_key du fichier JSON, sans les guillemets qui l'entourent."
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
