// pages/api/stripe-webhook.js
//
// Reçoit les événements Stripe en temps réel — c'est ce qui rend le
// prélèvement récurrent et le verrouillage/déverrouillage d'accès
// totalement automatiques, "sans que jactive les trucs par moi meme" :
//
// - checkout.session.completed : le commerçant vient de valider son
//   paiement pour la première fois → on retient son client Stripe et son
//   abonnement, on passe le compte "actif" et on ouvre l'accès pour un
//   pont COURT (10 jours), pas jusqu'à la fin de la période payée — voir
//   plus bas pourquoi (prélèvement SEPA).
// - invoice.paid : Stripe vient de CONFIRMER un prélèvement réussi (carte
//   ou SEPA) → on prolonge l'accès jusqu'à la vraie échéance. Tant que ça
//   arrive chaque mois, l'accès ne s'arrête jamais.
//
// Pourquoi un pont de 10 jours à l'étape checkout.session.completed plutôt
// que d'ouvrir directement l'accès jusqu'à la fin du mois payé : depuis
// l'ajout du prélèvement SEPA (moins cher que la carte — 0,35 € fixe
// contre 1,5 % + 0,25 €, voir lib/stripe.js), "session complétée" ne veut
// plus forcément dire "argent bien reçu" — un prélèvement SEPA met jusqu'à
// 6 jours ouvrés avant d'être confirmé, et peut encore échouer pendant ce
// délai (compte insuffisant, etc.). Le pont de 10 jours couvre largement ce
// délai sans donner un mois entier d'accès sur un paiement pas encore
// confirmé ; dès que le prélèvement est réellement confirmé, invoice.paid
// écrase ce pont avec la vraie échéance (pour une carte, ça arrive presque
// instantanément, donc aucun effet pratique dans ce cas).
//
// Volontairement, on ne traite PAS invoice.payment_failed ni
// customer.subscription.deleted explicitement : `activeUntil` (lib/db.js)
// n'avance plus dès qu'un mois n'est pas payé ou que l'abonnement/
// l'engagement s'arrête, et getSubscriptionAccess reverrouille alors
// l'accès tout seul dès que cette date est dépassée — un seul mécanisme
// couvre tous les cas d'échec, pas besoin d'un cas particulier par type.

import {
  saveSubscriptionChoice,
  linkMerchantToStripeCustomer,
  getMerchantIdByStripeCustomer,
} from "../../lib/db";
import { verifyStripeSignature, retrieveSubscription } from "../../lib/stripe";

const CHECKOUT_BRIDGE_MS = 10 * 24 * 60 * 60 * 1000; // voir le commentaire en tête de fichier

// Signature Stripe vérifiée sur le corps BRUT de la requête — le
// bodyParser de Next doit donc être désactivé ici (seule route de tout le
// projet dans ce cas).
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    return res.status(400).json({ error: "Corps de requête illisible." });
  }
  const rawText = rawBody.toString("utf8");

  let event;
  try {
    verifyStripeSignature(rawText, req.headers["stripe-signature"]);
    event = JSON.parse(rawText);
  } catch (err) {
    console.error("Webhook Stripe rejeté :", err.message);
    return res.status(400).json({ error: `Webhook invalide : ${err.message}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const merchantId = session.client_reference_id || session.metadata?.merchantId;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;

      if (merchantId && stripeSubscriptionId) {
        // Accès ouvert pour un pont court (voir le commentaire en tête de
        // fichier) — jamais plus loin que la fin de la période payée elle-
        // même, au cas où une formule très courte existerait un jour.
        const subscription = await retrieveSubscription(stripeSubscriptionId).catch(() => null);
        const periodEndMs = subscription?.current_period_end ? subscription.current_period_end * 1000 : null;
        const bridgeMs = Date.now() + CHECKOUT_BRIDGE_MS;
        const activeUntil = periodEndMs ? Math.min(periodEndMs, bridgeMs) : bridgeMs;

        await linkMerchantToStripeCustomer(merchantId, stripeCustomerId);
        await saveSubscriptionChoice(merchantId, {
          status: "actif",
          stripeSubscriptionId,
          activeUntil,
        });
      }
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const stripeCustomerId = invoice.customer;
      const merchantId = await getMerchantIdByStripeCustomer(stripeCustomerId);
      const periodEndSeconds = invoice.lines?.data?.[0]?.period?.end;

      if (merchantId && periodEndSeconds) {
        await saveSubscriptionChoice(merchantId, {
          status: "actif",
          activeUntil: periodEndSeconds * 1000,
        });
      }
    }
  } catch (err) {
    // On répond quand même 200 : une erreur de traitement ici ne se
    // résoudra pas en laissant Stripe marteler de nouvelles tentatives, et
    // l'accès se reverrouille de toute façon tout seul si activeUntil ne
    // progresse plus (voir getSubscriptionAccess). L'erreur est loggée pour
    // investigation manuelle si besoin.
    console.error("Erreur de traitement du webhook Stripe :", err);
  }

  return res.status(200).json({ received: true });
}
