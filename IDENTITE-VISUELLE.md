# Identité visuelle — Fidions

Mise à jour le 02/10/2026 (teinte d'accent décalée du vert émeraude vers le turquoise, à la demande d'Adam — même structure de palette, seule la teinte change). Ce document résume la charte et les principes de direction artistique pour rester cohérent si tu (ou quelqu'un d'autre) ajoutes des pages ou des visuels plus tard.

## Contexte produit (pourquoi ces choix)

Fidions sert des commerces de proximité (cafés, boulangeries, salons) — un public qui veut un outil sérieux, pas un gadget de start-up — pour un produit qui vit surtout hors écran : comptoir, QR code, carte de fidélité dans le portefeuille. Le design évite volontairement les tics visuels "SaaS générique" (voir plus bas) et s'ancre dans la culture de la carte à tamponner : dégradés de carte de fidélité, tampons ronds, motifs concrets plutôt que décoratifs.

## Nom

- Nom de marque affiché : **Fidions**
- Nom technique (variables, slugs, nom de package) : `fidions`

## Logo

Un anneau géométrique presque fermé, avec un petit point qui marque l'endroit où la boucle se referme — une image simple de la fidélité qui se construit visite après visite, sans lettre ni monogramme.

Fichiers dans `public/` :
- `logo.png` (1024×1024) — version "badge" (carré arrondi noir encre, anneau turquoise) : utilisée partout où le logo doit tenir dans une case carrée (barre latérale, en-tête du site, favicon, icône iOS, image de partage sur les réseaux sociaux).
- `logo-full.svg` (fond transparent) — version "empilée" (anneau turquoise au-dessus, mot "fidions" en encre en dessous) : utilisée sur fond clair (écrans de connexion/inscription en colonne droite, page 404). Vectoriel, donc net à toute taille.
- `logo-full-white.svg` — même version "empilée", entièrement en blanc : utilisée sur fond coloré ou sombre (le panneau décoratif du split-login), là où la version turquoise/encre n'aurait pas assez de contraste pour rester lisible.
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` — déclinaisons du badge pour l'onglet du navigateur et l'écran d'accueil iOS.

Sources vectorielles (éditables) dans `brand/` si tu veux les retoucher toi-même ou les donner à un imprimeur/graphiste : `brand/badge.svg` (icône avec fond), `brand/mark.svg` (anneau seul, sans fond — sa couleur turquoise fixe ne convient qu'à un usage sur fond clair ; pour un fond sombre ou coloré, repars de `logo-full-white.svg` ou mets son tracé en blanc).

## Couleurs

Trois couleurs de marque fixes, étendues en une palette complète (uniquement des nuances des deux familles ci-dessous + un papier chaud neutre — jamais une teinte étrangère à la marque) :

**Encre** (texte, fonds sombres) :
- `#111114` — encre principale (texte, logo, fonds "premium" comme la carte fonctionnalité mise en avant)
- `#2A2B30` — encre secondaire (cartes/bordures sur fond sombre, pour éviter le noir plat partout)
- `#5B5F5D` — texte secondaire sur fond clair
- `#B8BCB8` — texte secondaire sur fond sombre (jamais le même gris que sur fond clair — sinon le contraste casse)

**Turquoise** (accent, boutons, éléments interactifs) :
- `#16A69C` — accent principal
- `#0F8C82` — accent foncé (hover, dégradés)
- `#E8F5F3` — teinte très claire (badges "Nouveau", surbrillance douce)
- `#CBEAE2` — bordure claire assortie
- `#8FD6CC` — variante claire pour texte/liens sur fond sombre

**Papier** (fonds clairs, jamais blanc pur) :
- `#F7F8F7` — fond clair
- `#F1EFE8` — fond clair secondaire, légèrement chaud (cartes, panneaux)
- `#0A0A0C` — fond sombre (sections contrastées : stats, pied de page, calculateur de ROI)

## Typographie

**Manrope** (Google Fonts, chargée sur tout le site via `pages/_document.js`) — une police sans-serif géométrique et lisible, cohérente avec le positionnement "outil pro" de Fidions. Graisses utilisées : 400 (texte courant), 500-600 (sous-titres, boutons), 700-800 (titres, logo).

## Principes directeurs

- **Varier le traitement des cartes selon leur importance** plutôt qu'un kit uniforme : sur la page d'accueil, la fonctionnalité phare (Wallet) a une carte plus grande et sombre, les nouveautés ont un fond turquoise clair, le reste reste neutre — pas trois douzaines de cartes identiques.
- **Un fond clair n'est jamais blanc pur** : toujours une nuance de papier chaud (`#F7F8F7`/`#F1EFE8`), pour éviter l'effet "template".
- **Le noir n'est jamais plat** : les sections sombres utilisent plusieurs nuances d'encre (`#111114`, `#2A2B30`, `#0A0A0C`), jamais une seule valeur uniforme.
- **Pas de tics de générateur IA** : pas de bandeau "eyebrow" en majuscules au-dessus de chaque titre, pas de flèche "→" systématique sur les boutons, pas de kit de cartes identiques à ombre grise molle.
- **Un texte secondaire change de couleur selon le fond** : `#5B5F5D` sur fond clair, `#B8BCB8` sur fond sombre — jamais la même valeur des deux côtés (repéré et corrigé plusieurs cas où ce n'était pas le cas).

## Où c'est appliqué

Remplacé partout où l'ancienne identité "Fidélions" (et son violet `#7414F4`/`#4a0ba3` et toutes ses variantes claires/foncées) apparaissait : barre latérale du commerçant, écrans de connexion/inscription (y compris le dégradé décoratif du panneau de connexion), page d'accueil (refonte structurelle : héro, cartes de fonctionnalités, calculateur, statistiques), pied de page, page 404, favicon, emails de campagne, cartes Google/Apple Wallet. Les images du logo passent en `object-fit: contain` dans leur emplacement pour rester nettes quelle que soit la taille exacte du fichier.

Le panneau décoratif du split-login (fond dégradé turquoise → encre) utilise `logo-full-white.svg`, pas la version colorée : un anneau turquoise sur un fond déjà turquoise n'a quasiment aucun contraste et devient invisible — piège repéré après coup sur ce panneau précis, à garder en tête pour tout futur fond coloré ou sombre.

Le domaine de production (`fidelions-app.vercel.app`) et le projet Vercel n'ont volontairement pas été renommés — seuls le nom affiché, les couleurs, la police, le logo et la mise en page ont changé.
