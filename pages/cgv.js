import Link from "next/link";

const PURPLE = "#7414F4";

// Page publique des CGV. À la demande d'Adam, les zones [À COMPLÉTER]
// visibles (raison sociale, forme juridique, SIRET, adresse du siège,
// statut TVA) ont été retirées de l'affichage plutôt que remplies par des
// informations inventées — il les ajoutera lui-même une fois son entreprise
// immatriculée. Pour rester valable en l'état, l'article 1 ne mentionne
// donc pour l'instant que le nom commercial « Fidélions », sans numéro
// SIRET ni adresse de siège ; à compléter dès que ces informations
// existent (idem pages/confidentialite.js).
export default function CGV() {
  return (
    <div className="page">
      <div className="doc">
        <Link href="/" className="back">← Retour à l'accueil</Link>
        <h1>Conditions Générales de Vente</h1>
        <p className="subtitle">Fidélions — dernière mise à jour : 10 septembre 2026</p>

        <h2>Article 1 — Objet</h2>
        <p>
          Les présentes conditions générales de vente (ci-après « CGV ») ont pour objet de définir
          les modalités et conditions dans lesquelles Fidélions (ci-après « le Prestataire » ou{" "}
          « Fidélions »), propose et fournit à ses clients professionnels
          (ci-après « le Client » ou « l'Établissement ») un service de fidélisation client digitale
          accessible en ligne (ci-après « le Service »).
        </p>
        <p>Toute souscription au Service implique l'acceptation sans réserve des présentes CGV par le Client.</p>

        <h2>Article 2 — Description du service</h2>
        <p>Fidélions est un outil en ligne (SaaS) permettant à un commerce de :</p>
        <ul>
          <li>générer une carte de fidélité numérique ajoutable directement au portefeuille mobile (Google Wallet) de ses clients, sans installation d'application dédiée ;</li>
          <li>gérer un programme de fidélité par points, à paliers personnalisables ;</li>
          <li>envoyer des notifications et campagnes promotionnelles à ses clients inscrits ;</li>
          <li>consulter des statistiques de fréquentation et de fidélité ;</li>
          <li>personnaliser l'apparence de la carte (couleur, logo, bannière) ;</li>
          <li>gérer les accès de son équipe (comptes employés, horaires, permissions) ;</li>
          <li>activer des notifications de proximité géolocalisées.</li>
        </ul>
        <p>La liste des fonctionnalités disponibles peut évoluer ; le Prestataire s'efforce d'informer le Client de toute modification substantielle.</p>

        <h2>Article 3 — Accès au service et compte</h2>
        <p>
          L'accès au Service est réservé aux commerces ayant souscrit une offre auprès du
          Prestataire. Le Client est seul responsable de la confidentialité des identifiants (mot
          de passe, codes employés) qui lui sont attribués ou qu'il définit, et de toute action
          réalisée depuis son espace.
        </p>

        <h2>Article 4 — Tarifs et modalités de paiement</h2>
        <p>
          Le Service est proposé à partir de 49 € par mois pour un point de vente, selon un tarif
          croissant avec le nombre de points de vente gérés par le Client ; la grille tarifaire
          complète est communiquée au Client lors de la souscription. Le tarif choisi n'implique
          aucun engagement de durée sur la formule mensuelle et aucune commission sur les ventes du
          Client, sauf offre commerciale particulière convenue par écrit entre les parties.
        </p>
        <p>Le tarif applicable est celui en vigueur au jour de la souscription, rappelé au Client avant tout premier paiement.</p>
        <p>
          Le paiement s'effectue via un lien de paiement sécurisé communiqué par le Prestataire
          (aucune donnée bancaire n'est collectée directement par Fidélions), exigible au début de
          chaque période choisie (mensuelle, semestrielle ou annuelle).
        </p>
        <p>Toute modification tarifaire sera communiquée au Client au moins 30 jours avant son entrée en vigueur ; le Client pourra alors résilier son abonnement dans les conditions de l'article 6, sans pénalité.</p>

        <h2>Article 5 — Durée</h2>
        <p>Le contrat est conclu pour une durée d'un (1) mois, renouvelable par tacite reconduction pour des périodes successives d'un (1) mois, sauf résiliation dans les conditions de l'article 6.</p>

        <h2>Article 6 — Résiliation</h2>
        <p>
          Chaque partie peut résilier le contrat à tout moment, sans motif ni pénalité et sans
          préavis, par écrit (un email suffit) à l'adresse de contact du Prestataire. La résiliation
          prend effet à la fin de la période mensuelle en cours ; le mois déjà entamé reste dû.
        </p>
        <p>
          En cas de résiliation, les données du Client sont conservées pendant 30 jours puis
          supprimées, sauf obligation légale de conservation plus longue. Le Client peut demander
          l'export de ses données avant suppression.
        </p>
        <p>
          Le Prestataire se réserve le droit de suspendre ou résilier l'accès au Service en cas de
          manquement grave du Client à ses obligations (notamment non-paiement, usage frauduleux ou
          contraire à la loi), après mise en demeure restée sans effet pendant 8 jours.
        </p>

        <h2>Article 7 — Obligations du Prestataire</h2>
        <p>Le Prestataire s'engage à :</p>
        <ul>
          <li>mettre en œuvre les moyens raisonnables pour assurer la disponibilité et le bon fonctionnement du Service ;</li>
          <li>assurer un support en cas de dysfonctionnement signalé par le Client, dans un délai raisonnable ;</li>
          <li>traiter les données personnelles des clients finaux de l'Établissement conformément à sa Politique de confidentialité et à la réglementation applicable (voir article 9).</li>
        </ul>
        <p>Le Prestataire ne garantit pas une disponibilité continue et ininterrompue du Service, notamment en cas de maintenance, de panne d'un prestataire tiers (hébergeur, Google Wallet, etc.) ou de force majeure.</p>

        <h2>Article 8 — Obligations du Client</h2>
        <p>Le Client s'engage à :</p>
        <ul>
          <li>fournir des informations exactes lors de son inscription et de l'utilisation du Service ;</li>
          <li>utiliser le Service conformément à sa destination et à la réglementation applicable, notamment en matière de protection des données personnelles de ses propres clients et de communications commerciales ;</li>
          <li>ne pas céder, revendre ou permettre l'usage du Service par un tiers non autorisé ;</li>
          <li>payer le prix convenu aux échéances prévues.</li>
        </ul>

        <h2>Article 9 — Protection des données personnelles</h2>
        <p>
          Dans le cadre de l'utilisation du Service, le Prestataire est amené à traiter, pour le
          compte du Client, des données à caractère personnel relatives aux clients finaux de
          l'Établissement (prénom, email, téléphone, données de localisation le cas échéant, historique
          de fidélité). À ce titre, conformément à l'article 28 du Règlement (UE) 2016/679 (« RGPD ») :
        </p>
        <ul>
          <li>le Client est responsable du traitement de ces données, dans le cadre de sa relation avec ses propres clients ;</li>
          <li>le Prestataire agit en qualité de sous-traitant, sur instruction documentée du Client, et met en œuvre des mesures techniques et organisationnelles appropriées pour garantir la sécurité de ces données ;</li>
          <li>le Prestataire peut recourir à des sous-traitants ultérieurs (hébergement, envoi d'emails, service de portefeuille mobile), listés dans sa Politique de confidentialité, et s'engage à leur imposer des garanties équivalentes ;</li>
          <li>à l'issue du contrat, les données sont supprimées ou restituées selon les modalités de l'article 6.</li>
        </ul>
        <p>Les données propres au compte du Client (identité du commerce, moyens de contact, employés qu'il enregistre) sont quant à elles traitées par le Prestataire en qualité de responsable de traitement, dans les conditions décrites dans sa Politique de confidentialité.</p>

        <h2>Article 10 — Propriété intellectuelle</h2>
        <p>Le Prestataire demeure titulaire de l'ensemble des droits de propriété intellectuelle attachés au Service (logiciel, interface, marque « Fidélions », etc.). Le Client bénéficie d'un droit d'usage personnel, non exclusif et non cessible, pour la durée du contrat.</p>
        <p>Les contenus fournis par le Client (logo, textes, visuels de la carte) restent sa propriété ; il garantit disposer des droits nécessaires à leur utilisation et en autorise l'usage par le Prestataire aux seules fins de fourniture du Service.</p>

        <h2>Article 11 — Responsabilité</h2>
        <p>Le Prestataire ne saurait être tenu responsable des dommages indirects subis par le Client (perte de chiffre d'affaires, perte de clientèle, préjudice d'image, etc.).</p>
        <p>Sa responsabilité, si elle est retenue, est limitée au montant des sommes effectivement versées par le Client au titre du Service au cours des 12 derniers mois précédant le fait générateur.</p>
        <p>Le Prestataire n'est pas responsable des dysfonctionnements imputables à des services tiers indépendants de sa volonté (Google Wallet, hébergeur, opérateurs de télécommunication, etc.).</p>

        <h2>Article 12 — Force majeure</h2>
        <p>Aucune des parties ne pourra être tenue responsable envers l'autre en cas d'inexécution de ses obligations résultant d'un cas de force majeure au sens de l'article 1218 du Code civil.</p>

        <h2>Article 13 — Droit applicable et litiges</h2>
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige, les parties
          s'efforceront de trouver une solution amiable avant toute action judiciaire. À défaut, les
          tribunaux du ressort du siège social du Prestataire seront seuls compétents, sauf
          disposition légale impérative contraire.
        </p>

        <h2>Article 14 — Contact</h2>
        <p>Pour toute question relative aux présentes CGV : ahmadadamezzine@gmail.com.</p>
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
`;
