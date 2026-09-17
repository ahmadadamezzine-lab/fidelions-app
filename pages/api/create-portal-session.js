// pages/api/create-portal-session.js
//
// Ouvre le Billing Portal hébergé par Stripe pour le commerçant connecté :
// il peut y voir ses factures, changer sa carte, et surtout résilier
// lui-même quand il le souhaite ("il doit pouvoir s'arrêter au bon
// moment") — sans qu'Adam ait besoin de construire une interface
// d'annulation ou d'intervenir à la main.

import { getRole, getMerchantId } from "../../lib/auth";
import { getSubscriptionChoice } from "../../lib/db";
import { createBillingPortalSession } from "../../lib/stripe";

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const merchantId = getMerchantId(req);
  try {
    const sub = await getSubscriptionChoice(merchantId);
    if (!sub.stripeCustomerId) {
      return res.status(400).json({
        error: "Aucun abonnement Stripe pour ce compte pour le moment — active d'abord ton abonnement.",
      });
    }
    const portalSession = await createBillingPortalSession({
      stripeCustomerId: sub.stripeCustomerId,
      returnUrl: `${getBaseUrl(req)}/commercant`,
    });
    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
