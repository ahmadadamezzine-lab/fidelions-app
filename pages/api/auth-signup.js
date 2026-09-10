// pages/api/auth-signup.js
//
// Inscription en libre-service d'un nouveau restaurant sur Fidélions : un
// seul site, chaque commerçant crée son propre compte (email + mot de
// passe) au lieu d'un déploiement dédié par restaurant (voir l'ancien
// fonctionnement dans le README). Crée le compte ET la classe de fidélité
// Google Wallet de ce restaurant en une seule fois — avant cette
// automatisation, la classe se créait à la main dans la Wallet Business
// Console.

import { createMerchant, setMerchantWalletClassId, deleteMerchantAccount } from "../../lib/db";
import { insertLoyaltyClass, describeWalletError } from "../../lib/walletObjects";
import { signSession } from "../../lib/session";

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const issuerId = (process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
  if (!issuerId) {
    return res.status(500).json({
      error:
        "Variable d'environnement manquante : GOOGLE_WALLET_ISSUER_ID (l'identifiant numérique de la Wallet Business Console — voir le README).",
    });
  }

  const { email, password, restaurantName } = req.body || {};

  let merchant;
  try {
    merchant = await createMerchant({ email, password, restaurantName });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Inscription impossible." });
  }

  // La classe Wallet de ce restaurant : un identifiant dérivé de son
  // compte (unique), sous l'identifiant d'émetteur Fidélions (partagé,
  // celui de la Wallet Business Console).
  const classId = `${issuerId}.fid_${merchant.id.replace(/-/g, "")}`;
  const logoUrl = `${getBaseUrl(req)}/logo.png`;

  try {
    await insertLoyaltyClass({
      classId,
      name: merchant.restaurantName,
      logoUrl,
      hexColor: "#7414F4",
    });
    await setMerchantWalletClassId(merchant.id, classId);
  } catch (err) {
    console.error("Création de la classe Wallet échouée :", err?.response?.data || err);
    // On annule la création du compte pour que l'email redevienne
    // disponible à une nouvelle tentative, plutôt que de laisser un
    // compte à moitié créé, inutilisable, bloquant cet email pour de bon.
    await deleteMerchantAccount(merchant.id).catch(() => {});
    return res.status(500).json({
      error: `Impossible de créer ta carte de fidélité Google Wallet (${describeWalletError(
        err
      )}). Ton compte n'a pas été créé — réessaie dans un instant.`,
    });
  }

  const token = signSession({ merchantId: merchant.id });
  return res.status(200).json({
    token,
    merchantId: merchant.id,
    restaurantName: merchant.restaurantName,
    slug: merchant.slug,
    email: merchant.email,
  });
}
