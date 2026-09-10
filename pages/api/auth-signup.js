// pages/api/auth-signup.js
//
// Inscription en libre-service d'un nouveau restaurant sur Fidélions : un
// seul site, chaque commerçant crée son propre compte (email + mot de
// passe) au lieu d'un déploiement dédié par restaurant (voir l'ancien
// fonctionnement dans le README). Reçoit en une seule fois tout ce que le
// nouvel assistant d'inscription (3 étapes côté /commercant) a collecté —
// nom + logo, type d'activité, identifiants + téléphone — et crée d'un
// coup : le compte, la classe de fidélité Google Wallet (avec le logo
// envoyé s'il y en a un), la personnalisation de carte (onglet "Ma carte"),
// et la fiche établissement de départ (onglet "Établissement"). Avant
// l'inscription en libre-service, la classe Wallet se créait à la main
// dans la Wallet Business Console.

import {
  createMerchant,
  setMerchantWalletClassId,
  deleteMerchantAccount,
  saveBranding,
  saveEstablishmentInfo,
} from "../../lib/db";
import { insertLoyaltyClass, describeWalletError } from "../../lib/walletObjects";
import { signSession } from "../../lib/session";
import { uploadBrandingImage } from "../../lib/blob";

// Le logo optionnel envoyé à l'étape 1 de l'inscription voyage en base64
// dans le corps de la requête — la limite par défaut de Next (1 Mo) est
// trop basse (même pattern que branding.js/analyze-menu.js).
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const issuerId = (process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
  if (!issuerId) {
    return res.status(500).json({
      error:
        "Variable d'environnement manquante : GOOGLE_WALLET_ISSUER_ID (l'identifiant numérique de la Wallet Business Console — voir le README).",
    });
  }

  const { email, password, restaurantName, businessType, businessTypeOther, phone, logo } = req.body || {};

  let merchant;
  try {
    merchant = await createMerchant({ email, password, restaurantName, businessType, businessTypeOther, phone });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Inscription impossible." });
  }

  // Logo envoyé à l'étape 1 de l'inscription (facultatif) : on le
  // téléverse AVANT de créer la classe Wallet pour pouvoir lui donner
  // directement la bonne image — sinon on garde le logo Fidélions par
  // défaut, exactement comme avant cette fonctionnalité.
  let logoUrl = `${getBaseUrl(req)}/logo.png`;
  let uploadedLogoUrl = null;
  if (logo && logo.base64 && logo.mimeType) {
    try {
      const buffer = Buffer.from(logo.base64, "base64");
      uploadedLogoUrl = await uploadBrandingImage(
        `${merchant.id}/${logo.filename || "logo.png"}`,
        buffer,
        logo.mimeType
      );
      logoUrl = uploadedLogoUrl;
    } catch (err) {
      // Non bloquant : un logo raté à l'inscription ne doit pas empêcher
      // de créer le compte — le commerçant pourra le réessayer depuis
      // l'onglet "Ma carte".
      console.error("Logo d'inscription non téléversé (le logo par défaut est gardé) :", err);
    }
  }

  // La classe Wallet de ce restaurant : un identifiant dérivé de son
  // compte (unique), sous l'identifiant d'émetteur Fidélions (partagé,
  // celui de la Wallet Business Console).
  const classId = `${issuerId}.fid_${merchant.id.replace(/-/g, "")}`;

  try {
    await insertLoyaltyClass({
      classId,
      name: merchant.restaurantName,
      logoUrl,
      hexColor: "#7414F4",
    });
    await setMerchantWalletClassId(merchant.id, classId);
  } catch (err) {
    console.error("Création de la classe Wallet échouée :", err?.response?.data || err);
    // On annule la création du compte pour que l'email redevienne
    // disponible à une nouvelle tentative, plutôt que de laisser un
    // compte à moitié créé, inutilisable, bloquant cet email pour de bon.
    await deleteMerchantAccount(merchant.id).catch(() => {});
    return res.status(500).json({
      error: `Impossible de créer ta carte de fidélité Google Wallet (${describeWalletError(
        err
      )}). Ton compte n'a pas été créé — réessaie dans un instant.`,
    });
  }

  // Le compte et la carte existent déjà à ce stade : ce qui suit n'est
  // que du confort (logo visible tout de suite dans "Ma carte", fiche
  // établissement pré-remplie) — un échec ici n'annule plus rien, le
  // commerçant pourra toujours compléter ça lui-même depuis les onglets
  // correspondants.
  try {
    await saveBranding(merchant.id, { hexColor: "#7414F4", logoUrl: uploadedLogoUrl || null, bannerUrl: null });
  } catch (err) {
    console.error("Personnalisation initiale de la carte non enregistrée :", err);
  }
  try {
    await saveEstablishmentInfo(merchant.id, { businessType, businessTypeOther, phone });
  } catch (err) {
    console.error("Fiche établissement initiale non créée :", err);
  }

  const token = signSession({ merchantId: merchant.id });
  return res.status(200).json({
    token,
    merchantId: merchant.id,
    restaurantName: merchant.restaurantName,
    slug: merchant.slug,
    email: merchant.email,
  });
}
