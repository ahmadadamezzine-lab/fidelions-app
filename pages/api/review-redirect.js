// pages/api/review-redirect.js
//
// Le vrai lien cliqué dans l'email de demande d'avis (voir
// pages/api/notify/review-request.js) : enregistre le clic puis redirige
// tout de suite vers le lien Google Review du commerce — jamais vers sa
// fiche générale, uniquement vers la page d'avis directe renseignée dans
// l'onglet Établissement. Public (pas d'authentification) : l'objectId de
// l'URL fait déjà office de jeton, exactement comme le QR code de la carte
// (voir le commentaire de getClientByObjectId dans lib/db.js).

import { getClientByObjectId, getEstablishmentInfo, markReviewClicked } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const objectId = (req.query.o || "").toString().trim();
  if (!objectId) {
    return res.redirect(302, "/");
  }

  try {
    const client = await getClientByObjectId(objectId);
    if (!client || !client.restaurantId) {
      return res.redirect(302, "/");
    }

    const establishment = await getEstablishmentInfo(client.restaurantId);
    if (!establishment.googleReviewUrl) {
      return res.redirect(302, "/");
    }

    await markReviewClicked(objectId).catch(() => {});

    return res.redirect(302, establishment.googleReviewUrl);
  } catch (err) {
    console.error("review-redirect :", err);
    return res.redirect(302, "/");
  }
}
