import Link from "next/link";

const PURPLE = "#7414F4";

// Page publique des mentions légales (obligation LCEN pour tout éditeur de
// site). Même logique que pages/cgv.js et pages/confidentialite.js : à la
// demande d'Adam, les informations d'identité légale précises (forme
// juridique, numéro SIRET/RCS, adresse du siège) ne sont PAS inventées ici
// tant que son entreprise n'est pas immatriculée — seul le nom commercial et
// le contact déjà utilisés ailleurs sur le site sont affichés. À compléter
// dès que ces informations existent (mettre à jour les trois pages en même
// temps pour rester cohérent).
export default function MentionsLegales() {
  return (
    <div className="page">
      <div className="doc">
        <Link href="/" className="back">← Retour à l'accueil</Link>
        <h1>Mentions légales</h1>
        <p className="subtitle">Fidélions — dernière mise à jour : 11 septembre 2026</p>

        <h2>Éditeur</h2>
        <p>
          Le site accessible à l'adresse fidelions-app.vercel.app (ci-après « le Site ») est édité
          sous le nom commercial « Fidélions ».
        </p>
        <p>Contact : ahmadadamezzine@gmail.com.</p>

        <h2>Hébergement</h2>
        <p>
          L'application et le site sont hébergés par Vercel Inc. (vercel.com). La base de données
          est hébergée par Upstash (upstash.com).
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          Le nom « Fidélions », son logo et l'ensemble des éléments du Site (textes, interface,
          code) sont la propriété de son éditeur, sauf mention contraire. Toute reproduction sans
          autorisation préalable est interdite.
        </p>
        <p>
          Les logos, marques et contenus déposés par les commerces utilisant le Service restent
          leur propriété.
        </p>

        <h2>Protection des données personnelles</h2>
        <p>
          Le traitement des données personnelles réalisé dans le cadre du Service est décrit dans
          la <Link href="/confidentialite">Politique de confidentialité</Link>.
        </p>

        <h2>Contact</h2>
        <p>Pour toute question relative au Site ou à son contenu : ahmadadamezzine@gmail.com.</p>
      </div>

      <style jsx>{`${styles}`}</style>
    </div>
  );
}

const styles = `
  .page {
    min-height: 100vh;
    background: #f5f4fb;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
  }
  .doc {
    background: #fff;
    border-radius: 16px;
    padding: 40px;
    max-width: 720px;
    width: 100%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .back {
    display: inline-block;
    color: ${PURPLE};
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    margin-bottom: 20px;
  }
  h1 {
    color: ${PURPLE};
    font-size: 26px;
    margin: 0 0 6px;
  }
  .subtitle {
    color: #8a8a8a;
    font-size: 13px;
    margin-bottom: 28px;
  }
  h2 {
    color: #1a1a1a;
    font-size: 16px;
    margin: 28px 0 10px;
  }
  p {
    color: #333;
    font-size: 14.5px;
    line-height: 1.65;
    margin: 0 0 12px;
  }
  p :global(a) {
    color: ${PURPLE};
    font-weight: 600;
  }
`;
