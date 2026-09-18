import { Html, Head, Main, NextScript } from "next/document";

// Document partagé par toutes les pages : sert notamment à poser le
// favicon (logo Fidélions) une bonne fois pour toutes, plutôt que de
// compter sur la seule convention "public/favicon.ico" (qui marche, mais
// pas toujours de façon fiable selon le navigateur/le cache) — avec les
// tailles PNG modernes en plus pour un rendu net sur tous les écrans.
export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#7414F4" />
        {/* Police "Plus Jakarta Sans" — remplace la police système par défaut
            sur toutes les pages (voir le font-family partagé dans chaque
            <style jsx>) pour un rendu plus soigné, sans rien changer côté
            mise en page. preconnect accélère le premier chargement. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
