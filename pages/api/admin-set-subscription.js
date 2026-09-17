// pages/api/admin-set-subscription.js
//
// Bascule manuelle du statut d'abonnement d'un commerce — usage exclusif
// d'Adam, une fois qu'un paiement Revolut est réellement reçu (→ "actif"),
// pour couper un compte (→ "suspendu"), ou pour relancer un essai
// (→ "essai", avec une nouvelle échéance de 14 jours). Protégé par
// SESSION_SECRET, même principe que /api/admin-reset-password et
// /api/migrate-demo. Voir getSubscriptionAccess dans lib/db.js pour ce que
// chaque statut entraîne côté commerçant.
//
// Appel (depuis un navigateur, en remplaçant les valeurs) :
//   /api/admin-set-subscription?secret=TA_VALEUR_SESSION_SECRET&email=contact@commerce.fr&status=actif

import { getMerchantByEmail, setSubscriptionStatus, saveSubscriptionChoice } from "../../lib/db";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const secret = (process.env.SESSION_SECRET || "").trim();
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  const email = String(req.query.email || "").trim();
  const status = String(req.query.status || "").trim();

  if (!email) {
    return res.status(400).json({ error: "Paramètre email manquant (l'email du compte commerçant)." });
  }
  if (!["essai", "actif", "suspendu"].includes(status)) {
    return res.status(400).json({ error: "Paramètre status invalide — attendu : essai, actif ou suspendu." });
  }

  try {
    const merchant = await getMerchantByEmail(email);
    if (!merchant) {
      return res.status(404).json({ error: "Aucun commerce trouvé avec cet email." });
    }

    // Relancer un essai redonne aussi 14 jours pleins — pratique pour un
    // commerçant en cours de négociation à qui on laisse un peu plus de
    // temps, sans avoir à toucher au code.
    if (status === "essai") {
      await saveSubscriptionChoice(merchant.id, { status: "essai", trialEndsAt: Date.now() + TRIAL_DURATION_MS });
    } else {
      await setSubscriptionStatus(merchant.id, status);
    }

    return res.status(200).json({
      ok: true,
      message: `Abonnement de ${merchant.restaurantName} (${merchant.email}) mis à jour : ${status}.`,
      merchantId: merchant.id,
      status,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
