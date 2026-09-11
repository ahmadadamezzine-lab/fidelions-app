import Link from "next/link";

// Pied de page commun avec les liens légaux (CGV / Confidentialité), affiché
// en bas de toutes les pages publiques et de l'espace commerçant.
export default function LegalFooter({ style }) {
  return (
    <p className="legal-footer" style={style}>
      <Link href="/mentions-legales">Mentions légales</Link>
      <span> · </span>
      <Link href="/cgv">CGV</Link>
      <span> · </span>
      <Link href="/confidentialite">Confidentialité</Link>
      <style jsx>{`
        .legal-footer {
          margin-top: 20px;
          font-size: 11.5px;
          color: #b3b3b3;
          text-align: center;
        }
        .legal-footer :global(a) {
          color: #b3b3b3;
          text-decoration: underline;
        }
      `}</style>
    </p>
  );
}
