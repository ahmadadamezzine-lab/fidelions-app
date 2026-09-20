// lib/qstash.js
//
// Programme un appel HTTP différé, à l'heure exacte (ex : "1h après ce
// scan") — c'est ce qu'il manque à Vercel Cron pour les automatisations de
// l'onglet Notifications : Vercel Cron ne peut déclencher qu'une fois par
// jour sur le plan Hobby (voir vercel.json et le README, déjà utilisé pour
// la relance des inscriptions abandonnées), largement trop grossier pour
// "1h après le 2e passage". Upstash QStash (même compte que la base Redis
// déjà utilisée par tout le site — un seul token à copier en plus, voir le
// README) sait appeler une URL après un délai précis, sans qu'aucun
// serveur n'ait besoin de rester éveillé à compter les secondes entre
// temps : c'est QStash qui rappelle notre propre site au bon moment.
//
// Pas de librairie @upstash/qstash installée ici — même choix que
// lib/stripe.js pour Stripe : un simple fetch vers leur API REST suffit,
// pas besoin d'une dépendance de plus pour un seul appel.

const QSTASH_PUBLISH_URL = "https://qstash.upstash.io/v2/publish";

/**
 * Programme l'appel POST de `url` (avec `payload` en corps JSON) dans
 * `delaySeconds` secondes. QStash retentera lui-même automatiquement si
 * notre endpoint répond en erreur (comportement par défaut de QStash),
 * donc pages/api/notify/review-request.js peut se permettre d'échouer
 * franchement plutôt que d'avaler silencieusement une erreur.
 */
export async function scheduleDelayedCall({ url, delaySeconds, payload }) {
  const token = (process.env.QSTASH_TOKEN || "").trim();
  if (!token) {
    throw new Error(
      "QSTASH_TOKEN manquant : nécessaire pour programmer les demandes d'avis automatiques (voir le README, section Notifications automatiques)."
    );
  }
  // Un secret partagé (comme CRON_SECRET pour la relance des inscriptions
  // abandonnées) plutôt qu'une vérification cryptographique de la
  // signature QStash — plus simple, sans dépendance supplémentaire, et
  // largement suffisant : QStash transmet ce secret tel quel dans un
  // en-tête (mécanisme "Upstash-Forward-*") que pages/api/notify/
  // review-request.js vérifie avant d'envoyer quoi que ce soit.
  const secret = (process.env.QSTASH_FORWARD_SECRET || "").trim();

  const res = await fetch(`${QSTASH_PUBLISH_URL}/${encodeURIComponent(url)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Delay": `${Math.max(0, Math.round(delaySeconds))}s`,
      ...(secret ? { "Upstash-Forward-X-Notify-Secret": secret } : {}),
    },
    body: JSON.stringify(payload || {}),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Échec de programmation QStash (${res.status}) : ${body}`);
  }
  return res.json();
}

/**
 * Vérifie qu'un appel entrant sur un endpoint de notification programmée
 * vient bien de QStash (voir scheduleDelayedCall ci-dessus) — sans
 * QSTASH_FORWARD_SECRET configuré, on refuse tout par sécurité plutôt que
 * de laisser l'endpoint grand ouvert.
 */
export function checkNotifySecret(req) {
  const expected = (process.env.QSTASH_FORWARD_SECRET || "").trim();
  if (!expected) return false;
  return req.headers["x-notify-secret"] === expected;
}
