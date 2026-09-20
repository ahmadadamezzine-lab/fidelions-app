// pages/api/cron/abandoned-signup-emails.js
//
// Relance automatique, par email, de tout commerçant qui a rempli
// l'inscription (nom du commerce, mécanique de fidélité, formule) jusqu'à
// taper son email à la dernière étape (6/6), mais n'a jamais cliqué sur
// "Créer mon compte" — voir saveSignupLead dans lib/db.js. Inspiré de
// l'email de relance envoyé par Fidelix (un concurrent) à Adam lui-même :
// "il ne vous reste qu'une étape", signé par le fondateur.
//
// Déclenché une fois par jour par Vercel Cron (voir vercel.json) — chaque
// appel scanne les leads en attente et relance ceux qui datent d'entre 20h
// et 72h (assez de temps pour finir seul, pas assez pour relancer quelqu'un
// qui a abandonné il y a des semaines). Entièrement automatique : Adam n'a
// jamais à déclencher ça lui-même.
//
// Protégé par CRON_SECRET : Vercel Cron ajoute automatiquement l'en-tête
// `Authorization: Bearer <CRON_SECRET>` à ses propres appels dès que cette
// variable d'environnement existe (voir le README) — sans elle, n'importe
// qui pourrait déclencher l'envoi d'emails en appelant cette URL.
//
// IMPORTANT : cet email part à l'adresse du COMMERÇANT (pas la sienne),
// via Resend — voir le commentaire dans lib/email.js et le README : sans
// domaine vérifié sur Resend, l'adresse d'envoi partagée
// (onboarding@resend.dev) ne délivre de façon fiable qu'à l'adresse du
// compte Resend lui-même. Tant qu'aucun domaine n'est vérifié, cette
// relance ne touchera donc réellement personne d'autre qu'Adam en test —
// la fonctionnalité est prête, il manque juste cette étape côté Resend.

import { getPendingSignupLeadsForReminder, markSignupLeadReminderSent } from "../../../lib/db";
import { sendEmail } from "../../../lib/email";

const MIN_AGE_MS = 20 * 60 * 60 * 1000; // 20h
const MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72h

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

function buildEmailText({ restaurantName, continueUrl }) {
  const nom = restaurantName ? ` pour ${restaurantName}` : "";
  return `Bonjour,

Vous avez commencé à créer votre compte Fidélions${nom} il y a peu, mais l'inscription n'a pas été terminée.

Fidélions permet à vos clients de recevoir leur carte de fidélité directement sur leur téléphone (Google Wallet, Apple Wallet bientôt), sans aucune application à télécharger. Résultat : ils reviennent plus souvent, et ça se traduit directement par plus de chiffre d'affaires pour vous.

Il ne vous reste qu'une étape pour activer votre programme et commencer à fidéliser vos clients dès aujourd'hui :
${continueUrl}

Je suis disponible pour répondre à vos questions ou vous accompagner dans l'activation — n'hésitez pas à me contacter directement.

Cordialement,
Ahmad Adam Ezzine
Fondateur, Fidélions`;
}

export default async function handler(req, res) {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) {
    return res.status(500).json({ error: "CRON_SECRET manquant côté serveur." });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorisé." });
  }

  try {
    const leads = await getPendingSignupLeadsForReminder(MIN_AGE_MS, MAX_AGE_MS);
    const continueUrl = `${getBaseUrl(req)}/commercant?mode=signup`;

    let sent = 0;
    for (const lead of leads) {
      try {
        await sendEmail({
          to: lead.email,
          subject: "Il ne reste qu'une étape pour activer ton programme de fidélité",
          text: buildEmailText({ restaurantName: lead.restaurantName, continueUrl }),
          fromName: "Adam de Fidélions",
        });
        await markSignupLeadReminderSent(lead.email);
        sent += 1;
      } catch (err) {
        // Un échec d'envoi pour UN lead (adresse invalide, Resend en
        // rade...) ne doit pas empêcher de traiter les suivants — on
        // laisse celui-ci tenter sa chance au prochain passage du cron.
        console.error(`Relance inscription échouée pour ${lead.email} :`, err.message);
      }
    }

    return res.status(200).json({ ok: true, candidates: leads.length, sent });
  } catch (err) {
    console.error("cron abandoned-signup-emails :", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
