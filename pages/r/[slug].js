// pages/r/[slug].js
//
// Page d'inscription PUBLIQUE d'UN restaurant (multi-comptes) : chaque
// commerçant partage son propre lien /r/[son-slug] (QR ou lien direct,
// voir l'onglet "Partager" de /commercant). Remplace l'ancienne page
// d'accueil unique (pages/index.js), qui supposait un seul restaurant sur
// tout le site. On récupère d'abord le nom/couleur/logo public du
// restaurant (pages/api/public-merchant) pour habiller la page à ses
// couleurs, puis on envoie l'inscription à pages/api/create-pass avec le
// slug pour qu'elle atterrisse chez le bon commerçant.

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import LegalFooter from "../../components/LegalFooter";
import { getMerchantBySlug, getBranding, getEstablishmentInfo } from "../../lib/db";

const DEFAULT_PURPLE = "#7414F4";

// Récupère le nom/couleur/logo du restaurant CÔTÉ SERVEUR, avant même
// d'envoyer le HTML au navigateur — avant ce correctif, cette page
// affichait juste "Un instant…" tant qu'un fetch côté client n'avait pas
// répondu : un lien partagé sur WhatsApp (l'aperçu de lien, qui ne charge
// aucun JavaScript) ou un moteur/agent IA qui ne exécute pas le
// JavaScript ne voyaient donc jamais le nom du restaurant — la page était
// "invisible" pour eux, alors que c'est justement le lien que chaque
// commerçant partage le plus (QR code, WhatsApp...). Avec
// getServerSideProps, le nom et le logo du restaurant sont déjà dans le
// HTML envoyé, donc visibles par n'importe qui/n'importe quoi qui lit
// cette page sans exécuter de JS.
export async function getServerSideProps({ params }) {
  const slug = String(params?.slug || "");
  const merchant = await getMerchantBySlug(slug);
  if (!merchant) {
    return { props: { initialMerchant: null } };
  }
  const [branding, establishment] = await Promise.all([
    getBranding(merchant.id),
    getEstablishmentInfo(merchant.id),
  ]);
  return {
    props: {
      initialMerchant: {
        restaurantName: merchant.restaurantName,
        slug: merchant.slug,
        hexColor: branding?.hexColor || null,
        logoUrl: branding?.logoUrl || null,
        googleReviewUrl: establishment?.googleReviewUrl || null,
      },
    },
  };
}

export default function RestaurantSignup({ initialMerchant }) {
  const router = useRouter();
  const { slug } = router.query;

  // { restaurantName, hexColor, logoUrl } — déjà rempli par
  // getServerSideProps ci-dessus, plus besoin d'un état "chargement" par
  // défaut ni d'un fetch client pour l'obtenir (voir le useEffect retiré
  // plus bas).
  const [merchant] = useState(initialMerchant);
  const [merchantError] = useState(!initialMerchant);

  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, referralUrl, points }
  const [copied, setCopied] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [pushStatus, setPushStatus] = useState("idle"); // idle | loading | subscribed | denied | unsupported | error

  const memberSince = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());

  useEffect(() => {
    if (router.isReady && router.query.ref) {
      setRefCode(String(router.query.ref));
    }
  }, [router.isReady, router.query.ref]);

  const purple = merchant?.hexColor || DEFAULT_PURPLE;
  const logoSrc = merchant?.logoUrl || "/logo.png";

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/create-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, prenom, email, telephone, ref: refCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyReferral() {
    if (!result?.referralUrl) return;
    navigator.clipboard.writeText(result.referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function shareReferral() {
    if (!result?.referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: merchant?.restaurantName || "Fidélions",
          text: "Rejoins-moi sur le programme fidélité, on gagne chacun un point !",
          url: result.referralUrl,
        });
        return;
      } catch {
        // Partage annulé/indisponible — on retombe sur le copier-coller.
      }
    }
    copyReferral();
  }

  // Conversion de la clé publique VAPID (base64 URL-safe, format standard
  // Web Push) au format Uint8Array attendu par pushManager.subscribe —
  // conversion classique documentée par la spec, aucune lib dédiée requise.
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function handleActivateNotifications() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) {
      setPushStatus("unsupported");
      return;
    }
    setPushStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const res = await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, objectId: result.objectId, subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error("Échec de l'enregistrement de l'abonnement");
      setPushStatus("subscribed");
    } catch (err) {
      console.error(err);
      setPushStatus("error");
    }
  }

  // --- Restaurant introuvable (mauvais lien / compte supprimé) ---
  if (merchantError) {
    return (
      <div className="page">
        <Head>
          <title>Établissement introuvable — Fidélions</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="card">
          <h1>Établissement introuvable</h1>
          <p className="subtitle">
            Ce lien ne correspond à aucun établissement Fidélions. Vérifiez le
            lien ou le QR code auprès du commerce.
          </p>
          <LegalFooter />
        </div>
        <style jsx>{`
          .page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(160deg, ${DEFAULT_PURPLE} 0%, #4a0ba3 100%);
            padding: 24px;
            font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .card {
            background: #fff;
            border-radius: 24px;
            padding: 40px 32px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          }
          h1 {
            font-size: 22px;
            margin: 0 0 8px;
            color: #1a1a1a;
          }
          .subtitle {
            color: #595959;
            font-size: 14px;
            line-height: 1.5;
          }
        `}</style>
      </div>
    );
  }

  const pageTitle = `${merchant?.restaurantName || "Fidélions"} — Carte de fidélité`;
  const pageDescription = `Ajoutez votre carte de fidélité ${merchant?.restaurantName || ""} directement sur votre téléphone (Apple/Google Wallet), sans application à installer.`;

  return (
    <div className="page">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {logoSrc && <meta property="og:image" content={logoSrc} />}
        <meta property="og:type" content="website" />
      </Head>
      <div className="card">
        <img src={logoSrc} alt={merchant?.restaurantName || "Fidélions"} className="logo" />

        {!result ? (
              <>
                <h1>Bienvenue chez {merchant?.restaurantName || "nous"}</h1>
                <p className="subtitle">
                  Ajoutez votre carte de fidélité à votre téléphone en un geste —
                  aucune application à installer.
                </p>
                {refCode && (
                  <p className="refNotice">Un ami vous a invité — vous démarrez avec un point offert !</p>
                )}

                <form onSubmit={handleAdd}>
                  <label htmlFor="prenom">Votre prénom</label>
                  <input
                    id="prenom"
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Ex : Julie"
                    required
                  />
                  <label htmlFor="email">Votre email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex : julie@exemple.com"
                    required
                  />
                  <p className="fieldHint">
                    Pour recevoir nos offres et promos par email.
                  </p>
                  <label htmlFor="telephone">Votre téléphone (optionnel)</label>
                  <input
                    id="telephone"
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="Ex : 06 12 34 56 78"
                  />
                  <p className="fieldHint">
                    Pour recevoir aussi une notification par SMS (bientôt disponible).
                  </p>
                  <button type="submit" disabled={loading}>
                    {loading ? "Un instant…" : "Créer ma carte"}
                  </button>
                </form>

                {error && <p className="error">{error}</p>}
              </>
            ) : (
              <>
                <p className="eyebrow">Carte de fidélité</p>
                <h1>{merchant?.restaurantName || "Fidélions"}</h1>

                <section className="panel">
                  <p className="panelTitle">Programme fidélité</p>
                  <p className="pointsLabel">Points</p>
                  <p className="pointsValue">{result.points}</p>
                  <p className="pointsGoal">
                    points • objectif {result.rewardThreshold}
                  </p>
                  <div className="progressTrack">
                    <div
                      className="progressFill"
                      style={{ width: `${Math.min(100, (result.points / (result.rewardThreshold || 1)) * 100)}%` }}
                    />
                  </div>
                  {result.rewardLabel && <p className="rewardLabel">{result.rewardLabel}</p>}
                  <div className="miniRow">
                    <span className="miniLabel">Membre depuis</span>
                    <span className="miniValue">{memberSince}</span>
                  </div>
                  <p className="codeChip">C-{result.referralCode}</p>
                </section>

                <section className="panel">
                  <p className="panelTitle">Notifications</p>
                  <p className="panelSubtitle">Ne ratez aucune offre</p>
                  <p className="panelText">
                    Promotions, récompenses débloquées, invitations : recevez tout directement sur
                    votre téléphone.
                  </p>
                  <button type="button" onClick={handleActivateNotifications} disabled={pushStatus === "loading" || pushStatus === "subscribed"}>
                    {pushStatus === "subscribed"
                      ? "Notifications activées ✓"
                      : pushStatus === "loading"
                      ? "Un instant…"
                      : "Activer les notifications"}
                  </button>
                  {pushStatus === "denied" && (
                    <p className="pushHint">
                      Notifications bloquées — autorisez-les dans les réglages de votre navigateur pour les
                      activer.
                    </p>
                  )}
                  {pushStatus === "unsupported" && (
                    <p className="pushHint">
                      Les notifications ne sont pas disponibles sur ce navigateur/appareil.
                    </p>
                  )}
                  {pushStatus === "error" && (
                    <p className="pushHint">Une erreur est survenue — réessayez.</p>
                  )}
                </section>

                <section className="panel">
                  <p className="panelTitle">Ajouter à votre wallet</p>
                  <button
                    type="button"
                    className="appleWalletBtn"
                    disabled
                    title="Le support Apple Wallet arrive bientôt sur Fidélions"
                  >
                    Ajouter à Apple Wallet — bientôt disponible
                  </button>
                  <a className="walletBtn" href={result.url}>
                    Ajouter à Google Wallet
                  </a>
                </section>

                <section className="panel">
                  <p className="panelTitle">Mon compte</p>
                  <div className="accountRow">
                    <span className="miniLabel">Code client</span>
                    <span className="miniValue">C-{result.referralCode}</span>
                  </div>
                  {email && (
                    <div className="accountRow">
                      <span className="miniLabel">Email</span>
                      <span className="miniValue">{email}</span>
                    </div>
                  )}
                  <div className="accountRow">
                    <span className="miniLabel">Membre depuis</span>
                    <span className="miniValue">{memberSince}</span>
                  </div>
                  <p className="panelText">
                    Votre carte est mise à jour automatiquement après chaque visite chez{" "}
                    {merchant?.restaurantName || "ce commerce"}.
                  </p>
                </section>

                <p className="poweredBy">Propulsé par Fidélions</p>

                <section className="panel">
                  <p className="panelTitle">Gagnez plus de récompenses</p>
                  <div className="referralBox">
                    <p className="referralTitle">Parrainage — Invitez un ami</p>
                    <p className="referralText">
                      Vous gagnez tous les deux 1 point dès son premier passage en caisse.
                    </p>
                    <div className="referralRow">
                      <input readOnly value={result.referralUrl} onFocus={(e) => e.target.select()} />
                      <button type="button" onClick={copyReferral}>
                        {copied ? "Copié !" : "Copier"}
                      </button>
                    </div>
                    <button type="button" className="shareBtn" onClick={shareReferral}>
                      Partager mon invitation
                    </button>
                  </div>

                  {merchant?.googleReviewUrl && (
                    <div className="reviewBox">
                      <p className="referralTitle">★ Donnez votre avis Google, gagnez des points</p>
                      <p className="referralText">
                        Laissez un avis sur notre fiche Google, puis montrez-le en caisse lors de
                        votre prochain passage pour recevoir vos points bonus.
                      </p>
                      <a
                        className="reviewLinkBtn"
                        href={merchant.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Laisser un avis
                      </a>
                    </div>
                  )}
                </section>
              </>
            )}

            <p className="footnote">
              Vous n'avez pas Google Wallet ? Votre carte reste accessible via ce
              lien — gardez-le précieusement.
            </p>

            <LegalFooter />
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, ${purple} 0%, #4a0ba3 100%);
          padding: 24px;
          font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .card {
          background: #fff;
          border-radius: 24px;
          padding: 40px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }
        .logo {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          margin-bottom: 16px;
          object-fit: cover;
        }
        h1 {
          font-size: 22px;
          margin: 0 0 8px;
          color: #1a1a1a;
        }
        .subtitle {
          color: #595959;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 28px;
        }
        .refNotice {
          background: #f3ecff;
          color: ${purple};
          font-size: 13px;
          font-weight: 600;
          border-radius: 10px;
          padding: 10px 14px;
          margin: -16px 0 20px;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
        }
        input {
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid #e0e0e0;
          font-size: 16px;
          margin-bottom: 16px;
        }
        input:focus {
          outline: none;
          border-color: ${purple};
        }
        button {
          background: ${purple};
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .walletBtn {
          display: block;
          background: ${purple};
          color: #fff;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          margin-bottom: 12px;
          text-align: center;
        }
        .appleWalletBtn {
          display: block;
          width: 100%;
          background: #f2f2f2;
          color: #9a9a9a;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: default;
          margin-bottom: 24px;
        }
        .referralBox {
          background: #faf9fd;
          border-radius: 14px;
          padding: 18px;
          text-align: left;
        }
        .reviewBox {
          background: #fff8e6;
          border-radius: 14px;
          padding: 18px;
          text-align: left;
          margin-top: 12px;
        }
        .reviewLinkBtn {
          display: inline-block;
          background: #f5a623;
          color: #fff;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }
        .referralTitle {
          font-weight: 700;
          font-size: 14px;
          margin: 0 0 4px;
          color: #1a1a1a;
        }
        .referralText {
          font-size: 12px;
          color: #8a8a8a;
          margin: 0 0 12px;
        }
        .referralRow {
          display: flex;
          gap: 8px;
        }
        .referralRow input {
          flex: 1;
          margin-bottom: 0;
          font-size: 12px;
          padding: 10px 12px;
        }
        .referralRow button {
          padding: 10px 14px;
          font-size: 13px;
          white-space: nowrap;
        }
        .fieldHint {
          font-size: 11.5px;
          color: #8a8a8a;
          margin: -10px 0 16px;
        }
        .error {
          color: #c0392b;
          font-size: 13px;
          margin-top: 12px;
        }
        .footnote {
          font-size: 12px;
          color: #8a8a8a;
          margin-top: 24px;
        }
        .eyebrow {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${purple};
          margin: 0 0 4px;
        }
        .panel {
          background: #faf9fd;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          text-align: left;
        }
        .panelTitle {
          font-weight: 700;
          font-size: 14px;
          color: #1a1a1a;
          margin: 0 0 12px;
        }
        .panelSubtitle {
          font-weight: 700;
          font-size: 13px;
          color: #1a1a1a;
          margin: 0 0 4px;
        }
        .panelText {
          font-size: 12.5px;
          color: #8a8a8a;
          line-height: 1.5;
          margin: 0;
        }
        .pointsLabel {
          font-size: 12px;
          color: #8a8a8a;
          margin: 0;
          text-align: center;
        }
        .pointsValue {
          font-size: 44px;
          font-weight: 800;
          color: ${purple};
          margin: 0;
          text-align: center;
          line-height: 1.1;
        }
        .pointsGoal {
          font-size: 12.5px;
          color: #8a8a8a;
          margin: 0 0 12px;
          text-align: center;
        }
        .progressTrack {
          background: #e9e3f8;
          border-radius: 999px;
          height: 8px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .progressFill {
          background: ${purple};
          height: 100%;
          border-radius: 999px;
        }
        .rewardLabel {
          background: #f3ecff;
          color: ${purple};
          font-weight: 700;
          font-size: 13px;
          border-radius: 10px;
          padding: 10px 14px;
          text-align: center;
          margin: 0 0 14px;
        }
        .miniRow,
        .accountRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding: 8px 0;
          border-bottom: 1px solid #ece7f7;
        }
        .accountRow:last-of-type {
          border-bottom: none;
          margin-bottom: 10px;
        }
        .miniLabel {
          color: #8a8a8a;
        }
        .miniValue {
          font-weight: 700;
          color: #1a1a1a;
        }
        .codeChip {
          display: inline-block;
          margin: 10px 0 0;
          background: #fff;
          border: 1.5px solid #e0e0e0;
          border-radius: 8px;
          padding: 6px 12px;
          font-family: "SFMono-Regular", Consolas, monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }
        .pushHint {
          font-size: 12px;
          color: #8a8a8a;
          margin: 10px 0 0;
        }
        .poweredBy {
          font-size: 11px;
          color: #b3b3b3;
          text-align: center;
          margin: 0 0 16px;
        }
        .shareBtn {
          width: 100%;
          background: #fff;
          color: ${purple};
          border: 1.5px solid ${purple};
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}
