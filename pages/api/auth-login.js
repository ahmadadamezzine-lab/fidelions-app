// pages/api/auth-login.js
//
// Connexion d'un compte commerçant déjà créé (voir auth-signup.js) : email
// + mot de passe, renvoie un jeton de session signé (voir lib/session.js)
// que /commercant réutilise ensuite exactement comme l'ancien mot de passe
// partagé — dans le même en-tête x-merchant-password, à chaque appel API.

import { verifyMerchantLogin, checkRateLimit } from "../../lib/db";
import { signSession } from "../../lib/session";
import { getClientIp } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  // Protection anti-abus : sans limite, un script pourrait tenter des
  // milliers de mots de passe en boucle sur un email connu. 10
  // tentatives/minute par IP passe largement une connexion normale (même
  // avec quelques fautes de frappe) et ralentit un script.
  const ip = getClientIp(req);
  const withinLimit = await checkRateLimit(`auth-login:${ip}`, 10, 60).catch(() => true);
  if (!withinLimit) {
    return res.status(429).json({ error: "Trop de tentatives de connexion — réessaie dans une minute." });
  }

  const { email, password } = req.body || {};
  if (!(email || "").trim() || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  try {
    const merchant = await verifyMerchantLogin(email, password);
    if (!merchant) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }
    const token = signSession({ merchantId: merchant.id });
    return res.status(200).json({
      token,
      merchantId: merchant.id,
      restaurantName: merchant.restaurantName,
      slug: merchant.slug,
      email: merchant.email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
