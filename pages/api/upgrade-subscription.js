// pages/api/upgrade-subscription.js
//
// Passage en libre-service à une formule Stripe SUPÉRIEURE (plus de points
// de vente) pour un commerçant déjà abonné — jamais l'inverse : rétrograder
// n'est volontairement pas proposé ici, ça reste une demande à faire à Adam
// (voir l'onglet Abonnement, contact WhatsApp/email). L'ordre des formules
// est celui de PRICING_TIERS (lib/pricing.js) : "1" < "2-3" < "4-6" < "7+".
//
// Le complément est facturé immédiatement au prorata (voir
// updateSubscriptionItemPrice dans lib/stripe.js), et le prélèvement
// mensuel suivant reprend automatiquement le nouveau tarif — rien à
// refaire ensuite, ni pour Adam ni pour le commerçant.

import { getRole, getMerchantId } from "../../lib/auth";
import { getSubscriptionChoice, saveSubscriptionChoice } from "../../lib/db";
import { PRICING_TIERS, BILLING_CYCLES, getTierPrice } from "../../lib/pricing";
import { updateSubscriptionItemPrice } from "../../lib/stripe";

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
  const { posCount } = req.body || {};
  const newTier = PRICING_TIERS.find((t) => t.id === posCount);
  if (!newTier) {
    return res.status(400).json({ error: "Formule invalide." });
  }

  try {
    const sub = await getSubscriptionChoice(merchantId);
    if (!sub.stripeSubscriptionId) {
      return res.status(400).json({
        error: "Aucun abonnement en cours à mettre à niveau — active d'abord ton abonnement.",
      });
    }

    const currentIndex = PRICING_TIERS.findIndex((t) => t.id === sub.posCount);
    const newIndex = PRICING_TIERS.findIndex((t) => t.id === newTier.id);
    if (newIndex <= currentIndex) {
      return res.status(400).json({
        error: "Seul un passage à une formule supérieure est possible ici — contacte-nous pour rétrograder.",
      });
    }

    const cycle = BILLING_CYCLES.find((c) => c.id === sub.billingCycle) || BILLING_CYCLES[0];
    const price = getTierPrice(newTier, cycle.id);
    if (price == null) {
      return res.status(400).json({
        error: "Cette formule est sur devis — contacte-nous pour la mettre en place.",
      });
    }

    await updateSubscriptionItemPrice({
      subscriptionId: sub.stripeSubscriptionId,
      unitAmountCents: Math.round(price * 100),
      productName: `Fidélions — ${newTier.label} (${cycle.label})`,
    });
    await saveSubscriptionChoice(merchantId, { posCount: newTier.id });

    return res.status(200).json({ ok: true, posCount: newTier.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
