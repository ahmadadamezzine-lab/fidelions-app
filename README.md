# Fidélions — plateforme multi-restaurants

Un seul site, plusieurs restaurants : chaque commerçant crée son propre compte sur `/commercant` (email + mot de passe) et obtient son propre lien d'inscription client, sa propre carte Google Wallet, ses propres clients, ses propres réglages — tout est isolé par compte. Coût : 0 €, hébergé gratuitement sur Vercel.

> Avant, ce projet fonctionnait en mode "un site par restaurant" (un mot de passe unique défini dans les variables d'environnement). Ce README décrit la nouvelle version multi-comptes. Si tu avais déjà un site déployé avec des vraies données dedans, va directement à la section **Migrer un compte existant** après avoir déployé cette version.

## Ce que fait ce projet

1. Un restaurant crée son compte sur `tonsite.vercel.app/commercant` (nom du restaurant, email, mot de passe) — ça crée automatiquement sa propre classe de fidélité Google Wallet, en quelques secondes, sans passer par la Wallet Business Console.
2. Une fois connecté, l'onglet **Partager** lui donne son propre QR code et son propre lien d'inscription (`tonsite.vercel.app/r/son-nom-de-restaurant`) à afficher en caisse ou sur ses tables.
3. Un client scanne ce QR (ou ouvre le lien), entre son prénom et son email (obligatoire, pour recevoir les campagnes) et son téléphone (optionnel, pour plus tard), puis clique "Créer ma carte".
4. Une carte de fidélité est créée pour lui (avec un QR unique dessus, aux couleurs du restaurant) et Google Wallet propose de l'ajouter au téléphone. Il reçoit aussi son lien de parrainage à partager.
5. À chaque visite, le commerçant ouvre `/commercant`, clique "Activer la caméra" (le navigateur demande l'autorisation la première fois — il faut accepter), et vise le QR de la carte du client. Il peut aussi taper son prénom. Puis clique "+1 tampon" : ça met à jour la carte du client en direct, avec une notification push.
6. Quand un client atteint le seuil de tampons voulu, une notification "Récompense débloquée" est envoyée automatiquement. Le seuil (ex : 10 tampons) et la récompense elle-même (ex : "1 café offert") sont réglables directement dans `/commercant` — pas besoin de toucher au code.
7. L'espace commerçant liste aussi tous les clients (de CE restaurant uniquement) et leur nombre de visites (traçabilité).
8. Le commerçant peut aussi envoyer une "campagne" : un message (promo, nouveau plat, événement…) qui arrive d'un coup dans le Google Wallet de tous ses clients.
9. `/commercant` affiche un mini tableau de bord (clients inscrits, tampons distribués, visites du jour, récompenses débloquées) et un classement de fidélité (top 5 clients).
10. Chaque restaurant peut donner un accès limité à ses employés (juste ajouter des tampons, sans les stats ni les campagnes, sauf s'il les y autorise) via l'onglet "Employés" de `/commercant` : un seul lien à envoyer (SMS/WhatsApp) à toute l'équipe, puis chaque employé s'identifie sur ce lien avec son propre code personnel à 4 chiffres. Pour chaque employé, le commerçant choisit : les jours où il peut se connecter, une plage horaire optionnelle (ex. 9h-15h), et les rubriques auxquelles il a accès en plus du scan (liste des clients, statistiques, envoi de campagnes) — de quoi avoir plusieurs types d'employés, certains avec plus de responsabilités que d'autres. Un code hors de ses jours/horaires autorisés, ou désactivé, est refusé comme s'il n'existait pas ; deux employés ne peuvent pas avoir le même code (le site refuse et le signale). Le lien commun peut être régénéré à tout moment (coupe l'accès à toute l'équipe d'un coup), ou un employé désactivé/modifié/supprimé individuellement sans toucher aux autres.
11. Les campagnes peuvent partir par notification Wallet et/ou par email — au choix, avec une case à cocher pour chaque canal. L'email étant obligatoire à l'inscription, tous les clients sont éligibles au canal email.
12. La notification Wallet EST déjà une vraie notification "façon Snapchat/Insta" : quand un message part, le téléphone du client reçoit une alerte sur son écran de verrouillage (si les notifications Wallet sont activées sur son téléphone), et le message reste aussi consultable en ouvrant la carte dans l'app Google Wallet (en dessous du QR code). Un canal SMS séparé (comme un vrai texto) est possible mais payant (~0,04 à 0,08 € par SMS via un service comme Twilio, + un abonnement) — pas encore branché. Le champ téléphone est déjà collecté pour le jour où ce sera activé.
13. `/commercant` affiche aussi une "Analyse automatique" : quelques phrases générées à partir des propres données du restaurant (croissance des inscriptions, client le plus fidèle, clients à 1-2 tampons de la récompense, clients qu'il faudrait relancer). Ce n'est pas un vrai modèle d'IA payant — ce sont des règles simples qui lisent les chiffres du compte.
14. Chaque client de la liste ("Ou recherchez un client") a un menu "⋮" : ✏️ Renommer (corrige aussi le nom affiché sur sa carte Wallet), 🔒 Bloquer (grisé, exclu des stats/classement/campagnes mais gardé pour trace), 🗑️ Supprimer (définitif, avec un deuxième clic de confirmation).
15. Le champ récompense a des présets en un clic ("1 café offert", "10% de réduction"...) et un aperçu en direct de ce que ça donnera.
16. Carte "Analyse du menu & suggestions (IA)", rangée dans l'onglet **Statistiques** : importe le menu tel quel — texte collé/écrit, ou glisse-dépose un fichier `.txt`, PDF, ou simple photo prise au téléphone — et une vraie IA (Google Gemini, gratuite) le lit et le comprend toute seule, puis propose des idées de promotions concrètes qui citent les propres plats et prix du restaurant. Juste en dessous, "Ton offre actuelle" est un texte 100% libre. Voir l'étape 3ter ci-dessous pour activer la clé IA (gratuite, sans carte bancaire) ; tant qu'elle n'est pas configurée, une analyse basique (règles simples) prend le relais automatiquement pour le texte collé/écrit — mais PDF et photo demandent la vraie clé IA. En cas de pic de charge chez Google (erreur 503), le site réessaie automatiquement une fois avant d'abandonner.
17. `/commercant` est organisé en rubriques dans un vrai menu latéral fixé tout à gauche de l'écran sur ordinateur/tablette, et en rangée d'onglets défilante sur mobile. Rubriques : **Aperçu**, **Partager**, **Clients**, **Notifications**, **Ma carte**, **Récompenses**, **Employés**, **Géolocalisation**, **Statistiques**, **API & développeurs**, puis un groupe **Compte** séparé : **Établissement**, **Abonnement**, **Support**, **Paramètres**.
18. Onglet **Partager** : le QR code d'inscription et le lien public **propre à ce restaurant** (`/r/son-slug`), affichés directement dans le tableau de bord (avec un bouton pour télécharger l'image à imprimer et un bouton pour copier le lien).
19. Onglet **Récompenses** : choisit juste le mot affiché ("tampons" ou "points"), puis écrit librement autant de récompenses que voulu, chacune avec son propre seuil (ex : 20 tampons → pizza offerte, 30 → pizza + boisson offertes). Il y a toujours au moins une récompense modifiable (impossible de tout supprimer).
20. Onglet **Statistiques** : en plus de l'analyse IA du menu, 3 chiffres clés (points/tampons de la semaine, nouveaux clients, récompenses du mois, avec leur évolution en %) et 4 graphes (distribution par jour sur 14 jours, heures de pointe, jours de la semaine les plus actifs, nouveaux clients par semaine).
21. Onglet **Ma carte** : change la couleur, le logo et la bannière affichés sur la carte Google Wallet des clients directement depuis le site (stocké sur Vercel Blob, gratuit — voir étape 3quater) — les cartes déjà distribuées se mettent à jour toutes seules.
22. Onglet **Géolocalisation** : tape l'adresse du restaurant — autocomplétion d'adresses françaises réelles au fil de la frappe — et Google Wallet avertit tout seul les clients équipés qui passent à proximité. Un message personnalisé reste affiché en permanence sur la carte (Google ne permet pas, à ce jour, de personnaliser le texte de sa notification-popup native de proximité elle-même).
23. Onglet **Support** : les réponses aux blocages les plus fréquents, consultables à toute heure.
24. Rubriques **API & développeurs**, **Établissement**, **Abonnement** et **Paramètres** : présentes dans le menu mais annoncées honnêtement "bientôt disponible".

## Étape 1 — Créer le compte de service Google Cloud (obligatoire, une seule fois pour toute la plateforme)

Ce compte signe les cartes de TOUS les restaurants qui s'inscriront sur le site — comme un compte Stripe qui sert plusieurs marchands. Une seule fois, jamais à refaire par restaurant.

1. Va sur console.cloud.google.com
2. En haut, ouvre le sélecteur de projet. Si un projet existe déjà (créé automatiquement avec ta Wallet Business Console), sélectionne-le. Sinon "Nouveau projet" → nomme-le `fidelions` → Créer.
3. Barre de recherche en haut → tape `Google Wallet API` → clique sur le résultat → clique `Activer` (si ce n'est pas déjà fait).
4. Menu ☰ (en haut à gauche) → `IAM et administration` → `Comptes de service`.
5. `Créer un compte de service` → nom : `fidelions-wallet-service` → `Continuer` → `Continuer` → `OK`/`Terminer` (pas besoin de rôle IAM ici).
6. Clique sur le compte de service que tu viens de créer → onglet `Clés` → `Ajouter une clé` → `Créer une clé` → format `JSON` → `Créer`.
7. Un fichier `.json` se télécharge. **Garde-le précieusement, ne l'envoie à personne, ne le mets jamais en ligne.** Il contient une clé privée.

## Étape 2 — Autoriser ce compte de service dans la Wallet Business Console

1. Retourne sur pay.google.com/business/console
2. Menu de gauche → `Utilisateurs`.
3. `Inviter un utilisateur` (ou le bouton `+`).
4. Colle l'email du compte de service (champ `client_email` dans le fichier JSON téléchargé, ressemble à `fidelions-wallet-service@fidelions.iam.gserviceaccount.com`).
5. Choisis le rôle `Administrateur`.
6. Valide.

## Étape 2bis — Retrouver ton identifiant "issuer" Google Wallet

Chaque nouveau restaurant qui s'inscrit sur le site a besoin d'une classe de fidélité qui lui est propre, créée automatiquement. Pour ça, le site a besoin de ton identifiant d'émetteur (le même pour tous les restaurants) :

1. Ouvre le fichier JSON de l'étape 1, ou regarde l'ID de classe que tu avais peut-être déjà créé à la main dans la Wallet Business Console (ex. `3388000000023199659.fidelions_loyalty`).
2. Ton `GOOGLE_WALLET_ISSUER_ID` est la partie AVANT le premier point : `3388000000023199659`.
3. Si tu n'as jamais créé de classe manuellement, cet identifiant est aussi visible sur pay.google.com/business/console, page d'accueil (en général en haut, ou dans les infos du compte).

## Étape 3 — Créer la base de données (Upstash Redis, gratuit)

1. Va sur `vercel.com`, ouvre ton projet `fidelions-app`.
2. Onglet `Storage` (en haut) → `Create Database`.
3. Choisis `Upstash` puis `Redis` (offre gratuite).
4. Donne-lui un nom (ex. `fidelions-db`) → `Create`.
5. Sur l'écran suivant, coche ton projet `fidelions-app` puis `Connect` — Vercel ajoute automatiquement les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` à ton projet, tu n'as rien à copier toi-même.

## Étape 3bis — Activer l'envoi d'emails pour les campagnes (optionnel, gratuit)

Sans cette étape, les campagnes partent quand même par notification Wallet — c'est juste pour ajouter le canal email.

1. Va sur `resend.com` → `Sign up` → crée un compte gratuit.
2. Une fois connecté, menu de gauche → `API Keys`.
3. `Create API Key` → donne-lui un nom (ex. `fidelions`) → `Add`.
4. Copie la clé affichée (elle commence par `re_`) — elle ne sera plus jamais réaffichée en entier.

Tu ajouteras cette clé comme variable `RESEND_API_KEY` à l'étape 4 juste en dessous.

**⚠️ Important, à ne pas sauter :** tant qu'aucun domaine n'est vérifié sur Resend, les emails partent depuis leur adresse partagée `onboarding@resend.dev` — celle-ci ne délivre de façon fiable QUE vers l'adresse email de ton propre compte Resend (toi). Concrètement : les emails de notification "+1 point" à tes clients, les campagnes par email, et la relance automatique des inscriptions abandonnées (voir plus bas) ne toucheront réellement personne d'autre que toi tant que cette étape n'est pas faite — ils partiront "avec succès" côté code, mais n'arriveront jamais vraiment chez le client. Pour les activer pour de vrai :

1. Achète un nom de domaine si tu n'en as pas déjà un (ex. sur `namecheap.com` ou `ovh.com`, quelques euros/an) — par exemple `fidelions.fr` ou `fidelions.app`.
2. Sur `resend.com`, menu de gauche → `Domains` → `Add Domain` → tape ton domaine.
3. Resend affiche 3-4 enregistrements DNS (des lignes `TXT`/`MX`/`CNAME`) → va les ajouter chez ton fournisseur de domaine (l'endroit où tu l'as acheté, dans la zone DNS), en collant chaque valeur exactement comme affichée.
4. Reviens sur Resend, clique `Verify` — ça peut prendre de quelques minutes à quelques heures selon le fournisseur.
5. Une fois vérifié, ajoute la variable `RESEND_FROM_EMAIL` (étape 4 ci-dessous) avec une adresse de ce domaine, par exemple `contact@fidelions.fr`.

Sans domaine à toi, il n'existe pas de raccourci — c'est une limite du service Resend lui-même (et de tous ses concurrents), pas quelque chose que le code peut contourner.

## Étape 3ter — Activer la vraie IA pour l'analyse du menu (gratuit, sans carte bancaire)

Sans cette étape, la carte "Analyse du menu & suggestions" fonctionne quand même pour du texte collé/écrit (avec une analyse basique par règles), mais ne peut pas lire un PDF ou une photo de menu. Cette clé est gratuite chez Google, sans carte bancaire à saisir.

1. Va sur `aistudio.google.com/apikey`
2. Connecte-toi avec un compte Google (le même que pour Wallet ou un autre, peu importe).
3. Clique sur `Create API key` (ou `Créer une clé API`).
4. Choisis `Create API key in new project` si on te le demande.
5. Une clé s'affiche (elle commence par `AIza...`) — clique sur l'icône de copie à côté.

Tu ajouteras cette clé comme variable `GEMINI_API_KEY` à l'étape 4 juste en dessous.

**⚠️ Le quota gratuit de Gemini se partage entre TOUS les commerces du site** et se mesure par minute — s'il est atteint, l'analyse affiche "Limite gratuite Gemini atteinte" et réessaie toute seule 60 secondes plus tard (rien à faire). Pour ne plus jamais dépendre uniquement de ça, ajoute aussi le filet de secours ci-dessous : dès que `GROQ_API_KEY` existe, le site bascule automatiquement dessus le temps que Gemini se libère, sans qu'aucun commerçant s'en aperçoive.

### Filet de secours "IA open source" (Groq, gratuit, sans carte bancaire)

Groq héberge gratuitement plusieurs IA à poids ouverts (Meta Llama — contrairement à Gemini ou ChatGPT qui sont propriétaires), sur un quota totalement séparé de celui de Google. Dès que la clé ci-dessous est ajoutée, le site l'utilise **automatiquement** si Gemini est à quota ou indisponible — pas de bouton ni de réglage, ça se fait tout seul. Limite honnête à connaître : ce filet de secours sait lire du texte collé et des photos, mais pas encore un PDF directement (dans ce cas rare, le site le dit clairement et propose de coller le texte ou de prendre une photo à la place).

1. Va sur `console.groq.com` → connecte-toi (email ou compte Google, gratuit, aucune carte demandée).
2. Menu de gauche → `API Keys`.
3. `Create API Key` → donne-lui un nom (ex. `fidelions`) → `Submit`.
4. Copie la clé affichée (elle commence par `gsk_...`) — comme pour Gemini, elle ne sera plus jamais réaffichée en entier.

Tu ajouteras cette clé comme variable `GROQ_API_KEY` à l'étape 4 juste en dessous.

## Étape 3quater — Activer le stockage d'images pour "Ma carte" (gratuit)

Sans cette étape, tout le reste fonctionne normalement — c'est juste l'onglet "Ma carte" (logo/bannière) qui affichera une erreur si on essaie d'envoyer une image. La couleur, elle, fonctionne sans rien à activer.

1. Va sur `vercel.com`, ouvre ton projet `fidelions-app`.
2. Onglet `Storage` (en haut) → `Create Database`.
3. Choisis `Blob` (offre gratuite) → une fenêtre "Create Blob Store" s'ouvre.
4. `Store Name` : remplace le texte par `fidelions-images`.
5. `Region` : laisse la valeur par défaut.
6. `Access` : choisis **`Public`** (PAS "Private" même si c'est marqué "Recommended" — Google Wallet doit pouvoir aller chercher lui-même le logo/la bannière, donc l'image doit être publique).
7. Coche la case **`Add a read-write token env var to this connection`** — sans elle, la variable `BLOB_READ_WRITE_TOKEN` (celle dont le site a besoin) n'est pas créée.
8. Clique `Create` (en bas de la fenêtre).
9. Sur l'écran suivant, coche ton projet `fidelions-app` puis `Connect`.

## Étape 3quinquies — Activer la connexion "Continuer avec Google" (optionnel, gratuit)

Sans cette étape, tout fonctionne normalement — les boutons "Google" restent juste inactifs et affichent une erreur claire si on clique dessus, la connexion par email + mot de passe marche déjà très bien. Cette étape est à faire une seule fois, pour toute la plateforme (pas par restaurant).

Pas de connexion Apple pour l'instant : elle demande en plus un compte payant Apple Developer (~99 $/an), alors que Google est gratuit — activable plus tard sur le même principe si besoin.

1. Va sur `console.cloud.google.com` (connecte-toi avec un compte Google).
2. En haut, ouvre le sélecteur de projet → `Nouveau projet` → nom `Fidelions` → `Créer`. Une fois créé, sélectionne-le (en haut, vérifie qu'il est bien actif).
3. Menu ☰ (en haut à gauche) → `API et services` → `Écran de consentement OAuth`.
4. Type d'utilisateur : `Externe` → `Créer`.
5. Renseigne : `Nom de l'application` → `Fidélions`, `E-mail d'assistance utilisateur` → ton email, en bas `Coordonnées du développeur` → ton email à nouveau → `Enregistrer et continuer` sur chaque écran suivant (Champs d'application : rien à changer, `Enregistrer et continuer` ; Utilisateurs test : rien à ajouter, `Enregistrer et continuer` ; puis `Retour au tableau de bord`).
6. Menu ☰ → `API et services` → `Identifiants` → en haut `+ Créer des identifiants` → `ID client OAuth`.
7. `Type d'application` → `Application Web`. `Nom` → `Fidélions - commerçant`.
8. Sous `URI de redirection autorisés` → `+ Ajouter un URI` → colle exactement :
   `https://fidelions-app.vercel.app/api/auth-google-callback`
9. `Créer`. Une fenêtre affiche `ID client` et `Code secret du client` — garde cette fenêtre ouverte (ou clique `Télécharger le fichier JSON`).
10. Sur `vercel.com`, ton projet `fidelions-app` → `Settings` → `Environment Variables`, ajoute :
    - `GOOGLE_OAUTH_CLIENT_ID` → la valeur `ID client` de l'étape 9
    - `GOOGLE_OAUTH_CLIENT_SECRET` → la valeur `Code secret du client` de l'étape 9
11. `Deployments` → `⋯` sur le déploiement le plus récent → `Redeploy` (les nouvelles variables ne sont prises en compte qu'après un redéploiement).
12. Sur `/commercant`, le bouton `Google` fonctionne désormais : un commerçant déjà inscrit est connecté directement ; un email Google inconnu ouvre l'inscription avec l'email déjà rempli (le mot de passe n'est plus demandé, il se reconnectera toujours via Google).

Tant que l'écran de consentement reste en mode "Test" (étape 5), seuls les comptes Google ajoutés comme "Utilisateurs test" peuvent se connecter — pour l'ouvrir à tout le monde : `Écran de consentement OAuth` → `Publier l'application` → `Confirmer` (aucune revue Google n'est nécessaire pour les scopes utilisés ici : email/profil de base).

## Étape 3sexies — Activer le paiement automatique (Stripe)

Sans cette étape, tout le reste fonctionne normalement : chaque commerce a ses 7 jours d'essai gratuit comme avant, mais le bouton "Activer mon abonnement" (verrou de fin d'essai, bannière d'essai, onglet Abonnement) affiche une erreur claire tant que Stripe n'est pas branché — à faire donc dès que tu veux réellement encaisser un paiement. Une fois fait, PLUS RIEN À FAIRE À LA MAIN ENSUITE : le prélèvement mensuel, l'activation du compte, et le reverrouillage en fin d'engagement ou en cas d'échec de paiement se font tout seuls (voir la section **Abonnement** plus bas).

1. Va sur `stripe.com` → `Créer un compte` (gratuit, aucun abonnement Stripe — Stripe prend juste un petit pourcentage sur chaque paiement encaissé). Renseigne les infos de ton activité ; tu peux commencer les étapes suivantes avant même d'avoir fini l'activation complète du compte (le mode "test" fonctionne tout de suite).
2. Une fois connecté au Dashboard Stripe, en haut à droite, vérifie que le bouton bascule est bien sur **Mode test** pour l'instant (tu repasseras en mode réel juste avant de lancer la commercialisation, voir l'étape 6 ci-dessous).
3. Menu de gauche → `Développeurs` → `Clés API`. Copie la valeur sous `Clé secrète` (elle commence par `sk_test_...` en mode test, `sk_live_...` en mode réel) — c'est ta `STRIPE_SECRET_KEY`.
4. Toujours dans `Développeurs` (en bas à gauche de l'écran, dans une petite barre fixe séparée du menu principal) → `Webhooks` → `+ Ajouter une destination` (Stripe a renommé "point de terminaison" en "destination" sur son interface récente — même chose).
   - Choisis le type de destination "URL webhook" (pas Amazon EventBridge ni Azure Event Grid).
   - `URL du endpoint` → `https://fidelions-app.vercel.app/api/stripe-webhook` (remplace par ton vrai domaine Vercel si différent).
   - `Sélectionner les événements` → cherche et coche uniquement `checkout.session.completed` et `invoice.paid` → valide → `Ajouter la destination` (ou `Créer`).
5. Sur la page de la destination qui vient d'être créée, cherche `Signing secret`/`Secret de signature` → clique `Révéler` et copie la valeur (elle commence par `whsec_...`) — c'est ta `STRIPE_WEBHOOK_SECRET`.
6. Sur `vercel.com`, ton projet `fidelions-app` → `Settings` → `Environment Variables`, ajoute :
   - `STRIPE_SECRET_KEY` → la valeur de l'étape 3
   - `STRIPE_WEBHOOK_SECRET` → la valeur de l'étape 5
7. `Deployments` → `⋯` sur le déploiement le plus récent → `Redeploy`.
8. Teste avec une vraie carte de test Stripe (en mode test, aucune carte réelle n'est débitée) : depuis `/commercant` → onglet **Abonnement** → `Activer mon abonnement`. Sur la page Stripe qui s'ouvre, utilise le numéro `4242 4242 4242 4242`, une date future, n'importe quel CVC et code postal. Le paiement doit repasser sur `/commercant` avec un message "Paiement reçu", et l'onglet Abonnement doit afficher "Actif" après quelques secondes (rafraîchis la page si besoin).
9. Quand tu es prêt à encaisser réellement : dans Stripe, termine l'activation du compte (`Activer les paiements`, infos bancaires/entreprise demandées par Stripe), repasse le bouton en haut à droite du Dashboard sur **Mode réel** (Live), puis refais les étapes 3 à 7 EN MODE RÉEL (les clés et le webhook du mode test ne fonctionnent pas en mode réel, ce sont deux jeux de clés séparés) — remplace `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` sur Vercel par les nouvelles valeurs `sk_live_...`/`whsec_...`, puis `Redeploy`.
10. **Obligatoire pour les formules avec engagement (6 mois / 1 an) — active le prélèvement SEPA.** Le site l'impose automatiquement pour ces formules (plus fiable et moins cher qu'une carte sur un engagement long — 0,35 € fixe par prélèvement contre 1,5 % + 0,25 % pour une carte) et laisse le choix carte/SEPA pour la formule mensuelle sans engagement — mais il faut d'abord l'activer côté Stripe, sinon le paiement d'une formule avec engagement échoue. En Mode réel, va sur `Paramètres` (⚙️) → `Moyens de paiement` (`dashboard.stripe.com/settings/payment_methods`) → trouve `Prélèvement SEPA` → active-le. Stripe peut te demander une vérification d'identité supplémentaire à ce moment-là (documents d'entreprise) — suis simplement ce qu'il demande.

## Étape 3septies — Activer les notifications automatiques programmées (QStash, gratuit)

Nécessaire pour que la **demande d'avis Google automatique** (onglet Notifications > Automatisations) parte réellement à l'heure choisie (1h après le passage du client, par défaut). Sans cette étape, tout le reste du site fonctionne normalement, mais cette automatisation précise reste inactive — la relance "client inactif" (l'autre automatisation du même onglet), elle, n'en a pas besoin (voir plus bas pourquoi).

1. Va sur `console.upstash.com` et connecte-toi avec le MÊME compte que celui utilisé à l'Étape 3 pour la base de données (QStash fait partie du même compte Upstash, pas besoin d'en créer un autre).
2. Dans le menu de gauche, clique sur `QStash`.
3. Sur cette page, repère la section `Request Builder` ou `Details` en haut — copie la valeur `QSTASH_TOKEN`.

Tu ajouteras ce token comme variable `QSTASH_TOKEN` à l'étape 4 juste en dessous, avec une deuxième variable `QSTASH_FORWARD_SECRET` (déjà générée pour toi, pas besoin d'en inventer une) qui empêche n'importe qui d'autre de déclencher ces notifications à ta place.

## Étape 4 — Déployer sur GitHub + Vercel

1. Va sur github.com, connecte-toi (ou crée un compte, gratuit).
2. `New repository` → nom `fidelions-app` → `Create repository` (laisse-le vide, sans README) — ou, si le repo existe déjà, ouvre-le directement.
3. Sur la page du repo, supprime les anciens fichiers puis glisse **tout le contenu du nouveau dossier dézippé** (pas le dossier lui-même) dans la zone d'upload — ou utilise le bouton `Add file` → `Upload files`.
4. `Commit changes`.
5. Va sur vercel.com/new (connecte-toi avec ton compte GitHub) — ou si le projet existe déjà, va directement dans `Settings` > `Environment Variables`.
6. Ajoute/vérifie ces variables :
   - `GOOGLE_WALLET_CLIENT_EMAIL` → le champ `client_email` du JSON de l'étape 1
   - `GOOGLE_WALLET_PRIVATE_KEY` → le champ `private_key` du JSON de l'étape 1
   - `GOOGLE_WALLET_ISSUER_ID` → trouvé à l'étape 2bis
   - `GOOGLE_WALLET_CLASS_ID` → seulement si tu avais déjà un site déployé avant (l'ancien ID de classe unique) — nécessaire pour la migration ci-dessous, sinon laisse vide
   - `SESSION_SECRET` → une longue valeur secrète et aléatoire, qui sert à sécuriser les connexions de tous les comptes — **ne la partage jamais**
   - `RESEND_API_KEY` → optionnel, la clé copiée à l'étape 3bis (pour les campagnes par email)
   - `GEMINI_API_KEY` → optionnel, la clé copiée à l'étape 3ter (pour la vraie analyse IA du menu — PDF/photo compris)
   - `GROQ_API_KEY` → optionnel, la clé copiée juste en dessous à l'étape 3ter (filet de secours "IA open source" — prend le relais tout seul si Gemini est à quota)
   - `GOOGLE_REVIEW_URL` → optionnel, laisse vide pour l'instant (n'a plus vraiment de sens en multi-comptes, une future version le déplacera par restaurant)
   - `CARDS_ADMIN_PASSWORD` → un mot de passe de ton choix, pour toi seul — protège `/admin-cartes` (voir la section **Cartes NFC/QR physiques** plus bas)
   - `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` → optionnelles, pour le bouton "Continuer avec Google" (voir **Étape 3quinquies** ci-dessus) — sans elles le bouton affiche juste une erreur claire, rien d'autre ne casse
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` → optionnelles, pour le paiement automatique récurrent (voir **Étape 3sexies** ci-dessus) — sans elles, l'essai gratuit fonctionne normalement mais le bouton "Activer mon abonnement" affiche une erreur claire tant qu'elles ne sont pas ajoutées
   - `CRON_SECRET` → protège la relance automatique des inscriptions abandonnées ET la relance client inactif (voir **Relance automatique des inscriptions abandonnées** et **Notifications automatiques** plus bas) pour que personne d'autre que Vercel ne puisse déclencher l'envoi d'emails. Colle exactement cette valeur (déjà générée pour toi, pas besoin d'en inventer une) :
     ```
     73f81d1a6f1102e2250d84cea0f4e09f42d9923f6ee725c90c8e3c6b28a28071
     ```
   - `QSTASH_TOKEN` → copié à l'**Étape 3septies** ci-dessus — nécessaire pour que la demande d'avis Google automatique parte à l'heure programmée.
   - `QSTASH_FORWARD_SECRET` → protège ce même mécanisme, exactement comme `CRON_SECRET` ci-dessus. Colle exactement cette valeur (déjà générée pour toi) :
     ```
     9d00a922ac73d3685906bfac7dfad2744dc529c65f0cb5176f748201fedd8802
     ```
   - Retire `MERCHANT_PASSWORD` et `CASHIER_PASSWORD` si elles existent encore — elles ne sont plus utilisées (chaque restaurant a maintenant son propre email + mot de passe, stockés en base).
7. `Deploy` (ou `Redeploy` si le projet existait déjà).

## Migrer un compte existant (uniquement si tu avais déjà un site déployé avant cette version)

Si c'est ta toute première installation, ignore cette section et passe directement à "Étape 5 — Tester".

Toutes tes anciennes données (clients, réglages, équipe, personnalisation) sont toujours en base — elles ne sont juste rattachées à aucun compte connectable pour l'instant. Cette étape, à faire UNE SEULE FOIS après le déploiement, les transforme en ton premier vrai compte commerçant, sans rien perdre.

1. Ouvre ce lien dans ton navigateur, en remplaçant les 3 valeurs entre `<>` (garde le `%20` à la place des espaces dans le nom du restaurant) :

   `https://tonsite.vercel.app/api/migrate-demo?secret=<TA_VALEUR_SESSION_SECRET>&restaurantName=<Nom%20De%20Ton%20Restaurant>&password=<UnMotDePasseDau8CaracteresMinimum>`

2. Si tout se passe bien, la page affiche un message de réussite avec ton email et ton nouveau lien d'inscription client (`/r/...`).
3. Va sur `tonsite.vercel.app/commercant`, connecte-toi avec ton email (par défaut `ahmadadamezzine@gmail.com`, sauf si tu as ajouté `&email=...` dans le lien ci-dessus) et le mot de passe choisi à l'étape 1.
4. Cette adresse ne fonctionne plus qu'une seule fois — un deuxième appel renvoie une erreur "déjà effectuée", sans rien casser.

## Étape 5 — Tester

1. Ouvre l'URL donnée par Vercel (ex. `fidelions-app.vercel.app`) — c'est maintenant la page d'accueil marketing ; clique `Créer mon compte` (ou va directement sur `/commercant`).
2. Crée un compte restaurant (ou connecte-toi si tu as fait la migration ci-dessus).
3. Une fois connecté, ouvre l'onglet **Partager** : c'est là qu'est le QR code et le lien à donner aux clients.
4. Ouvre ce lien dans un autre onglet/navigateur (comme le ferait un client), entre un prénom, clique `Créer ma carte`, puis `Ajouter à Google Wallet`.
5. Une page Google doit s'ouvrir proposant d'ajouter la carte, avec un QR code dessus.
6. Retourne sur `/commercant`, clique `Activer la caméra` (accepte l'autorisation caméra demandée par le navigateur) et vise le QR de la carte que tu viens de créer. (Tu peux aussi juste taper le prénom du client.) Puis clique `+1 tampon`. La carte doit se mettre à jour avec une notification.

## Notification "+1 point" chez le client : Wallet + email de secours

À chaque point ajouté, deux choses se déclenchent :

1. Une vraie notification Google Wallet (écran de verrouillage, "+1 point !"). C'est fait correctement côté code (API `addMessage`, `messageType: TEXT_AND_NOTIFY`, exactement comme documenté par Google).
2. **Un email de secours**, envoyé en plus si le client a laissé son email à la création de sa carte — via Resend (`RESEND_API_KEY`, déjà utilisé pour les campagnes).

Pourquoi les deux : Google prévient lui-même dans sa documentation que la notification Wallet n'apparaît que si "l'utilisateur a activé les notifications Wallet" — et en pratique, certains téléphones (Samsung en tête, avec sa gestion de batterie très agressive qui "endort" les applis en arrière-plan) ne la font jamais remonter, même quand tout fonctionne bien côté serveur. Ce n'est pas un bug corrigeable côté Fidélions — c'est une limite du système Android/Wallet. L'email de secours garantit que le client est prévenu quand même.

Si un commerçant te remonte "mon client ne reçoit jamais la notif", fais-lui vérifier sur le téléphone du client (Android) :
- `Paramètres` → `Notifications` → `Wallet Google` (ou `Google Wallet`) → notifications autorisées.
- `Paramètres` → `Batterie` → `Wallet Google` → pas classée en "app en veille" / "mise en veille profonde" (le réglage qui pose problème sur Samsung en particulier).

**L'email de secours est aux couleurs du commerce, pas de Fidélions** : le nom affiché comme expéditeur, le logo et la couleur de l'email sont ceux du commerce (onglet "Ma carte"), pas "Fidélions" — c'est le commerce que le client final doit reconnaître dans sa boîte mail. Un commerce qui n'a pas encore mis de logo/couleur reçoit l'identité Fidélions par défaut, le temps qu'il personnalise sa carte. Même logique pour les campagnes envoyées par email (onglet Campagnes).

## Relance automatique des inscriptions abandonnées

Beaucoup de commerçants commencent l'inscription (nom du commerce, mécanique de fidélité, formule tarifaire) mais abandonnent juste avant de cliquer sur "Créer mon compte", à la toute dernière étape (6/6) où ils tapent leur email. Cette fonctionnalité les relance automatiquement, par email, signé de toi — inspirée d'un email que Fidelix (un concurrent) t'a lui-même envoyé après ton propre test chez eux.

**Entièrement automatique, tu n'as jamais rien à déclencher :**

1. Dès qu'un email est tapé à la dernière étape de l'inscription, il est discrètement enregistré comme "lead" (sans bloquer ni ralentir la suite — un échec de cet enregistrement n'empêche jamais l'inscription elle-même).
2. Si l'inscription se termine normalement, le lead est aussitôt marqué "terminé" et n'est plus jamais relancé.
3. Sinon, un email automatique part entre 20h et 72h après (assez de temps pour finir seul, pas assez pour relancer quelqu'un qui a abandonné il y a des semaines) : "Il ne reste qu'une étape...", signé "Ahmad Adam Ezzine, Fondateur, Fidélions", avec un lien direct pour reprendre l'inscription.
4. Chaque lead n'est relancé qu'une seule fois — jamais de spam.
5. Ça tourne tout seul une fois par jour via Vercel Cron (le plan gratuit Vercel limite à une fois par jour — largement suffisant pour une fenêtre de 20-72h).

**⚠️ Important, à ne pas sauter : sans domaine vérifié sur Resend (voir l'avertissement de l'étape 3bis plus haut), cette relance ne touchera en pratique QUE ta propre adresse email de test — pas les vrais commerçants.** La fonctionnalité est prête et tourne déjà, il manque juste la vérification du domaine côté Resend pour qu'elle touche réellement tout le monde. Suis les 5 étapes de l'encadré "Important, à ne pas sauter" dans la section **Étape 3bis** ci-dessus dès que tu veux que ça parte pour de vrai.

Rien à surveiller ni à relancer toi-même : une fois `CRON_SECRET` ajouté (voir Étape 4) et le domaine Resend vérifié, tout se fait seul, tous les jours.

## Notifications automatiques (onglet Notifications > Automatisations)

Deux automatisations réglables par chaque commerçant depuis l'onglet **Notifications**, section **Automatisations** (valeurs par défaut déjà en place — un commerçant peut ne toucher à rien) :

**1. Demande d'avis Google, après un passage.** Dès qu'un lien "laisser un avis" est renseigné (onglet Établissement — voir juste en dessous), le tout premier retour d'un client (par défaut : le 2e passage, la création de la carte comptant comme le 1er — "1h après le 2e scan, pas celui qui crée la carte") déclenche, 1h plus tard par défaut, une notification Wallet ET un email avec un vrai bouton "Laisser un avis" qui ouvre directement l'écran des étoiles (jamais la fiche générale de l'établissement). Pensé pour ne jamais spammer : un client régulier n'est pas resollicité à chaque passage (délai de repos configurable, 90 jours par défaut), jamais plus de 2 fois au total par client, jamais si le client a déjà laissé un avis (déclaré en caisse) ou s'il est bloqué. Techniquement, c'est **Upstash QStash** (Étape 3septies ci-dessus) qui permet ce délai précis à l'heure près — Vercel Cron seul ne le permettrait pas (limité à une fois par jour sur le plan Hobby, comme pour la relance des inscriptions abandonnées plus haut).

**2. Relance d'un client inactif.** Si un client n'est pas revenu depuis un certain nombre de jours (21 par défaut), une notification "On ne vous a pas vu récemment !" part automatiquement, avec la même limite anti-spam (pas plus d'une fois tous les 60 jours par défaut pour un même client). Contrairement à la demande d'avis, une précision à l'heure près n'a aucun sens ici (on parle de jours/semaines d'absence) : une vérification une fois par jour (Vercel Cron, `vercel.json`) suffit largement — pas besoin de QStash pour celle-ci.

**⚠️ Même limitation Resend que partout ailleurs sur le site** (voir l'avertissement de l'Étape 3bis) : tant que ton domaine n'est pas vérifié, le bouton email de la demande d'avis ne touchera que ta propre adresse de test — la notification Wallet, elle, fonctionne déjà normalement pour tous tes clients (Wallet n'a pas cette limitation).

**Trouver son lien "laisser un avis" Google :** dans l'onglet Établissement, à côté du champ, un bouton "Comment trouver mon lien ?" ouvre un tutoriel pas-à-pas (Google Business Profile → "Demander des avis" → copier le lien court). Le site avertit aussi automatiquement si le lien collé ressemble à une fiche Google Maps générale plutôt qu'à un vrai lien d'avis direct.

## Abonnement : essai gratuit de 7 jours, puis verrou automatique

Chaque nouveau compte commence avec un statut `essai` et 7 jours pleins d'accès complet. Passé ce délai, si tu n'as pas activé l'abonnement, l'ajout de points et la création de nouvelles cartes se bloquent tout seuls (le commerçant voit un écran "Active ton abonnement" à la place du tableau de bord) — sans que tu aies rien à faire. Les comptes créés avant cette fonctionnalité ne sont pas concernés (ils restent `actif` par défaut, pour ne couper l'accès à personne du jour au lendemain).

**Depuis l'intégration Stripe (voir Étape 3sexies plus haut), l'activation ET le reverrouillage en fin d'engagement ou d'échec de paiement se font entièrement tout seuls, sans que tu aies quoi que ce soit à faire** : le commerçant paie sur une page Stripe (bouton "Activer mon abonnement", depuis l'onglet Abonnement ou l'écran de fin d'essai), Stripe prélève ensuite chaque mois automatiquement, et il peut résilier lui-même quand il veut depuis son espace Stripe ("Gérer mon abonnement / résilier"). Il peut aussi passer lui-même à une formule supérieure (plus de points de vente) depuis l'onglet Abonnement — le complément est prélevé tout de suite au prorata, et le tarif normal de la nouvelle formule s'applique automatiquement dès le mois suivant. Rétrograder n'est volontairement PAS en libre-service (pour éviter qu'un commerçant fasse ça par erreur) — ça reste une demande à te faire directement, via les boutons WhatsApp/email de l'onglet Abonnement.

La commande manuelle ci-dessous reste utile pour un cas particulier — paiement reçu autrement que par Stripe, geste commercial, ou compte à suspendre :

```
tonsite.vercel.app/api/admin-set-subscription?secret=TA_VALEUR_SESSION_SECRET&email=contact@commerce.fr&status=actif
```

`status` accepte `actif` (accès illimité), `suspendu` (accès coupé immédiatement) ou `essai` (relance un essai avec 14 nouveaux jours — pratique pour laisser un peu plus de temps à un commerçant en cours de négociation).

## Cartes NFC/QR physiques (produit à 20 €, page d'accueil)

La page d'accueil propose une carte physique NFC + QR à 20 € (juste sous la grille de tarifs). Le principe : les cartes sont imprimées **à l'avance, en lot, toutes identiques** — chacune gravée avec un code générique (`tonsite.vercel.app/c/XXXXXX`), pas encore lié à un commerçant. C'est seulement au moment où une carte est vendue qu'on la relie au bon commerçant, en quelques secondes, sans jamais retoucher à l'impression.

1. Va sur `tonsite.vercel.app/admin-cartes` et connecte-toi avec `CARDS_ADMIN_PASSWORD` (défini à l'étape 4).
2. Dans "Générer un nouveau lot", choisis une quantité (ex. 20) et clique `Générer`. La liste des URLs complètes s'affiche : clique `Copier les URLs`, c'est exactement ce qu'il faut coller dans le formulaire de commande de l'imprimeur (champ "encodage" ET champ "QR code" — les deux doivent recevoir la même URL, une par carte).
3. Quand une carte est vendue à un commerçant : demande-lui son lien `/r/son-nom` (visible dans son onglet **Partager**), reviens sur `/admin-cartes`, retrouve la carte dans la liste, colle son slug (la partie après `/r/`) dans le champ à côté, clique `Attribuer`. La carte redirige désormais vers sa page dès le prochain scan/tap.
4. Une carte reprise par erreur ou jamais remise peut être libérée (`Libérer`) puis réattribuée à un autre commerçant, sans jamais commander de nouvelles cartes.

## Nouveautés (page d'accueil, tarification, points/avis Google, hors-ligne, équipe)

Cette version ajoute plusieurs éléments inspirés d'un concurrent (Fidelix) : une vraie page d'accueil marketing (`/`, avec calculateur de retour sur investissement et grille de fonctionnalités), un assistant d'inscription étendu (choix tampons/points + couleur de carte juste après le nom de l'établissement, puis tarification par palier et écran d'activation d'abonnement), un écran de connexion façon "split-screen", un bonus de points pour les avis Google laissés en caisse, un mode basique de fonctionnement hors connexion pour l'écran de scan employé, et un classement de l'équipe (clients fidélisés + avis obtenus) dans l'onglet Employés.

Trois choses restent à faire de ton côté avant que tout soit 100 % actif :

1. **Lien de paiement (abonnement)** — le paiement de l'abonnement se fait maintenant via un lien externe plutôt que par virement/RIB (aucune donnée bancaire n'est collectée par Fidélions). Tant que tu n'as pas fourni ton vrai lien, le bouton "Payer" ouvre WhatsApp avec un message pré-rempli à la place. Pour l'activer : crée un lien de paiement sur ton compte Revolut Business, puis colle-le dans `pages/commercant.js`, à la ligne `const REVOLUT_PAYMENT_LINK = "";` (remplace les guillemets vides par ton lien).
2. **Apple Wallet** — la structure est prête (`lib/appleWallet.js`, bouton "bientôt disponible" affiché aux clients) mais Apple exige un compte Apple Developer Program (~99 $/an) et un certificat de type de pass, que le site n'a pas. Une fois ces éléments obtenus, renseigne `APPLE_TEAM_ID`, `APPLE_PASS_TYPE_ID`, `APPLE_PASS_CERT_BASE64` et `APPLE_PASS_CERT_PASSWORD` dans Vercel (voir les commentaires de `lib/appleWallet.js` pour le détail) ; le bouton se réactivera automatiquement.
3. **Avis Google** — pas d'appel à l'API Google Business Profile ici (coûterait cher à mettre en place pour un seul restaurant) : c'est l'employé/le commerçant qui coche "avis Google laissé" en caisse au moment d'ajouter un point, ce qui déclenche un bonus de points. C'est une déclaration de confiance, pas une vérification automatique — à mentionner à l'équipe.

Le mode hors-ligne du lien employé (`/scan/[token]`) reste volontairement basique : le scan et l'ajout de points continuent de fonctionner sans réseau (avec synchronisation automatique au retour de la connexion), et la page se recharge hors-ligne une fois qu'elle a déjà été ouverte au moins une fois avec du réseau sur cet appareil — ce n'est pas une vraie synchronisation en arrière-plan façon application native.

## Si ça ne marche pas

- Erreur 500 à la création d'un compte restaurant → vérifie `GOOGLE_WALLET_ISSUER_ID` dans Vercel (étape 2bis), puis `Deployments` > `⋯` > `Redeploy`.
- Erreur 500 sur `/api/create-pass` (inscription client) → une des variables d'environnement est mal copiée. Revérifie dans Vercel > Settings > Environment Variables, puis redeploy.
- Erreur "Base de données non configurée" → l'étape 3 (Upstash Redis) n'a pas été faite ou le projet n'a pas été reconnecté après ; vérifie `Storage` dans Vercel.
- La page Google dit que la classe n'existe pas / "not approved" → attends quelques minutes après la création du compte (Google met parfois un peu de temps à propager une nouvelle classe), puis réessaie l'inscription.
- Le compte de service n'a pas accès → revérifie l'étape 2 (l'email doit être invité en tant qu'utilisateur de la Wallet Business Console, sinon Google refuse de signer les cartes).
- `/commercant` refuse le mot de passe → vérifie l'email et le mot de passe exacts utilisés à l'inscription (ou à la migration). Un mot de passe oublié n'a pour l'instant pas de récupération automatique — contacte-moi si ça arrive.
- Le lien `/api/migrate-demo` renvoie "Accès refusé" → le `secret` dans le lien ne correspond pas exactement à `SESSION_SECRET` dans Vercel (attention aux espaces en trop en copiant-collant).
- Le lien `/api/migrate-demo` renvoie "déjà effectuée" → la migration a déjà réussi une première fois ; connecte-toi directement sur `/commercant`.
- "Google Wallet API has not been used in project ... or it is disabled" quand un tampon est ajouté → l'API Wallet doit être activée sur le projet Google Cloud du compte de service. Ouvre le lien exact donné dans le message d'erreur (il contient `?project=<numéro>`) et clique `Activer`, attends 2-3 minutes, puis réessaie.
- La caméra reste noire ou refuse de s'activer → l'autorisation caméra du site a été refusée. Sur le téléphone : appuie sur l'icône 🔒/ⓘ à côté de l'adresse du site dans le navigateur → Autorisations (ou Paramètres du site) → Caméra → Autoriser, puis recharge la page.
- La case "Email" de la campagne échoue → vérifie que `RESEND_API_KEY` est bien définie dans Vercel (étape 3bis) et qu'un redeploy a été fait après. Le compteur "(X avec email)" doit être supérieur à 0 — sinon, aucun client inscrit n'a renseigné son email.
- "Analyser avec l'IA" échoue ou dit "GEMINI_API_KEY manquant" → l'étape 3ter n'a pas été faite, ou un redeploy n'a pas suivi l'ajout de la clé dans Vercel. Pour du texte collé/écrit, une analyse basique prend le relais automatiquement ; pour un PDF ou une photo, la clé est indispensable.
- L'analyse IA dit "Limite gratuite Gemini atteinte" → le quota gratuit (par minute/jour) est temporairement dépassé, réessaie dans quelques minutes.
- L'analyse IA dit "service IA de Google temporairement surchargé" → pic de charge chez Google sur le modèle gratuit (erreur 503), rien à voir avec le site — le site réessaie déjà une fois tout seul ; si ça persiste, réessaie manuellement dans une minute.
- Le client ne voit pas la notification (popup écran de verrouillage) → deux causes possibles : (1) sur le téléphone du client, il faut que les notifications soient activées pour l'app Google Wallet (Réglages du téléphone → Applications → Google Wallet → Notifications → Activer) ; (2) Google limite à 3 notifications-popup par carte et par 24h — au-delà, le tampon/l'email partent quand même, mais sans popup ce jour-là pour cette carte précise.
- Onglet "Ma carte" : erreur "Stockage d'images non configuré" en envoyant un logo/bannière → l'étape 3quater (Vercel Blob) n'a pas été faite, ou un redeploy n'a pas suivi la connexion du stockage.
- Onglet "Proximité" : "Adresse introuvable" → vérifie l'orthographe de l'adresse, ou précise la ville et le code postal (ex. "12 rue de Metz, 31000 Toulouse" plutôt que juste "12 rue de Metz").
- Le lien employé (onglet "Équipe") ne fonctionne plus → il a probablement été régénéré depuis (volontairement, ou par erreur) : renvoie le nouveau lien affiché dans cet onglet à l'employé concerné.
- Un employé se fait refuser son code alors qu'il est sûr de son code → vérifie dans l'onglet "Équipe" que son compte est bien "Actif", et que le jour/l'heure actuels sont bien dans les jours/la plage horaire autorisés.
- En créant/modifiant un employé, le site refuse le code avec "Ce code est déjà utilisé par ..." → deux employés d'un même restaurant ne peuvent pas avoir le même code à 4 chiffres.
- La couleur/le logo/la bannière ne se voient pas tout de suite sur une carte déjà installée → laisse quelques minutes à Google pour propager le changement à toutes les cartes déjà distribuées.
