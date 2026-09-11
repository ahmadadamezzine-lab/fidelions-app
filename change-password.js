// pages/api/change-password.js
//
// Changement de mot de passe depuis l'onglet Paramètres : mot de passe
// actuel → nouveau mot de passe, en un seul appel. Réservé au patron
// (compte principal).
//
// Pas de vérification par email ici : Resend, sur son compte gratuit sans
// domaine vérifié, refuse d'envoyer à n'importe quelle adresse (seulement
// à celle du compte Resend lui-même) — vérifier un domaine suppose de
// posséder un nom de domaine payant. Le mot de passe actuel déjà exigé
// (et vérifié côté serveur avant tout changement) reste la protection
// contre un changement non autorisé.

import { verifyMerchantPasswordById, updateMerchantPassword } from "../../lib/db";
import { getRole, getMerchantId } from "../../lib/auth";

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
    const { currentPassword, newPassword } = req.body || {};

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 4 caractères." });
    }

    const ok = await verifyMerchantPasswordById(merchantId, currentPassword);
    if (!ok) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect." });
    }

    await updateMerchantPassword(merchantId, newPassword);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
