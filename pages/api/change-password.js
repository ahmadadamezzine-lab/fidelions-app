// pages/api/change-password.js
//
// Changement de mot de passe depuis l'onglet Paramètres : mot de passe
// actuel → code à 4 chiffres envoyé par email → nouveau mot de passe.
// Réservé au patron (compte principal).

import {
  getMerchantById,
  verifyMerchantPasswordById,
  updateMerchantPassword,
  createPasswordResetCode,
  verifyAndConsumePasswordResetCode,
} from "../../lib/db";
import { sendEmail } from "../../lib/email";
import { getRole, getMerchantId } from "../../lib/auth";

/**
 * Masque l'email pour l'affichage côté client : 3 premières lettres de la
 * partie locale + "•••" + le vrai domaine (ex: "ahm•••@gmail.com"). L'email
 * complet ne quitte jamais le serveur.
 */
function maskEmail(email) {
  const clean = (email || "").trim();
  const at = clean.indexOf("@");
  if (at === -1) return clean;
  const local = clean.slice(0, at);
  const domain = clean.slice(at + 1);
  const prefix = local.slice(0, 3);
  return `${prefix}•••@${domain}`;
}

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  const merchantId = getMerchantId(req);

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { step, currentPassword, code, newPassword } = req.body || {};

    if (step === "request") {
      const ok = await verifyMerchantPasswordById(merchantId, currentPassword);
      if (!ok) {
        return res.status(401).json({ error: "Mot de passe actuel incorrect." });
      }
      const merchant = await getMerchantById(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Compte commerçant introuvable." });
      }
      const maskedEmail = maskEmail(merchant.email);
      const verificationCode = await createPasswordResetCode(merchantId);
      try {
        await sendEmail({
          to: merchant.email,
          subject: "Code de vérification Fidélions",
          text: `Voici ton code de vérification pour changer ton mot de passe Fidélions : ${verificationCode}\n\nCe code expire dans 10 minutes. Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.`,
        });
      } catch (err) {
        console.error("Échec d'envoi du code de vérification :", err);
        return res.status(500).json({
          error: "Impossible d'envoyer le code de vérification par email pour le moment. Réessaie plus tard.",
        });
      }
      return res.status(200).json({ maskedEmail });
    }

    if (step === "confirm") {
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Le mot de passe doit faire au moins 4 caractères." });
      }
      const valid = await verifyAndConsumePasswordResetCode(merchantId, code);
      if (!valid) {
        return res.status(400).json({ error: "Code invalide ou expiré — recommence." });
      }
      await updateMerchantPassword(merchantId, newPassword);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Étape inconnue." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
