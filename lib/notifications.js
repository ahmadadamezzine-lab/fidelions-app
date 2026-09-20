// lib/notifications.js
//
// Logique de déclenchement des automatisations de l'onglet Notifications
// (demande d'avis Google après un passage). Séparé de pages/api/add-stamp.js
// pour rester lisible : add-stamp.js appelle juste maybeScheduleReviewRequest
// après avoir ajouté le point, sans se soucier des règles elles-mêmes.
//
// Le "quand redemander" est pensé pour ne jamais spammer un client (voir la
// demande d'Adam : "éviter de spammer le client, créer des scénarios
// automatiques pertinents") :
// - Nouveau client : une seule condition, le nombre de passages
//   (reviewRequestTriggerVisit, 2 par défaut — la carte créée compte comme
//   le 1er passage, donc 2 = son tout premier retour).
// - Client déjà sollicité : on ne redemande qu'après le délai de repos
//   (reviewRequestCooldownDays), et jamais plus de reviewRequestMaxAsks
//   fois au total.
// - Avis déjà laissé (déclaré en caisse, voir markClientReview) : jamais
//   redemandé.

import { getEstablishmentInfo, getNotificationSettings, markReviewRequestPending } from "./db";
import { scheduleDelayedCall } from "./qstash";

/**
 * Pure (aucun accès réseau) — separée pour rester facilement lisible/
 * vérifiable indépendamment de l'appel QStash.
 */
export function isReviewRequestDue(client, settings) {
  if (!client || client.blocked || client.reviewLeft) return false;
  if (client.reviewRequestPendingUntil && client.reviewRequestPendingUntil > Date.now()) return false;
  const askCount = client.reviewRequestCount || 0;
  if (askCount >= settings.reviewRequestMaxAsks) return false;
  if (askCount === 0) {
    return (client.visitCount || 1) >= settings.reviewRequestTriggerVisit;
  }
  const cooldownMs = settings.reviewRequestCooldownDays * 24 * 60 * 60 * 1000;
  return Date.now() - (client.reviewRequestSentAt || 0) >= cooldownMs;
}

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

/**
 * Appelé après un scan réussi (voir pages/api/add-stamp.js), jamais
 * bloquant : une erreur ici (QSTASH_TOKEN absent, appel réseau raté) ne
 * doit jamais faire échouer l'ajout de point lui-même, déjà enregistré à
 * ce stade — même philosophie que la notification Wallet/l'email de
 * secours juste au-dessus dans add-stamp.js.
 */
export async function maybeScheduleReviewRequest({ req, merchantId, objectId, client }) {
  try {
    const settings = await getNotificationSettings(merchantId);
    if (!settings.reviewRequestEnabled) return;

    const establishment = await getEstablishmentInfo(merchantId);
    if (!establishment.googleReviewUrl) return; // rien à proposer sans lien renseigné

    if (!isReviewRequestDue(client, settings)) return;

    // Verrouillé tout de suite, AVANT l'appel réseau à QStash : si le
    // client rescanne sa carte dans la minute qui suit, on ne veut pas
    // programmer une deuxième demande en double.
    await markReviewRequestPending(merchantId, objectId, settings.reviewRequestDelayHours);

    await scheduleDelayedCall({
      url: `${getBaseUrl(req)}/api/notify/review-request`,
      delaySeconds: settings.reviewRequestDelayHours * 3600,
      payload: { merchantId, objectId },
    });
  } catch (err) {
    console.error("Demande d'avis automatique non programmée :", err.message || err);
  }
}
