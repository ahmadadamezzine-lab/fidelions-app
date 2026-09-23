# Identité visuelle — Fidélions

Créée le 22/09/2026. Ce document résume la charte pour rester cohérent si tu (ou quelqu'un d'autre) ajoutes des pages ou des visuels plus tard.

## Logo

Nouveau logo (remplace l'ancien "F" générique) : un monogramme "F" géométrique dont la barre du haut se prolonge en un anneau — évoque à la fois la lettre et un jeton/point de fidélité qui vient s'accrocher à la carte.

Fichiers dans `public/` :
- `logo.png` (1024×1024) — version "badge" (carré arrondi violet, F blanc) : utilisée partout où le logo doit tenir dans une case carrée (barre latérale, en-tête du site, favicon, icône iOS).
- `logo-full.png` (960×740, fond transparent) — version "empilée" (F seul au-dessus, mot "FIDÉLIONS" en dessous) : utilisée sur les écrans de connexion/inscription et la page 404.
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` — déclinaisons du badge pour l'onglet du navigateur et l'écran d'accueil iOS.

Sources vectorielles (éditables) livrées à part si tu veux les retoucher toi-même ou les donner à un imprimeur/graphiste : `brand/badge.svg`, `brand/mark.svg` (F seul, sans fond, pour un usage sur fond clair ou foncé), `brand/full-lockup.svg`.

## Couleurs

- **Violet Fidélions (couleur principale)** : `#7414F4` — déjà la couleur de marque dans toute l'app (cartes Wallet, boutons, emails) ; gardée telle quelle plutôt que changée, pour ne pas perdre la reconnaissance déjà construite.
- **Violet foncé (dégradés, fonds sombres)** : `#4a0ba3`
- **Encre (texte principal)** : `#1a1a1a`
- **Fond clair (sections claires)** : `#faf8ff` / `#f6f5fc`
- **Fond sombre (sections contrastées : stats, pied de page)** : `#14101f` / `#0d0a15`

## Typographie

**Plus Jakarta Sans** (Google Fonts, déjà chargée sur tout le site via `pages/_document.js`) — une police sans-serif géométrique moderne, cohérente avec le positionnement "outil pro" de Fidélions. Graisses utilisées : 400 (texte courant), 600-700 (sous-titres, boutons), 800 (titres, logo).

## Où c'est appliqué

Remplacé partout où l'ancien logo apparaissait (barre latérale du commerçant, écrans de connexion/inscription, page d'accueil, pied de page, page 404, favicon). Les images passent maintenant en `object-fit: contain` dans leur emplacement (au lieu d'être étirées) pour rester nettes quelle que soit la taille exacte du fichier.
