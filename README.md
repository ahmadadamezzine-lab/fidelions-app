# Fidélions — prototype

Page d'inscription + génération de carte Google Wallet. Coût : 0 €, hébergé gratuitement sur Vercel.

## Ce que fait ce projet

1. Le client scanne le QR code du restaurant (page `/qr`).
2. Il arrive sur la page d'accueil, entre son prénom, clique "Ajouter à Google Wallet".
3. Une carte de fidélité est créée pour lui et Google Wallet propose de l'ajouter au téléphone.

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

## Étape 3 — Déployer sur GitHub + Vercel

1. Va sur github.com, connecte-toi (ou crée un compte, gratuit).
2. `New repository` → nom `fidelions-app` → `Create repository` (laisse-le vide, sans README).
3. Sur la page du repo vide, clique le lien `uploading an existing file`.
4. Dézippe le fichier que je t'ai envoyé, puis glisse **tout le contenu du dossier** (pas le dossier lui-même) dans la zone d'upload.
5. `Commit changes`.
6. Va sur vercel.com/new (connecte-toi avec ton compte GitHub).
7. `Import` sur le repo `fidelions-app`.
8. Avant de cliquer `Deploy`, ouvre `Environment Variables` et ajoute les 3 variables ci-dessous (valeurs à copier depuis le fichier JSON de l'étape 1) :
   - `GOOGLE_WALLET_CLIENT_EMAIL` → le champ `client_email` du JSON
   - `GOOGLE_WALLET_PRIVATE_KEY` → le champ `private_key` du JSON (colle-le tel quel, guillemets compris)
   - `GOOGLE_WALLET_CLASS_ID` → `BCR2DN6DVKHLZ7JI.fidelions_test`
9. `Deploy`.

## Étape 4 — Tester

1. Ouvre l'URL donnée par Vercel (ex. `fidelions-app.vercel.app`).
2. Entre un prénom, clique `Ajouter à Google Wallet`.
3. Une page Google doit s'ouvrir proposant d'ajouter la carte.
4. Va sur `tonsite.vercel.app/qr` pour récupérer le QR code à imprimer pour le restaurant.

## Si ça ne marche pas

- Erreur 500 sur `/api/create-pass` → une des 3 variables d'environnement est mal copiée. Revérifie dans Vercel > Settings > Environment Variables, puis `Deployments` > `⋯` > `Redeploy`.
- La page Google dit que la classe n'existe pas → vérifie que `GOOGLE_WALLET_CLASS_ID` correspond exactement à l'ID de classe créé dans la Wallet Business Console.
- Le compte de service n'a pas accès → revérifie l'étape 2 (l'email doit être invité en tant qu'utilisateur de la Wallet Business Console, sinon Google refuse de signer les cartes).
