# Fidélions — prototype

Page d'inscription + génération de carte Google Wallet + espace commerçant. Coût : 0 €, hébergé gratuitement sur Vercel.

## Ce que fait ce projet

1. Le client scanne le QR code du restaurant (page `/qr`).
2. Il arrive sur la page d'accueil, entre son prénom et son email (obligatoire, pour recevoir les campagnes), et son téléphone (optionnel, pour plus tard), puis clique "Créer ma carte".
3. Une carte de fidélité est créée pour lui (avec un QR unique dessus) et Google Wallet propose de l'ajouter au téléphone. Il reçoit aussi son lien de parrainage à partager.
4. À chaque visite, le commerçant ouvre `/commercant`, clique "Activer la caméra" (le navigateur demande l'autorisation la première fois — il faut accepter), et vise le QR de la carte du client. Il peut aussi taper son prénom. Puis clique "+1 tampon" : ça met à jour la carte du client en direct, avec une notification push.
5. Quand un client atteint le seuil de tampons voulu, une notification "Récompense débloquée" est envoyée automatiquement. Le seuil (ex : 10 tampons) et la récompense elle-même (ex : "1 café offert") sont réglables directement dans `/commercant` — pas besoin de toucher au code.
6. L'espace commerçant liste aussi tous les clients et leur nombre de visites (traçabilité).
7. Le commerçant peut aussi envoyer une "campagne" : un message (promo, nouveau plat, événement…) qui arrive d'un coup dans le Google Wallet de tous ses clients.
8. `/commercant` affiche un mini tableau de bord (clients inscrits, tampons distribués, visites du jour, récompenses débloquées) et un classement de fidélité (top 5 clients).
9. Tu peux donner un accès limité à un employé (juste ajouter des tampons, sans les stats ni les campagnes) avec un 2e mot de passe séparé.
10. Les campagnes peuvent partir par notification Wallet et/ou par email — au choix, avec une case à cocher pour chaque canal. L'email étant maintenant obligatoire à l'inscription, tous les clients sont éligibles au canal email.
11. La notification Wallet EST déjà une vraie notification "façon Snapchat/Insta" : quand tu envoies un message, le téléphone du client reçoit une alerte sur son écran de verrouillage (si les notifications Wallet sont activées sur son téléphone), et le message reste aussi consultable en ouvrant la carte dans l'app Google Wallet (en dessous du QR code). C'est le même mécanisme chez Fidelix : leur vidéo montre bien une carte Google Wallet, donc leur "popup" est très probablement exactement cette même notification. Un canal SMS séparé (comme un vrai texto) est possible mais payant (~0,04 à 0,08 € par SMS via un service comme Twilio, + un abonnement) — pas encore branché, pour ne pas t'engager sur des frais sans te le dire d'abord. Le champ téléphone est déjà collecté pour le jour où tu voudras l'activer.
12. `/commercant` affiche aussi une "Analyse automatique" : quelques phrases générées à partir de tes propres données (croissance des inscriptions, client le plus fidèle, clients à 1-2 tampons de la récompense, clients qu'il faudrait relancer). Ce n'est pas un vrai modèle d'IA payant (ça coûterait cher pour un gain flou) — ce sont des règles simples qui lisent les mêmes chiffres que la "version IA" de Fidelix met en avant dans leur vidéo, sans le coût.

## Étape 1 — Créer le compte de service Google Cloud (obligatoire, une seule fois)

C'est ce qui permet à ce site de créer des cartes en te faisant passer pour "Fidélions" auprès de Google, sans jamais exposer de mot de passe.

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

## Étape 4 — Déployer sur GitHub + Vercel

1. Va sur github.com, connecte-toi (ou crée un compte, gratuit).
2. `New repository` → nom `fidelions-app` → `Create repository` (laisse-le vide, sans README).
3. Sur la page du repo vide, clique le lien `uploading an existing file`.
4. Dézippe le fichier que je t'ai envoyé, puis glisse **tout le contenu du dossier** (pas le dossier lui-même) dans la zone d'upload.
5. `Commit changes`.
6. Va sur vercel.com/new (connecte-toi avec ton compte GitHub) — ou si le projet existe déjà, va directement dans `Settings` > `Environment Variables`.
7. Ajoute ces variables (valeurs à copier depuis le fichier JSON de l'étape 1, sauf indication contraire) :
   - `GOOGLE_WALLET_CLIENT_EMAIL` → le champ `client_email` du JSON
   - `GOOGLE_WALLET_PRIVATE_KEY` → le champ `private_key` du JSON
   - `GOOGLE_WALLET_CLASS_ID` → l'ID complet de ta classe de fidélité (ex. `3388000000023199659.fidelions_loyalty`)
   - `MERCHANT_PASSWORD` → un mot de passe que tu choisis toi-même, pour protéger `/commercant`
   - `CASHIER_PASSWORD` → optionnel, un 2e mot de passe pour un employé (accès limité, sans stats ni campagnes)
   - `RESEND_API_KEY` → optionnel, la clé copiée à l'étape 3bis (pour les campagnes par email)
   - `GOOGLE_REVIEW_URL` → optionnel, le lien direct vers "laisser un avis Google" du restaurant (laisse vide pour l'instant)
8. `Deploy` (ou `Redeploy` si le projet existait déjà).

## Étape 5 — Tester

1. Ouvre l'URL donnée par Vercel (ex. `fidelions-app.vercel.app`).
2. Entre un prénom, clique `Créer ma carte`, puis `Ajouter à Google Wallet`.
3. Une page Google doit s'ouvrir proposant d'ajouter la carte, avec un QR code dessus.
4. Va sur `tonsite.vercel.app/commercant`, entre ton mot de passe, clique `Activer la caméra` (accepte l'autorisation caméra demandée par le navigateur) et vise le QR de la carte que tu viens de créer. (Tu peux aussi juste taper le prénom du client.) Puis clique `+1 tampon`. La carte doit se mettre à jour avec une notification.
5. Va sur `tonsite.vercel.app/qr` pour récupérer le QR code d'inscription à imprimer pour le restaurant.

## Si ça ne marche pas

- Erreur 500 sur `/api/create-pass` → une des variables d'environnement est mal copiée. Revérifie dans Vercel > Settings > Environment Variables, puis `Deployments` > `⋯` > `Redeploy`.
- Erreur "Base de données non configurée" → l'étape 3 (Upstash Redis) n'a pas été faite ou le projet n'a pas été reconnecté après ; vérifie `Storage` dans Vercel.
- La page Google dit que la classe n'existe pas / "not approved" → vérifie que `GOOGLE_WALLET_CLASS_ID` correspond exactement à l'ID de classe créé dans la Wallet Business Console, et que son État n'est plus sur "DRAFT".
- Le compte de service n'a pas accès → revérifie l'étape 2 (l'email doit être invité en tant qu'utilisateur de la Wallet Business Console, sinon Google refuse de signer les cartes).
- `/commercant` refuse le mot de passe → vérifie que `MERCHANT_PASSWORD` est bien défini dans Vercel et qu'un redeploy a été fait après l'avoir ajouté.
- "Google Wallet API has not been used in project ... or it is disabled" quand tu ajoutes un tampon → l'API Wallet doit être activée sur le projet Google Cloud du compte de service (pas seulement sur celui de la classe de fidélité). Ouvre le lien exact donné dans le message d'erreur (il contient `?project=<numéro>`) et clique `Activer`, attends 2-3 minutes, puis réessaie.
- La caméra reste noire ou refuse de s'activer → l'autorisation caméra du site a été refusée. Sur le téléphone : appuie sur l'icône 🔒/ⓘ à côté de l'adresse du site dans le navigateur → Autorisations (ou Paramètres du site) → Caméra → Autoriser, puis recharge la page.
- La case "Email" de la campagne échoue → vérifie que `RESEND_API_KEY` est bien définie dans Vercel (étape 3bis) et qu'un redeploy a été fait après. Le compteur "(X avec email)" doit être supérieur à 0 — sinon, aucun client inscrit n'a renseigné son email.
- Le client ne voit pas la notification (popup écran de verrouillage) → deux causes possibles : (1) sur le téléphone du client, il faut que les notifications soient activées pour l'app Google Wallet (Réglages du téléphone → Applications → Google Wallet → Notifications → Activer) ; (2) Google limite à 3 notifications-popup par carte et par 24h — au-delà, le tampon/l'email partent quand même, mais sans popup ce jour-là pour cette carte précise (le message reste visible en ouvrant la carte dans l'app Wallet, sous le QR code).
