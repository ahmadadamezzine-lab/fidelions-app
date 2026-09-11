// pages/api/clients.js
//
// Liste des clients pour l'espace commerçant (recherche manuelle,
// tableau des visites). Accessible au patron, et à tout employé (lien +
// code) dont la permission "clients" a été activée par le patron dans
// l'onglet Équipe. C'est aussi le premier appel fait après une connexion
// (voir tryAuth dans /commercant) : la réponse porte donc en plus le nom
// et le "slug" du restaurant (son lien public /r/[slug]), pour éviter un
// appel séparé.

import { listClients, getSettings, getMerchantById } from "../../lib/db";
import { getRoleAsync, hasPermission } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const auth = await getRoleAsync(req);
  const allowed = auth && (auth.role === "owner" || hasPermission(auth, "clients"));
  if (!allowed) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  try {
    const [clients, settings, merchant] = await Promise.all([
      listClients(auth.merchantId),
      getSettings(auth.merchantId),
      getMerchantById(auth.merchantId),
    ]);
    return res.status(200).json({
      clients,
      role: auth.role,
      rewardThreshold: settings.rewardThreshold,
      rewardLabel: settings.rewardLabel,
      restaurantName: merchant?.restaurantName || "",
      slug: merchant?.slug || "",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
