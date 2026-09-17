// lib/stripe.js
//
// Intégration Stripe pour le prélèvement automatique récurrent, en appels
// REST directs (fetch + Basic Auth) plutôt qu'avec le SDK officiel « stripe »
// — même principe que Resend (lib/email.js) et Google OAuth
// (lib/googleAuth.js) : pas de `npm install` possible dans cet
// environnement de développement, et un SDK n'apporte rien qu'un fetch ne
// fasse pas ici.
//
// Ce que Stripe automatise, sans qu'Adam ait à toucher à quoi que ce soit :
// - Le commerçant choisit une formule avec engagement (6 mois ou 1 an) :
//   Stripe prélève chaque mois tout seul, et arrête de lui-même de
//   prélever à la date d'engagement (`subscription_data.cancel_at`
//   ci-dessous) — pas de résiliation à gérer côté Adam. La formule
//   mensuelle, elle, n'a pas de `cancel_at` : elle continue tant que le
//   commerçant ne résilie pas.
// - Le commerçant peut résilier lui-même "au bon moment", depuis le
//   Billing Portal hébergé par Stripe (createBillingPortalSession) —
//   aucune interface d'annulation à construire.
// - Le webhook (pages/api/stripe-webhook.js) prolonge `activeUntil` (dans
//   lib/db.js) à chaque prélèvement réussi. Dès qu'un mois n'est plus payé
//   — fin d'engagement, échec de paiement ou résiliation — `activeUntil`
//   n'avance plus et l'accès se reverrouille tout seul dès la date dépassée
//   (voir getSubscriptionAccess dans lib/db.js) : pas besoin de traiter
//   chaque cas d'échec séparément, un seul mécanisme couvre tout.

import crypto from "crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function getSecretKey() {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquant : crée un compte sur stripe.com et ajoute ta clé secrète dans les variables d'environnement Vercel (voir le README)."
    );
  }
  return key;
}

// Stripe attend un corps `application/x-www-form-urlencoded` en notation à
// crochets pour les paramètres imbriqués (ex: line_items[0][price_data]
// [unit_amount]=1900) — ce helper aplatit récursivement un objet JS
// quelconque dans ce format.
function flattenParams(obj, prefix = "", out = []) {
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null) continue;
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const arrKey = `${paramKey}[${i}]`;
        if (item !== null && typeof item === "object") {
          flattenParams(item, arrKey, out);
        } else {
          out.push([arrKey, item]);
        }
      });
    } else if (typeof value === "object") {
      flattenParams(value, paramKey, out);
    } else {
      out.push([paramKey, value]);
    }
  }
  return out;
}

function toFormBody(params) {
  return flattenParams(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

async function stripeRequest(method, path, params) {
  const secretKey = getSecretKey();
  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const isGet = method === "GET";
  const query = isGet && params ? `?${toFormBody(params)}` : "";

  const res = await fetch(`${STRIPE_API_BASE}${path}${query}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(isGet ? {} : { "Content-Type": "application/x-www-form-urlencoded" }),
    },
    body: isGet || !params ? undefined : toFormBody(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Erreur Stripe (${res.status}).`);
  }
  return data;
}

// Durée d'engagement des formules avec engagement — voir BILLING_CYCLES
// dans lib/pricing.js. `null`/absent (formule mensuelle) = pas d'engagement,
// résiliable à tout moment depuis le Billing Portal.
export function getCommitmentDays(billingCycle) {
  if (billingCycle === "6mois") return 182;
  if (billingCycle === "annuel") return 365;
  return null;
}

/**
 * Crée une session Stripe Checkout (page de paiement hébergée par Stripe)
 * pour un abonnement récurrent mensuel.
 *
 * Moyen de paiement selon l'engagement — décidé une fois pour toutes ici,
 * le commerçant n'a pas à choisir dans les cas où ça ne devrait pas être un
 * choix :
 * - Formule AVEC engagement (6 mois / 1 an, `commitmentDays` fourni) :
 *   prélèvement SEPA UNIQUEMENT, pas de carte. Une carte peut expirer ou
 *   être annulée en plein milieu d'un engagement de plusieurs mois (le
 *   prélèvement s'arrête alors tout seul, sans que personne n'ait "résilié"
 *   — mauvais pour tout le monde) ; le prélèvement SEPA débite directement
 *   le compte bancaire du commerçant sur toute la durée, plus fiable pour
 *   un engagement long, et moins cher pour Adam en plus (0,35 € fixe par
 *   prélèvement contre 1,5 % + 0,25 % pour une carte).
 * - Formule SANS engagement (mensuel, résiliable à tout moment) : le
 *   commerçant choisit entre carte et prélèvement SEPA — là, la souplesse
 *   de la carte (paiement immédiat, pas de mandat à donner) est plus utile
 *   que sur un engagement long, donc pas de raison de lui imposer un choix.
 *
 * Le prix est envoyé en `price_data` INLINE (pas un Price pré-créé dans le
 * Dashboard Stripe) : Adam n'a donc rien à configurer côté Stripe pour
 * chaque palier × cycle de facturation, le prix vient directement de
 * lib/pricing.js à chaque appel. Rien à coder de plus côté paiement
 * lui-même : Stripe Checkout affiche et collecte l'IBAN + le mandat tout
 * seul quand sepa_debit est proposé. Le webhook
 * (pages/api/stripe-webhook.js) tient déjà compte du fait qu'un
 * prélèvement SEPA met jusqu'à 6 jours ouvrés avant d'être confirmé,
 * contrairement à une carte qui est instantanée.
 */
export async function createCheckoutSession({
  merchantId,
  customerEmail,
  stripeCustomerId,
  productName,
  unitAmountCents,
  commitmentDays,
  successUrl,
  cancelUrl,
}) {
  const params = {
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: merchantId,
    metadata: { merchantId },
    payment_method_types: commitmentDays ? ["sepa_debit"] : ["card", "sepa_debit"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: unitAmountCents,
          recurring: { interval: "month" },
          product_data: { name: productName },
        },
      },
    ],
    subscription_data: {
      metadata: { merchantId },
    },
  };

  if (stripeCustomerId) {
    params.customer = stripeCustomerId;
  } else if (customerEmail) {
    params.customer_email = customerEmail;
  }

  // Engagement 6 mois / 1 an : Stripe arrête tout seul de prélever à cette
  // date — "il doit pouvoir s'arrêter au bon moment" sans qu'Adam ou le
  // commerçant n'aient à faire quoi que ce soit à ce moment-là.
  if (commitmentDays) {
    params.subscription_data.cancel_at = Math.floor(Date.now() / 1000) + commitmentDays * 24 * 60 * 60;
  }

  return stripeRequest("POST", "/checkout/sessions", params);
}

/**
 * Ouvre le Billing Portal hébergé par Stripe : le commerçant y voit ses
 * factures, peut changer sa carte, et surtout résilier lui-même quand il le
 * souhaite — c'est la réponse à "il doit pouvoir s'arrêter au bon moment",
 * sans construire une seule ligne d'interface d'annulation.
 */
export async function createBillingPortalSession({ stripeCustomerId, returnUrl }) {
  return stripeRequest("POST", "/billing_portal/sessions", {
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
}

export async function retrieveSubscription(subscriptionId) {
  return stripeRequest("GET", `/subscriptions/${subscriptionId}`);
}

/**
 * Change le prix d'un abonnement Stripe déjà actif — utilisé UNIQUEMENT
 * pour un passage à une formule supérieure (voir pages/api/upgrade-subscription.js,
 * qui vérifie déjà que la nouvelle formule est bien plus élevée avant
 * d'appeler cette fonction ; rétrograder n'est volontairement pas proposé
 * en libre-service, ça reste une demande à Adam).
 *
 * `proration_behavior: "always_invoice"` facture immédiatement le
 * complément au prorata du temps restant sur la période en cours, plutôt
 * que d'attendre la prochaine échéance — cohérent avec "upgrade tout de
 * suite" plutôt qu'un changement qui ne prendrait effet que le mois
 * suivant. Le prochain prélèvement mensuel utilisera automatiquement le
 * nouveau prix, sans rien à refaire.
 */
export async function updateSubscriptionItemPrice({ subscriptionId, unitAmountCents, productName }) {
  const subscription = await retrieveSubscription(subscriptionId);
  const item = subscription?.items?.data?.[0];
  if (!item) {
    throw new Error("Abonnement Stripe introuvable ou sans ligne de facturation à mettre à niveau.");
  }
  return stripeRequest("POST", `/subscriptions/${subscriptionId}`, {
    proration_behavior: "always_invoice",
    items: [
      {
        id: item.id,
        price_data: {
          currency: "eur",
          unit_amount: unitAmountCents,
          recurring: { interval: "month" },
          product_data: { name: productName },
        },
      },
    ],
  });
}

/**
 * Vérifie qu'un événement webhook vient bien de Stripe (signature HMAC-SHA256
 * documentée par Stripe : https://docs.stripe.com/webhooks/signatures#verify-manually),
 * recalculée à la main puisqu'on n'installe pas leur SDK. `rawBody` DOIT être
 * le corps brut de la requête (avant tout JSON.parse) — la signature ne
 * correspond qu'à cette chaîne exacte.
 */
export function verifyStripeSignature(rawBody, signatureHeader, toleranceSeconds = 300) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET manquant : récupère la clé de signature du webhook dans le Dashboard Stripe et ajoute-la dans les variables d'environnement Vercel."
    );
  }
  if (!signatureHeader) {
    throw new Error("En-tête Stripe-Signature manquant.");
  }

  const parts = {};
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) parts[k] = v;
  }
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) {
    throw new Error("En-tête Stripe-Signature invalide.");
  }

  const computedSig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSig, "hex");
  const computedBuf = Buffer.from(computedSig, "hex");
  const isValid =
    expectedBuf.length === computedBuf.length && crypto.timingSafeEqual(expectedBuf, computedBuf);
  if (!isValid) {
    throw new Error("Signature Stripe invalide.");
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > toleranceSeconds) {
    throw new Error("Signature Stripe expirée (horodatage trop ancien).");
  }
  return true;
}
