// pages/api/establishment.js
//
// Fiche établissement (onglet "Établissement") : type d'activité,
// coordonnées, description, horaires d'ouverture et photos — tout ce qui
// aide un client à connaître le commerce avant de venir. Pré-remplie à
// l'inscription (voir auth-signup.js), librement modifiable ensuite ici.
// Réservé au patron.

import { getEstablishmentInfo, saveEstablishmentInfo } from "../../lib/db";
import { uploadBrandingImage } from "../../lib/blob";
import { getRole, getMerchantId } from "../../lib/auth";

// Jusqu'à 4 photos en base64 dans le corps de la requête — la limite par
// défaut de Next (1 Mo) est trop basse (même pattern que branding.js).
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
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  const merchantId = getMerchantId(req);

  if (req.method === "GET") {
    try {
      const info = await getEstablishmentInfo(merchantId);
      return res.status(200).json(info);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const {
        businessType,
        businessTypeOther,
        phone,
        website,
        instagram,
        facebook,
        googleReviewUrl,
        description,
        hours,
        newPhotos,
        removedPhotoUrls,
      } = req.body || {};

      const current = await getEstablishmentInfo(merchantId);
      let photos = current.photos;

      if (Array.isArray(removedPhotoUrls) && removedPhotoUrls.length > 0) {
        photos = photos.filter((url) => !removedPhotoUrls.includes(url));
      }

      if (Array.isArray(newPhotos) && newPhotos.length > 0) {
        for (const photo of newPhotos) {
          if (photos.length >= 4) break;
          if (photo && photo.base64 && photo.mimeType) {
            const buffer = Buffer.from(photo.base64, "base64");
            const url = await uploadBrandingImage(
              `${merchantId}/etablissement-${Date.now()}-${photo.filename || "photo.jpg"}`,
              buffer,
              photo.mimeType
            );
            photos = [...photos, url];
          }
        }
        photos = photos.slice(0, 4);
      }

      const info = await saveEstablishmentInfo(merchantId, {
        businessType,
        businessTypeOther,
        phone,
        website,
        instagram,
        facebook,
        googleReviewUrl,
        description,
        hours,
        photos,
      });
      return res.status(200).json(info);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
