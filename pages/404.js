// pages/404.js
//
// Page 404 personnalisée — Next.js sert automatiquement ce composant pour
// toute route qui ne correspond à rien (lien cassé, faute de frappe dans
// une URL, ancienne page supprimée) au lieu de l'écran blanc générique par
// défaut. Item "page 404 personnalisée" de la checklist lancement de site.

import Link from "next/link";
import Head from "next/head";

const PURPLE = "#7414F4";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Page introuvable — Fidélions</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="wrap">
        <img src="/logo-full.png" alt="Fidélions" className="logo" />
        <h1>404</h1>
        <p>Cette page n'existe pas ou plus.</p>
        <Link href="/" className="btn">Retour à l'accueil</Link>
      </div>
      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #f6f5fc;
        }
        .logo {
          width: 56px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        h1 {
          font-size: 64px;
          margin: 0;
          color: ${PURPLE};
        }
        p {
          color: #595959;
          font-size: 16px;
          margin: 8px 0 28px;
        }
        .btn {
          background: linear-gradient(135deg, ${PURPLE} 0%, #5c0fc9 100%);
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          padding: 12px 26px;
          border-radius: 999px;
          box-shadow: 0 8px 20px -8px rgba(116, 20, 244, 0.55);
        }
      `}</style>
    </>
  );
}
