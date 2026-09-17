// pages/api/create-checkout-session.js
//
// Démarre un paiement Stripe récurrent pour le commerçant connecté : crée
// une session Checkout hébergée par Stripe et renvoie son URL pour
// redirection. Le moyen de paiement proposé dépend de l'engagement — carte
// (Apple Pay/Google Pay compris) pour la formule mensuelle, prélèvement
// SEPA uniquement pour un engagement 6 mois / 1 an — voir le détail dans
// createCheckoutSession (lib/stripe.js).
//
// Le prix est calculé ICI, côté serveur, à partir de la grille tarifaire
// partagée (lib/pricing.js) — jamais depuis une valeur envoyée par le
// navigateur, pour ne pas pouvoir être trafiqué.
//
// Pour un engagement (6 mois / 1 an), Stripe est configuré pour arrêter de
// lui-même les prélèvements à la date d'engagement (voir lib/stripe.js) :
// aucune action d'Adam n'est nécessaire au démarrage ni à la fin de
// l'engagement. C'est le webhook (pages/api/stripe-webhook.js) qui tient
// `activeUntil` à jour à chaque prélèvement réussi, et l'accès se
// reverrouille de lui-même dès que ça s'arrête (voir getSubscriptionAccess
// dans lib/db.js).

import { getRole, getMerchantId } from "../../lib/auth";
import { getMerchantById, getSubscriptionChoice, saveSubscriptionChoice } from "../../lib/db";
import { PRICING_TIERS, BILLING_CYCLES, getTierPrice } from "../../lib/pricing";
import { createCheckoutSession, getCommitmentDays } from "../../lib/stripe";

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
  const { posCount, billingCycle } = req.body || {};

  const tier = PRICING_TIERS.find((t) => t.id === posCount);
  const cycle = BILLING_CYCLES.find((c) => c.id === billingCycle);
  if (!tier || !cycle) {
    return res.status(400).json({ error: "Formule ou cycle de facturation invalide." });
  }
  const price = getTierPrice(tier, cycle.id);
  if (price == null) {
    return res.status(400).json({
      error: "Cette formule est sur devis — contacte-nous pour finaliser le tarif avant d'activer l'abonnement.",
    });
  }

  try {
    const [merchant, currentSub] = await Promise.all([
      getMerchantById(merchantId),
      getSubscriptionChoice(merchantId),
    ]);
    if (!merchant) {
      return res.status(404).json({ error: "Commerce introuvable." });
    }

    // On retient la formule choisie tout de suite, avant même le paiement
    // — si le commerçant quitte la page Stripe sans payer, l'onglet
    // Abonnement affiche quand même son dernier choix.
    await saveSubscriptionChoice(merchantId, { posCount: tier.id, billingCycle: cycle.id });

    const baseUrl = getBaseUrl(req);
    const session = await createCheckoutSession({
      merchantId,
      customerEmail: merchant.email,
      stripeCustomerId: currentSub.stripeCustomerId || undefined,
      productName: `Fidélions — ${tier.label} (${cycle.label})`,
      unitAmountCents: Math.round(price * 100),
      commitmentDays: getCommitmentDays(cycle.id),
      successUrl: `${baseUrl}/commercant?checkout=success`,
      cancelUrl: `${baseUrl}/commercant?checkout=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
