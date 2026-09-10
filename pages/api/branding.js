// pages/api/branding.js
//
// Personnalisation de la carte : couleur, logo, bannière — l'équivalent
// de la page "Personnaliser ma carte" chez Sydely. Remplace l'étape
// manuelle "modifie ta classe dans la Wallet Console" du README : tout se
// fait maintenant depuis /commercant. Réservé au patron.

import { getBranding, saveBranding, getMerchantById } from "../../lib/db";
import { uploadBrandingImage } from "../../lib/blob";
import { patchLoyaltyClassBranding, describeWalletError } from "../../lib/walletObjects";
import { getRole, getMerchantId } from "../../lib/auth";

// Un logo/bannière encodé en base64 peut peser plusieurs Mo — la limite
// par défaut de Next (1 Mo) est trop basse (même pattern que analyze-menu).
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }
  const merchantId = getMerchantId(req);

  if (req.method === "GET") {
    try {
      const branding = await getBranding(merchantId);
      return res.status(200).json(branding);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const { hexColor, logo, banner } = req.body || {};

      if (hexColor && !/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
        return res.status(400).json({ error: "Couleur invalide (format attendu : #7414F4)." });
      }

      let logoUrl;
      if (logo && logo.base64 && logo.mimeType) {
        const buffer = Buffer.from(logo.base64, "base64");
        logoUrl = await uploadBrandingImage(`${merchantId}/${logo.filename || "logo.png"}`, buffer, logo.mimeType);
      }

      let bannerUrl;
      if (banner && banner.base64 && banner.mimeType) {
        const buffer = Buffer.from(banner.base64, "base64");
        bannerUrl = await uploadBrandingImage(`${merchantId}/${banner.filename || "banniere.png"}`, buffer, banner.mimeType);
      }

      const branding = await saveBranding(merchantId, { hexColor, logoUrl, bannerUrl });

      // Non bloquant : la carte reste utilisable même si Google refuse la
      // mise à jour visuelle (ex : identifiants Wallet mal configurés) —
      // le commerçant voit l'erreur mais garde son enregistrement.
      let walletUpdated = true;
      let walletError = null;
      try {
        const merchant = await getMerchantById(merchantId);
        if (!merchant?.walletClassId) {
          throw new Error("Classe Google Wallet introuvable pour ce compte.");
        }
        await patchLoyaltyClassBranding(merchant.walletClassId, branding);
      } catch (err) {
        console.error("Branding Wallet non appliqué :", err?.response?.data || err);
        walletUpdated = false;
        walletError = describeWalletError(err);
      }

      return res.status(200).json({ ...branding, walletUpdated, walletError });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
