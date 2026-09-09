// lib/blob.js
//
// Héberge les images envoyées par le commerçant (logo, bannière de la
// carte) sur Vercel Blob (gratuit) pour obtenir une vraie URL publique
// HTTPS. Google Wallet l'exige pour programLogo/heroImage — un fichier
// envoyé "brut" (base64) ne suffit pas, il faut une adresse que les
// serveurs de Google peuvent aller chercher eux-mêmes.

import { put } from "@vercel/blob";

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo, largement suffisant pour un logo/bannière

export async function uploadBrandingImage(filename, buffer, contentType) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Fichier vide.");
  }
  if (buffer.length > MAX_SIZE) {
    throw new Error("Image trop lourde (5 Mo maximum).");
  }

  const token = (process.env.BLOB_READ_WRITE_TOKEN || "").trim();
  if (!token) {
    throw new Error(
      "Stockage d'images non configuré : il manque BLOB_READ_WRITE_TOKEN dans les variables d'environnement Vercel (Storage → créer un espace Vercel Blob)."
    );
  }

  const safeName = (filename || "image").replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`branding/${Date.now()}-${safeName}`, buffer, {
    access: "public",
    contentType: contentType || "image/png",
    token,
  });

  return blob.url;
}
