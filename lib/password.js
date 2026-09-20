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

// L'ancienne règle ("4 caractères minimum") acceptait des mots de passe
// comme "1234" ou "azer" — beaucoup trop faible pour un compte qui donne
// accès aux clients et aux campagnes d'un commerce. On monte à 8
// caractères + au moins une lettre ET un chiffre (pas de symbole imposé :
// ça n'ajoute pas grand-chose contre la force brute face à la longueur, et
// ça fait surtout fuir les gens vers des mots de passe notés sur un post-it).
//
// La liste ci-dessous bloque juste les mots de passe les plus évidents
// (variantes de "motdepasse"/"password", suites de chiffres...) — pas une
// vraie vérification "déjà fuité" façon Have I Been Pwned : ce service
// suppose un accès réseau vers une API externe à chaque inscription, or
// cet environnement n'a accès qu'à une liste d'hôtes autorisés (déjà
// observé avec `npm install`/pip, voir le README) et rien ne garantit que
// haveibeenpwned.com y sera toujours — mieux vaut une règle locale fiable à
// 100% qu'une dépendance externe qui peut se mettre à échouer en silence.
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "azerty123", "azertyui",
  "motdepasse", "password", "password1", "letmein123", "qwerty123",
  "00000000", "11111111", "abcd1234", "iloveyou1", "welcome123",
]);

/**
 * Renvoie null si le mot de passe est acceptable, sinon un message
 * d'erreur explicite à renvoyer tel quel au commerçant. Utilisé à
 * l'inscription ET au changement de mot de passe (voir lib/db.js et
 * pages/api/change-password.js) pour ne pas dupliquer la règle.
 */
export function validatePasswordStrength(plain) {
  if (!plain || plain.length < 8) {
    return "Le mot de passe doit faire au moins 8 caractères.";
  }
  if (!/[a-zA-ZÀ-ÿ]/.test(plain) || !/[0-9]/.test(plain)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  if (COMMON_PASSWORDS.has(plain.toLowerCase())) {
    return "Ce mot de passe est trop commun — choisis-en un moins évident.";
  }
  return null;
}
