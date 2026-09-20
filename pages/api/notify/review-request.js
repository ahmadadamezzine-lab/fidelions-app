// pages/api/notify/review-request.js
//
// Appelé par Upstash QStash (voir lib/qstash.js), pas par un navigateur ni
// par pages/commercant.js — c'est le "rappel" programmé par
// maybeScheduleReviewRequest (lib/notifications.js) au moment du scan, qui
// se déclenche ici, plus tard, à l'heure exacte demandée (1h par défaut).
//
// Tout est RE-vérifié à cet instant plutôt que de faire confiance à l'état
// au moment de la programmation : entre les deux, le client a pu être
// bloqué, avoir laissé son avis en caisse entre-temps (plus la peine de le
// relancer), ou le commerçant a pu désactiver la fonctionnalité ou retirer
// son lien d'avis.

import { getClient, getEstablishmentInfo, getNotificationSettings, getMerchantById, getBranding, markReviewRequestSent, clearReviewRequestPending } from "../../../lib/db";
import { sendWalletMessage } from "../../../lib/walletObjects";
import { sendEmail } from "../../../lib/email";
import { checkNotifySecret } from "../../../lib/qstash";

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (!checkNotifySecret(req)) {
    return res.status(401).json({ error: "Non autorisé." });
  }

  const { merchantId, objectId } = req.body || {};
  if (!merchantId || !objectId) {
    return res.status(400).json({ error: "Paramètres manquants." });
  }

  try {
    const [client, settings, establishment] = await Promise.all([
      getClient(merchantId, objectId),
      getNotificationSettings(merchantId),
      getEstablishmentInfo(merchantId),
    ]);

    if (!client || client.blocked || client.reviewLeft || !settings.reviewRequestEnabled || !establishment.googleReviewUrl) {
      // Rien à envoyer — mais on lève quand même le verrou "en attente"
      // pour qu'un futur passage puisse re-déclencher une demande dans de
      // bonnes conditions plus tard.
      await clearReviewRequestPending(merchantId, objectId).catch(() => {});
      return res.status(200).json({ skipped: true });
    }

    const [merchant, branding] = await Promise.all([getMerchantById(merchantId), getBranding(merchantId)]);
    const restaurantName = merchant?.restaurantName || "Fidélions";

    // Lien de suivi : passe par notre propre site avant de rediriger vers
    // le vrai lien Google (voir pages/api/review-redirect.js) — utile pour
    // qu'Adam voie un jour le taux de clic réel de ces demandes, sans rien
    // changer au comportement pour le client (redirection immédiate).
    const trackedUrl = `${getBaseUrl(req)}/api/review-redirect?o=${encodeURIComponent(objectId)}`;

    // La notification Wallet ne peut pas contenir de bouton vers un lien
    // externe (l'API Google ne le permet pas sur un message push) — elle
    // sert donc de rappel visuel, le vrai bouton cliquable arrive par
    // email ci-dessous. Comme partout ailleurs sur Fidélions, un échec ici
    // n'empêche jamais le reste.
    try {
      await sendWalletMessage(objectId, settings.reviewRequestTitle, settings.reviewRequestBody);
    } catch (err) {
      console.error("Notification Wallet (demande d'avis) non envoyée :", err);
    }

    let emailSent = false;
    if (client.email) {
      try {
        await sendEmail({
          to: client.email,
          subject: settings.reviewRequestTitle,
          text: settings.reviewRequestBody,
          fromName: restaurantName,
          logoUrl: branding?.logoUrl,
          accentColor: branding?.hexColor,
          ctaLabel: settings.reviewRequestButtonLabel,
          ctaUrl: trackedUrl,
        });
        emailSent = true;
      } catch (err) {
        console.error("Email de demande d'avis non envoyé :", err);
      }
    }

    await markReviewRequestSent(merchantId, objectId);

    return res.status(200).json({ ok: true, emailSent });
  } catch (err) {
    console.error("cron notify/review-request :", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
