// pages/api/add-stamp.js
//
// Appelé depuis l'espace commerçant (/commercant) ou depuis le lien
// employé (/scan/[token]) quand on scanne le QR d'un client ou qu'on
// clique "+1" manuellement. Met à jour la base de données ET la carte
// Wallet du client (solde + notif) — système de fidélité unique "points",
// à un ou plusieurs paliers de récompense (voir lib/loyalty.js).

import {
  getClient,
  addPoints,
  getLoyaltySettings,
  markTiersUnlocked,
  logStampEvent,
  markClientReview,
  recordEmployeeStamp,
  recordEmployeeReview,
  recordEmployeeRevenue,
} from "../../lib/db";
import { setLoyaltyPoints, sendWalletMessage } from "../../lib/walletObjects";
import { getRoleAsync } from "../../lib/auth";
import { computeSingleTierReward, computePointsRewards } from "../../lib/loyalty";

// Le bonus (en points) accordé une seule fois par client quand un avis
// Google est déclaré en caisse (case "Avis Google laissé" côté scan) — pas
// d'appel à une API Google, c'est une déclaration de l'employé/commerçant —
// est désormais réglable par le commerçant (onglet Fidélité, voir
// getLoyaltySettings/updateLoyaltySettings dans lib/db.js). Plus de
// constante fixe ici.

// Garde-fous serveur pour le mode "points" : le montant vient du
// formulaire (employé ou patron), donc jamais fiable à 100% — un montant
// de vente réel ne dépassera jamais ça, et ça borne aussi le nombre de
// points attribuables d'un coup si jamais un appel direct à l'API
// contournait l'interface.
const MAX_AMOUNT = 10000; // €
const MAX_DELTA = 5000; // points

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  // Le patron ET le lien employé (scan seul) peuvent ajouter un point —
  // c'est la seule action que ce dernier autorise.
  const auth = await getRoleAsync(req);
  if (!auth) {
    return res.status(401).json({ error: "Accès refusé." });
  }
  const merchantId = auth.merchantId;

  try {
    const { objectId, amount, reviewGiven } = req.body || {};
    if (!objectId) {
      return res.status(400).json({ error: "Identifiant client manquant." });
    }

    const existing = await getClient(merchantId, objectId);
    if (!existing) {
      return res
        .status(404)
        .json({ error: "Client introuvable — le QR scanné ne correspond à aucune carte Fidélions." });
    }
    if (existing.blocked) {
      return res
        .status(403)
        .json({ error: "Ce client est bloqué — débloque-le depuis la liste pour lui ajouter un point." });
    }

    const { tiers, mode, pointsConfig, reviewBonusPoints } = await getLoyaltySettings(merchantId);

    // Mode "points" (montant dépensé) : le delta dépend de l'addition ;
    // mode "stamps" (par défaut) ou montant non renseigné : comportement
    // historique, toujours +1 par passage. `spentAmount` est gardé à part
    // (hors du calcul de `delta`) pour alimenter le classement "CA généré"
    // de l'onglet Équipe (voir recordEmployeeRevenue plus bas).
    let delta = 1;
    let spentAmount = null;
    if (mode === "points") {
      const amt = Number(amount);
      if (Number.isFinite(amt) && amt > 0 && amt <= MAX_AMOUNT) {
        const unit = pointsConfig.amountUnit || 10;
        const perAmount = pointsConfig.pointsPerAmount || 1;
        delta = Math.max(1, Math.round((amt / unit) * perAmount));
        spentAmount = amt;
      } else if (Number.isFinite(amt) && amt > MAX_AMOUNT) {
        return res.status(400).json({ error: `Montant trop élevé (maximum ${MAX_AMOUNT} €).` });
      }
    }

    // Bonus avis Google : une seule fois par client, ajouté au même delta
    // pour ne déclencher qu'UNE notification/mise à jour de solde.
    const reviewBonusApplied = !!reviewGiven && !existing.reviewLeft;
    if (reviewBonusApplied) {
      delta += reviewBonusPoints;
    }

    // Garde-fou final, quel que soit le mode.
    delta = Math.min(delta, MAX_DELTA);

    const updated = await addPoints(merchantId, objectId, delta);

    // Un seul palier défini → carte classique, la récompense se
    // redéclenche à chaque multiple du seuil (comportement historique,
    // ex : "10 points = café offert", encore et encore). Plusieurs
    // paliers → chacun ne se débloque qu'UNE fois, comme des étapes
    // (ex : 20 = pizza, 30 = pizza + boisson).
    let rewardReached;
    let notifHeader;
    let notifBody;

    if (tiers.length > 1) {
      const result = computePointsRewards(updated.points, tiers, existing.unlockedTiers);
      rewardReached = result.rewardReached;
      if (rewardReached) {
        await markTiersUnlocked(merchantId, objectId, result.newlyUnlockedIndexes);
        notifHeader = "Récompense débloquée !";
        notifBody = `Bravo, ${result.label} est disponible — montrez cette carte en caisse.`;
      } else {
        notifHeader = `+${delta} point${delta > 1 ? "s" : ""} !`;
        notifBody = result.nextTierLabel
          ? `Plus que ${result.remaining} point(s) avant : ${result.nextTierLabel}.`
          : "Continuez, une récompense arrive bientôt !";
      }
    } else {
      const result = computeSingleTierReward(updated.points, tiers, existing.points);
      rewardReached = result.rewardReached;
      notifHeader = rewardReached ? "Récompense débloquée !" : `+${delta} point${delta > 1 ? "s" : ""} !`;
      notifBody = rewardReached
        ? `Bravo, ${result.label} est disponible — montrez cette carte en caisse.`
        : `Plus que ${result.remaining} point(s) avant : ${result.label}.`;
    }

    if (reviewBonusApplied) {
      await markClientReview(merchantId, objectId);
      notifBody = `Merci pour votre avis Google (+${reviewBonusPoints} points) ! ${notifBody}`;
    }

    // Attribution à l'employé qui a fait le scan (uniquement si l'action
    // vient du lien employé — voir getRoleAsync dans lib/auth.js), pour le
    // classement de l'onglet Équipe. Non bloquant : un souci ici ne doit
    // jamais empêcher l'ajout de point lui-même.
    if (auth.role === "employee" && auth.employeeId) {
      try {
        await recordEmployeeStamp(merchantId, auth.employeeId, objectId);
        if (reviewBonusApplied) await recordEmployeeReview(merchantId, auth.employeeId);
        if (spentAmount) await recordEmployeeRevenue(merchantId, auth.employeeId, spentAmount);
      } catch (err) {
        console.error("Statistiques employé non mises à jour :", err);
      }
    }

    await setLoyaltyPoints(objectId, updated.points, "Points");
    await logStampEvent(merchantId, { objectId, delta, rewardReached });

    // Le point lui-même (solde + base de données) est déjà enregistré à ce
    // stade. La notification est un bonus : si Google refuse (ex : quota de
    // 3 notifications/24h dépassé pour cette carte), on ne fait pas
    // échouer tout l'ajout de point pour autant — le commerçant voit
    // quand même la confirmation.
    let notificationSent = true;
    try {
      await sendWalletMessage(objectId, notifHeader, notifBody);
    } catch (err) {
      console.error("Notification Wallet non envoyée :", err);
      notificationSent = false;
    }

    return res.status(200).json({ client: updated, rewardReached, notificationSent, delta, reviewBonusApplied });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
