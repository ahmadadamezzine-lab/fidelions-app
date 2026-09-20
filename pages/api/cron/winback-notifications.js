// pages/api/cron/winback-notifications.js
//
// Relance automatique d'un client qui n'est plus venu depuis un moment
// ("client inactif", voir la demande d'Adam : "après une certaine période
// sans visite : notification de retour"). Contrairement à la demande
// d'avis (déclenchée par un scan, programmée à l'heure près via QStash —
// voir pages/api/notify/review-request.js), l'inactivité se mesure en
// jours/semaines : une précision à l'heure près n'a aucun sens ici, donc
// un passage quotidien (Vercel Cron, voir vercel.json) suffit largement —
// même mécanisme que la relance des inscriptions abandonnées.
//
// Parcourt CHAQUE commerce (voir listAllMerchantIds dans lib/db.js) puis
// chacun de ses clients : pour un site avec beaucoup de commerces/clients,
// ça grossira avec le temps, mais reste raisonnable pour une exécution
// quotidienne au stade actuel — à surveiller si Fidélions grossit
// beaucoup (voir le README).
//
// Protégé par CRON_SECRET, exactement comme la relance des inscriptions
// abandonnées (voir ce fichier pour le détail du mécanisme).

import {
  listAllMerchantIds,
  getNotificationSettings,
  listClients,
  getMerchantById,
  getBranding,
  markWinbackSent,
} from "../../../lib/db";
import { sendWalletMessage } from "../../../lib/walletObjects";
import { sendEmail } from "../../../lib/email";

export default async function handler(req, res) {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) {
    return res.status(500).json({ error: "CRON_SECRET manquant côté serveur." });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorisé." });
  }

  try {
    const merchantIds = await listAllMerchantIds();
    let candidates = 0;
    let walletSent = 0;
    let emailSent = 0;

    for (const merchantId of merchantIds) {
      try {
        const settings = await getNotificationSettings(merchantId);
        if (!settings.winbackEnabled) continue;

        const inactivityMs = settings.winbackInactivityDays * 24 * 60 * 60 * 1000;
        const cooldownMs = settings.winbackCooldownDays * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const clients = await listClients(merchantId);
        const due = clients.filter((c) => {
          if (c.blocked) return false;
          const lastActivity = c.lastVisitAt || c.createdAt || 0;
          if (now - lastActivity < inactivityMs) return false;
          if (c.winbackSentAt && now - c.winbackSentAt < cooldownMs) return false;
          return true;
        });
        if (due.length === 0) continue;
        candidates += due.length;

        const [merchant, branding] = await Promise.all([getMerchantById(merchantId), getBranding(merchantId)]);
        const restaurantName = merchant?.restaurantName || "Fidélions";

        for (const client of due) {
          try {
            await sendWalletMessage(client.objectId, settings.winbackTitle, settings.winbackBody);
            walletSent++;
          } catch (err) {
            console.error(`Relance inactif (Wallet) échouée pour ${client.objectId} :`, err.message);
          }
          if (client.email) {
            try {
              await sendEmail({
                to: client.email,
                subject: settings.winbackTitle,
                text: settings.winbackBody,
                fromName: restaurantName,
                logoUrl: branding?.logoUrl,
                accentColor: branding?.hexColor,
              });
              emailSent++;
            } catch (err) {
              console.error(`Relance inactif (email) échouée pour ${client.objectId} :`, err.message);
            }
          }
          await markWinbackSent(merchantId, client.objectId).catch(() => {});
        }
      } catch (err) {
        // Un souci sur UN commerce (ex: réglages corrompus) ne doit pas
        // empêcher de traiter les suivants.
        console.error(`Relance inactif échouée pour le commerce ${merchantId} :`, err);
      }
    }

    return res.status(200).json({ ok: true, merchantsScanned: merchantIds.length, candidates, walletSent, emailSent });
  } catch (err) {
    console.error("cron winback-notifications :", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
