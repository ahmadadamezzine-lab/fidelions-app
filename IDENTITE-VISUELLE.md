# Identité visuelle — Fidions

Mise à jour le 28/09/2026 (rebranding complet depuis "Fidélions"). Ce document résume la charte pour rester cohérent si tu (ou quelqu'un d'autre) ajoutes des pages ou des visuels plus tard.

## Nom

- Nom de marque affiché : **Fidions**
- Nom technique (variables, slugs, nom de package) : `fidions`

## Logo

Un anneau géométrique presque fermé, avec un petit point qui marque l'endroit où la boucle se referme — une image simple de la fidélité qui se construit visite après visite, sans lettre ni monogramme.

Fichiers dans `public/` :
- `logo.png` (1024×1024) — version "badge" (carré arrondi noir encre, anneau vert émeraude) : utilisée partout où le logo doit tenir dans une case carrée (barre latérale, en-tête du site, favicon, icône iOS, image de partage sur les réseaux sociaux).
- `logo-full.svg` (fond transparent) — version "empilée" (anneau seul au-dessus, mot "fidions" en dessous) : utilisée sur les écrans de connexion/inscription et la page 404. Vectoriel, donc net à toute taille.
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` — déclinaisons du badge pour l'onglet du navigateur et l'écran d'accueil iOS.

Sources vectorielles (éditables) dans `brand/` si tu veux les retoucher toi-même ou les donner à un imprimeur/graphiste : `brand/badge.svg` (icône avec fond), `brand/mark.svg` (anneau seul, sans fond, pour un usage sur fond clair ou foncé).

## Couleurs

- **Noir encre (couleur principale)** : `#111114` — remplace le violet de marque et le texte principal de l'ancienne charte.
- **Vert émeraude (couleur d'accent — boutons, liens actifs, éléments interactifs)** : `#16A673`
- **Vert émeraude foncé (hover, dégradés)** : `#0F8C5F`
- **Fond clair (sections claires)** : `#F7F8F7`
- **Fond clair secondaire** : `#EFF2F0`
- **Fond sombre (sections contrastées : stats, pied de page)** : `#0A0A0C`
- **Texte principal** : `#111114`
- **Texte secondaire / gris** : `#5B5F5D`

## Typographie

**Manrope** (Google Fonts, chargée sur tout le site via `pages/_document.js`) — une police sans-serif géométrique et lisible, cohérente avec le positionnement "outil pro" de Fidions. Graisses utilisées : 400 (texte courant), 500-600 (sous-titres, boutons), 700-800 (titres, logo).

## Où c'est appliqué

Remplacé partout où l'ancienne identité "Fidélions" apparaissait (barre latérale du commerçant, écrans de connexion/inscription, page d'accueil, pied de page, page 404, favicon, emails de campagne, cartes Google/Apple Wallet). Les images du logo passent en `object-fit: contain` dans leur emplacement (au lieu d'être étirées) pour rester nettes quelle que soit la taille exacte du fichier.

Le domaine de production (`fidelions-app.vercel.app`) et le projet Vercel n'ont volontairement pas été renommés lors de ce rebranding — seuls le nom affiché, les couleurs, la police et le logo ont changé.
