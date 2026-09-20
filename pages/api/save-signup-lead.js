// pages/api/save-signup-lead.js
//
// Enregistre discrètement un lead en cours d'inscription — appelé par
// pages/commercant.js dès que le champ email de l'étape 6/6 (la dernière)
// est renseigné. Sans compte, sans mot de passe : juste de quoi relancer
// par email si l'inscription n'est jamais finalisée (voir
// pages/api/cron/abandoned-signup-emails.js). Public par nature — appelé
// AVANT la création du compte — donc protégé par limite de débit comme
// les autres routes publiques (auth-signup, create-pass...).

import { saveSignupLead, checkRateLimit } from "../../lib/db";
import { getClientIp } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const ip = getClientIp(req);
  // Généreux (30/heure) : ce endpoint est appelé plusieurs fois pendant
  // qu'une même personne finit de taper son email/nom de commerce, jamais
  // une seule fois — une vraie limite anti-abus, pas un frein à l'usage
  // normal.
  const withinLimit = await checkRateLimit(`save-lead:${ip}`, 30, 3600).catch(() => true);
  if (!withinLimit) {
    return res.status(429).json({ error: "Trop de requêtes." });
  }

  try {
    const { email, restaurantName, posCount, billingCycle } = req.body || {};
    await saveSignupLead({ email, restaurantName, posCount, billingCycle });
    // Toujours 200 : cet appel est un simple "au fait, en voici un peu
    // plus sur cette personne", jamais bloquant pour la suite de
    // l'inscription même si l'email est mal formé ou vide.
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-signup-lead:", err);
    return res.status(200).json({ ok: false });
  }
}
