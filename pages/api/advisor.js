// pages/api/advisor.js
//
// "Conseiller IA" — endpoint conversationnel (voir lib/advisor.js). Remplace
// l'ancien /api/analyze-menu (analyse figée en un seul aller-retour) par un
// vrai fil de discussion : reçoit l'historique complet des messages à chaque
// appel (le client garde l'historique, aucune session serveur nécessaire) et
// répond au dernier message, en tenant compte du contexte du commerce.
//
// Ne renvoie JAMAIS d'erreur bloquante pour un simple échec des deux IA —
// lib/advisor.js retombe déjà sur une réponse de secours locale dans ce
// cas. Seules de vraies erreurs de requête (méthode, auth, message vide)
// renvoient un code d'erreur ici.

import { askAdvisor } from "../../lib/advisor";
import { getRole } from "../../lib/auth";

// Une photo jointe à un message peut peser plusieurs Mo une fois encodée en
// base64 — la limite par défaut de Next (1 Mo) est trop basse.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }

  try {
    const { messages, fileBase64, mimeType, menuText, offerText, rewardLabel, rewardThreshold } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Aucun message à traiter." });
    }
    // On ne garde que ce dont lib/advisor.js a besoin, et on borne
    // l'historique envoyé à l'IA (les 20 derniers messages suffisent
    // largement pour garder le fil d'une conversation, sans faire exploser
    // le nombre de jetons envoyés à chaque nouvel appel).
    const cleanMessages = messages
      .filter((m) => m && typeof m.text === "string" && m.text.trim())
      .slice(-20)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: m.text.trim() }));

    if (cleanMessages.length === 0) {
      return res.status(400).json({ error: "Écris une question avant d'envoyer." });
    }

    const file = fileBase64 && mimeType ? { base64: fileBase64, mimeType } : null;

    const result = await askAdvisor({
      messages: cleanMessages,
      file,
      context: { menuText, offerText, rewardLabel, rewardThreshold },
    });
    return res.status(200).json(result);
  } catch (err) {
    // Ne devrait normalement jamais arriver (askAdvisor gère déjà ses
    // propres échecs), gardé par sécurité pour ne jamais planter en 500 nu.
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
