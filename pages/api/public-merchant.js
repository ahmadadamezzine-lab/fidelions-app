// pages/api/public-merchant.js
//
// Petit endpoint PUBLIC (aucune authentification) appelé par la page
// d'inscription client /r/[slug] pour afficher le nom, la couleur et le
// logo du restaurant avant que le client ne crée sa carte. Ne renvoie que
// des informations déjà publiques (celles visibles sur la carte Wallet
// elle-même) — jamais l'email, le mot de passe ou l'identifiant interne
// du commerçant.

import { getMerchantBySlug, getBranding } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const slug = String(req.query.slug || "");
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return res.status(404).json({ error: "Commerce introuvable." });
    }

    const branding = await getBranding(merchant.id);

    return res.status(200).json({
      restaurantName: merchant.restaurantName,
      slug: merchant.slug,
      hexColor: branding.hexColor,
      logoUrl: branding.logoUrl,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
