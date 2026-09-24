// lib/webpush.js
//
// Notifications push web (norme Web Push, PAS Google/Apple Wallet) pour la
// page carte client (/r/[slug]) : un client qui clique "Activer les
// notifications" reçoit un vrai push sur son téléphone/ordi même sans
// avoir Google Wallet, tant qu'il garde la page ouverte au moins une fois
// pour s'abonner (voir public/sw-push.js pour la réception côté navigateur
// et pages/api/push-subscribe.js pour l'enregistrement de l'abonnement).
//
// Clés VAPID : identifient CE serveur auprès des navigateurs/services push
// (Chrome, Firefox...) — une seule paire pour tout Fidélions, généré une
// fois avec `npx web-push generate-vapid-keys` et stocké en variables
// d'environnement (jamais dans le code, VAPID_PRIVATE_KEY est un secret).

import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:contact@fidelions.app",
      publicKey,
      privateKey
    );
  }
  configured = true;
}

export function isPushConfigured() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/**
 * Envoie une notification push à UN abonnement. Ne lève jamais côté
 * appelant : retourne juste `{ sent, gone }` — `gone: true` signifie que
 * l'abonnement n'est plus valide (désinstallation, notifications
 * bloquées...) et que l'appelant doit l'oublier (voir removeClientPushSubscription
 * dans lib/db.js), exactement comme un envoi Wallet qui échoue n'empêche
 * jamais le reste de la logique métier (voir pages/api/add-stamp.js).
 */
export async function sendPushNotification(subscription, { title, body, url }) {
  if (!isPushConfigured() || !subscription) return { sent: false, gone: false };
  ensureConfigured();
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, url: url || "/" })
    );
    return { sent: true, gone: false };
  } catch (err) {
    // 404/410 = abonnement expiré ou révoqué côté navigateur/service push.
    const gone = err?.statusCode === 404 || err?.statusCode === 410;
    if (!gone) console.error("Notification push non envoyée :", err?.message || err);
    return { sent: false, gone };
  }
}
