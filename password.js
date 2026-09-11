// lib/password.js
//
// Hachage du mot de passe des comptes commerçants. Utilise scrypt, intégré
// à Node.js (module "crypto") — volontairement pas de dépendance externe
// (type bcrypt) à ajouter, pour ne rien risquer sur l'installation des
// paquets au déploiement. scrypt est une fonction de hachage reconnue,
// volontairement lente et coûteuse en mémoire (résistante aux attaques par
// force brute), le même principe que bcrypt.

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/** Hache un mot de passe en clair. Renvoie une chaîne "sel:hash" à stocker. */
export async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(plain, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Vérifie un mot de passe en clair contre un hash "sel:hash" stocké.
 * Comparaison en temps constant (timingSafeEqual) pour ne pas laisser
 * fuiter d'information via le temps de réponse.
 */
export async function verifyPassword(plain, stored) {
  if (!plain || !stored || !stored.includes(":")) return false;
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  try {
    const derived = await scrypt(plain, salt, KEY_LENGTH);
    const storedBuffer = Buffer.from(hashHex, "hex");
    if (storedBuffer.length !== derived.length) return false;
    return timingSafeEqual(derived, storedBuffer);
  } catch {
    return false;
  }
}
