import Link from "next/link";

const PURPLE = "#7414F4";

// Page publique de la politique de confidentialité — même contenu que le
// modèle envoyé à Adam (docx), mêmes zones [À COMPLÉTER] laissées visibles
// plutôt que remplies par des informations inventées.
export default function Confidentialite() {
  return (
    <div className="page">
      <div className="doc">
        <Link href="/" className="back">← Retour à l'accueil</Link>
        <h1>Politique de Confidentialité</h1>
        <p className="subtitle">Fidélions — dernière mise à jour : <Placeholder text="DATE" /></p>

        <h2>1. Qui sommes-nous</h2>
        <p>
          Fidélions (<Placeholder text="FORME JURIDIQUE" />, SIRET <Placeholder text="SIRET" />, siège social{" "}
          <Placeholder text="ADRESSE DU SIÈGE" />) édite et exploite le service Fidélions, un outil de fidélisation
          client destiné aux restaurants.
        </p>
        <p>Pour toute question relative à vos données personnelles : <Placeholder text="EMAIL DE CONTACT" />.</p>

        <h2>2. Deux rôles différents selon qui vous êtes</h2>
        <p>
          Si vous êtes un restaurant utilisant Fidélions (« le Restaurant ») : Fidélions est
          responsable du traitement des données liées à votre compte professionnel (identifiants,
          informations de contact, données des employés que vous enregistrez).
        </p>
        <p>
          Si vous êtes client d'un restaurant utilisant Fidélions et que vous créez une carte de
          fidélité (« le Client final ») : le Restaurant chez qui vous avez créé votre carte est
          responsable du traitement de vos données ; Fidélions intervient comme sous-traitant
          technique, pour le compte du Restaurant, conformément à l'article 28 du RGPD.
        </p>

        <h2>3. Quelles données sont collectées, et pourquoi</h2>
        <p className="label">Données des clients finaux (personnes créant une carte de fidélité)</p>
        <ul>
          <li>Prénom — nécessaire à la personnalisation de la carte et à son identification par le Restaurant lors du scan.</li>
          <li>Adresse email — nécessaire à la création de la carte, à l'envoi des campagnes et notifications du Restaurant, et au support.</li>
          <li>Numéro de téléphone (facultatif) — collecté pour un usage futur éventuel (notification par SMS), non utilisé activement à ce jour.</li>
          <li>Données de localisation approximative — uniquement si le Restaurant a activé les notifications de proximité, et uniquement transmises à Google Wallet pour déclencher une notification native sur votre téléphone lorsque vous passez à proximité de l'établissement ; Fidélions ne suit pas votre position en continu et ne la reçoit pas directement.</li>
          <li>Historique de fidélité (nombre de points, récompenses obtenues) — nécessaire au fonctionnement du programme.</li>
        </ul>
        <p className="label">Données du Restaurant (compte professionnel)</p>
        <p>
          Identifiants de connexion, adresse du restaurant, éléments de personnalisation de la carte
          (logo, couleurs), informations sur les employés que le Restaurant enregistre (prénom, code
          d'accès, horaires) — nécessaires à la fourniture du Service.
        </p>

        <h2>4. Destinataires des données</h2>
        <p>Vos données peuvent être transmises aux prestataires techniques suivants, strictement nécessaires au fonctionnement du Service :</p>
        <ul>
          <li>Google (Google Wallet) — États-Unis — création et mise à jour de la carte de fidélité numérique ;</li>
          <li>Google (Gemini) — États-Unis — analyse automatique de menu réalisée par le Restaurant (ne concerne pas les données des clients finaux) ;</li>
          <li>Vercel Inc. — États-Unis — hébergement du site et stockage des images (logo/bannière) ;</li>
          <li>Upstash — hébergement de la base de données ;</li>
          <li>Resend — États-Unis — envoi des emails (création de carte, campagnes) ;</li>
          <li>l'API Adresse du gouvernement français (api-adresse.data.gouv.fr) — recherche d'adresse du Restaurant (aucune donnée personnelle d'un Client final n'y est transmise).</li>
        </ul>
        <p>Ces prestataires n'utilisent vos données que pour exécuter les services demandés et ne sont pas autorisés à les exploiter à d'autres fins.</p>

        <h2>5. Transferts hors Union européenne</h2>
        <p>
          Certains prestataires mentionnés ci-dessus (Google, Vercel, Resend) sont établis aux
          États-Unis. Ces transferts sont encadrés par les garanties prévues par le RGPD (clauses
          contractuelles types de la Commission européenne et/ou mécanismes de certification
          équivalents mis en place par ces prestataires).
        </p>

        <h2>6. Durée de conservation</h2>
        <p>
          Données d'un Client final : conservées tant que la carte de fidélité est active, puis{" "}
          <Placeholder text="DURÉE — ex. 3 ans" /> à compter de la dernière activité en l'absence d'utilisation,
          sauf demande de suppression anticipée.
        </p>
        <p>Données du compte Restaurant : conservées pendant toute la durée du contrat, puis selon les modalités prévues aux Conditions Générales de Vente en cas de résiliation.</p>

        <h2>7. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de
          limitation, d'opposition et de portabilité de vos données, ainsi que du droit de définir
          des directives relatives à leur sort après votre décès.
        </p>
        <p>
          Pour les clients finaux d'un restaurant : ces droits peuvent être exercés directement
          auprès du Restaurant concerné (responsable de traitement), ou auprès de Fidélions qui
          transmettra votre demande, à l'adresse <Placeholder text="EMAIL DE CONTACT" />.
        </p>
        <p>Vous disposez également du droit d'introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL) — www.cnil.fr.</p>

        <h2>8. Sécurité</h2>
        <p>Le Prestataire met en œuvre des mesures techniques raisonnables pour protéger vos données : connexion chiffrée (HTTPS), accès protégés par mot de passe ou code personnel, hébergement chez des prestataires reconnus.</p>

        <h2>9. Cookies et traceurs</h2>
        <p>
          Le site utilise uniquement des dispositifs techniques nécessaires au fonctionnement du
          Service (par exemple, la mémorisation locale du mot de passe du compte Restaurant sur son
          propre appareil), sans finalité publicitaire ni traceur tiers de mesure d'audience à ce jour.
        </p>

        <h2>10. Délégué à la protection des données</h2>
        <p>Compte tenu de la taille et de l'activité de Fidélions, la désignation d'un délégué à la protection des données (DPO) n'est pas obligatoire à ce stade. Toute question peut être adressée au contact indiqué à la section 1.</p>

        <h2>11. Modification de cette politique</h2>
        <p>Cette politique peut être mise à jour ; la version en vigueur est celle publiée sur cette page, avec sa date de dernière mise à jour ci-dessus.</p>

        <p className="footdisclaimer">
          Cette page est en cours de finalisation (informations légales de l'entreprise à
          compléter) et n'a pas encore été relue par un professionnel du droit.
        </p>
      </div>

      <style jsx>{`${styles}`}</style>
    </div>
  );
}

function Placeholder({ text }) {
  return <span className="ph">[{text}]</span>;
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
  .label {
    font-weight: 700;
    color: #1a1a1a;
  }
  ul {
    margin: 0 0 12px;
    padding-left: 20px;
  }
  li {
    color: #333;
    font-size: 14.5px;
    line-height: 1.65;
    margin-bottom: 6px;
  }
  .ph {
    color: #8a5c00;
    background: #fff3d6;
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 13.5px;
    font-weight: 600;
  }
  .footdisclaimer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #eee;
    color: #a3a3a3;
    font-size: 12px;
  }
`;
