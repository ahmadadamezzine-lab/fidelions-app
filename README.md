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

## Étape 3ter — Activer la vraie IA pour l'analyse du menu (gratuit, sans carte bancaire)

Sans cette étape, la carte "Analyse du menu & suggestions" fonctionne quand même pour du texte collé/écrit (avec une analyse basique par règles), mais ne peut pas lire un PDF ou une photo de menu. Cette clé est gratuite chez Google, sans carte bancaire à saisir.

1. Va sur `aistudio.google.com/apikey`
2. Connecte-toi avec un compte Google (le même que pour Wallet ou un autre, peu importe).
3. Clique sur `Create API key` (ou `Créer une clé API`).
4. Choisis `Create API key in new project` si on te le demande.
5. Une clé s'affiche (elle commence par `AIza...`) — clique sur l'icône de copie à côté.

Tu ajouteras cette clé comme variable `GEMINI_API_KEY` à l'étape 4 juste en dessous.

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
   - `GOOGLE_REVIEW_URL` → optionnel, laisse vide pour l'instant (n'a plus vraiment de sens en multi-comptes, une future version le déplacera par restaurant)
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

1. Ouvre l'URL donnée par Vercel (ex. `fidelions-app.vercel.app`) — elle redirige vers `/commercant`.
2. Crée un compte restaurant (ou connecte-toi si tu as fait la migration ci-dessus).
3. Une fois connecté, ouvre l'onglet **Partager** : c'est là qu'est le QR code et le lien à donner aux clients.
4. Ouvre ce lien dans un autre onglet/navigateur (comme le ferait un client), entre un prénom, clique `Créer ma carte`, puis `Ajouter à Google Wallet`.
5. Une page Google doit s'ouvrir proposant d'ajouter la carte, avec un QR code dessus.
6. Retourne sur `/commercant`, clique `Activer la caméra` (accepte l'autorisation caméra demandée par le navigateur) et vise le QR de la carte que tu viens de créer. (Tu peux aussi juste taper le prénom du client.) Puis clique `+1 tampon`. La carte doit se mettre à jour avec une notification.

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
