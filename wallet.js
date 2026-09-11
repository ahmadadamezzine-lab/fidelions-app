// lib/wallet.js
//
// Génère le lien "Ajouter à Google Wallet" pour un client donné.
// Ne contient AUCUN secret : la clé privée est lue depuis les variables
// d'environnement (configurées sur Vercel, jamais écrites dans ce fichier).

import jwt from "jsonwebtoken";

// Depuis le passage aux comptes commerçants, l'ID de la classe de fidélité
// n'est plus une seule variable d'environnement globale : chaque
// restaurant a la sienne, créée à l'inscription (voir
// lib/walletObjects.js: insertLoyaltyClass) et stockée sur son compte —
// buildSaveToWalletUrl la reçoit maintenant en paramètre (`classId`).
// Format : <ISSUER_ID>.<identifiant> — ex: "3388000000023199659.fid_ab12cd34".

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

  if (!email || !privateKey) {
    throw new Error(
      "Variables d'environnement manquantes : GOOGLE_WALLET_CLIENT_EMAIL, GOOGLE_WALLET_PRIVATE_KEY"
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
 * @param {string} classId - identifiant de la classe de fidélité DE CE restaurant
 * @param {string} objectSuffix - identifiant unique du client (ex: uuid)
 * @param {string} accountName - nom affiché sur la carte (ex: prénom du client)
 * @param {string} [reviewUrl] - lien "avis Google" du commerce (onglet Établissement), affiché sur la carte s'il est renseigné
 * @returns {string} URL à ouvrir pour ajouter la carte au Wallet
 */
function buildSaveToWalletUrl({ classId, objectSuffix, accountName, initialPoints, reviewUrl }) {
  const { email, privateKey } = getServiceAccount();

  if (!classId) {
    throw new Error("Ce commerce n'a pas encore de classe de fidélité Google Wallet configurée.");
  }

  const issuerId = classId.split(".")[0];
  const objectId = `${issuerId}.${objectSuffix}`;

  const loyaltyObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountId: objectSuffix,
    accountName: accountName || "Client Fidélions",
    loyaltyPoints: {
      label: "Points",
      balance: { int: String(initialPoints || 0) },
    },
    // QR code affiché sur la carte : c'est ce que le commerçant scanne
    // depuis l'espace commerçant pour ajouter un point.
    barcode: {
      type: "QR_CODE",
      value: objectId,
      alternateText: "",
    },
  };

  // Bouton "Laisser un avis Google" directement sur la carte — uniquement
  // si le commerce a renseigné son lien d'avis (onglet Établissement,
  // reçu ici en paramètre `reviewUrl` ; à défaut, la variable
  // d'environnement globale GOOGLE_REVIEW_URL sert de repli pour les
  // comptes qui n'ont pas encore rempli ce champ).
  //
  // À la demande d'Adam, ce bouton annonce désormais explicitement le
  // bonus de points ("Donnez votre avis, gagnez des points"). Point
  // important pour la suite : cliquer ce lien ouvre juste la page d'avis
  // Google, ça ne crédite aucun point tout seul — le bonus est ajouté par
  // le commerçant/l'employé en caisse (case "avis Google laissé", voir
  // pages/commercant.js et pages/scan/[token].js), donc le message ne
  // promet rien d'automatique.
  const finalReviewUrl = (reviewUrl || process.env.GOOGLE_REVIEW_URL || "").trim();
  if (finalReviewUrl) {
    loyaltyObject.linksModuleData = {
      uris: [
        {
          uri: finalReviewUrl,
          description: "Donnez votre avis Google, gagnez des points",
          id: "google_review_link",
        },
      ],
    };
  }

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
  return { url: `https://pay.google.com/gp/v/save/${token}`, objectId };
}

export { buildSaveToWalletUrl };
