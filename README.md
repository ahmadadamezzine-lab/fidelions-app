# Fidélions — prototype

Page d'inscription + génération de carte Google Wallet + espace commerçant. Coût : 0 €, hébergé gratuitement sur Vercel.

## Ce que fait ce projet

1. Le client scanne le QR code du restaurant (page `/qr`).
2. Il arrive sur la page d'accueil, entre son prénom, clique "Créer ma carte".
3. Une carte de fidélité est créée pour lui (avec un QR unique dessus) et Google Wallet propose de l'ajouter au téléphone. Il reçoit aussi son lien de parrainage à partager.
4. À chaque visite, le commerçant ouvre `/commercant` : sur ordinateur, la caméra s'active en direct dans la page ; sur téléphone/tablette, il prend une simple photo du QR (l'appareil photo natif s'ouvre) — l'appli détecte l'appareil toute seule. Il peut aussi taper le prénom du client. Puis clique "+1 tampon" : ça met à jour la carte du client en direct, avec une notification push.
5. Quand un client atteint 10 tampons, une notification "Récompense débloquée" est envoyée automatiquement.
6. L'espace commerçant liste aussi tous les clients et leur nombre de visites (traçabilité).

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
   - `GOOGLE_REVIEW_URL` → optionnel, le lien direct vers "laisser un avis Google" du restaurant (laisse vide pour l'instant)
8. `Deploy` (ou `Redeploy` si le projet existait déjà).

## Étape 5 — Tester

1. Ouvre l'URL donnée par Vercel (ex. `fidelions-app.vercel.app`).
2. Entre un prénom, clique `Créer ma carte`, puis `Ajouter à Google Wallet`.
3. Une page Google doit s'ouvrir proposant d'ajouter la carte, avec un QR code dessus.
4. Va sur `tonsite.vercel.app/commercant`, entre ton mot de passe. Sur ordinateur : clique `Activer la caméra` et vise le QR. Sur téléphone/tablette : clique `📷 Prendre une photo du QR` et prends en photo le QR de la carte que tu viens de créer. (Tu peux aussi juste taper le prénom du client.) Puis clique `+1 tampon`. La carte doit se mettre à jour avec une notification.
5. Va sur `tonsite.vercel.app/qr` pour récupérer le QR code d'inscription à imprimer pour le restaurant.

## Si ça ne marche pas

- Erreur 500 sur `/api/create-pass` → une des variables d'environnement est mal copiée. Revérifie dans Vercel > Settings > Environment Variables, puis `Deployments` > `⋯` > `Redeploy`.
- Erreur "Base de données non configurée" → l'étape 3 (Upstash Redis) n'a pas été faite ou le projet n'a pas été reconnecté après ; vérifie `Storage` dans Vercel.
- La page Google dit que la classe n'existe pas / "not approved" → vérifie que `GOOGLE_WALLET_CLASS_ID` correspond exactement à l'ID de classe créé dans la Wallet Business Console, et que son État n'est plus sur "DRAFT".
- Le compte de service n'a pas accès → revérifie l'étape 2 (l'email doit être invité en tant qu'utilisateur de la Wallet Business Console, sinon Google refuse de signer les cartes).
- `/commercant` refuse le mot de passe → vérifie que `MERCHANT_PASSWORD` est bien défini dans Vercel et qu'un redeploy a été fait après l'avoir ajouté.
- "Google Wallet API has not been used in project ... or it is disabled" quand tu ajoutes un tampon → l'API Wallet doit être activée sur le projet Google Cloud du compte de service (pas seulement sur celui de la classe de fidélité). Ouvre le lien exact donné dans le message d'erreur (il contient `?project=<numéro>`) et clique `Activer`, attends 2-3 minutes, puis réessaie.
