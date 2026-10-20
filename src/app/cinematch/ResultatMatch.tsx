import Link from "next/link";
import formStyles from "@/components/form.module.css";
import type { Match } from "@/lib/cinematch";
import { TEXTES } from "./textes";

/**
 * Le meilleur match : pour tout le monde le pourcentage, le métier et le
 * pays (« Producteur · Singapour ») ; le nom seulement avec un profil complet
 * ET une adhésion (`nom` n'est fourni que dans ce cas ; `profileId` mène à
 * sa fiche). Sans adhésion on renvoie vers l'adhésion, avec une adhésion mais
 * un profil incomplet vers le profil.
 */
export default function ResultatMatch({
  match,
  adherent = false,
  nom,
  connecte = false,
}: {
  match: Match | null;
  adherent?: boolean;
  nom?: string | null;
  connecte?: boolean;
}) {
  if (!match) {
    return <p className={formStyles.hint}>{TEXTES.aucunMatch}</p>;
  }

  return (
    <section
      aria-label={TEXTES.resultatTitre}
      style={{
        margin: "24px 0",
        padding: "24px",
        border: "2px solid var(--rouge-wfg, #da2c25)",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <p className={formStyles.hint} style={{ margin: 0 }}>
        {TEXTES.resultatTitre}
      </p>
      <p style={{ fontSize: 44, fontWeight: 800, margin: "6px 0", color: "var(--rouge-wfg, #da2c25)" }}>
        {match.pourcentage} %
      </p>
      <p style={{ margin: 0, fontWeight: 700 }}>{TEXTES.resultatPourcent(match.pourcentage)}</p>
      <p className={formStyles.hint} style={{ margin: "4px 0 0" }}>
        {TEXTES.resultatPoids(match.communes, match.comparees)}
      </p>

      {(match.metier || match.pays) && (
        <p style={{ margin: "12px 0 0", fontWeight: 600 }}>
          {[match.metier, match.pays].filter(Boolean).join(" · ")}
        </p>
      )}

      {nom ? (
        <p style={{ margin: "16px 0 0" }}>
          <Link href={`/membres/${match.profileId}`}>
            <strong>{nom}</strong> — {TEXTES.voirProfil}
          </Link>
        </p>
      ) : connecte && adherent ? (
        <p className={formStyles.hint} style={{ margin: "16px 0 0" }}>
          {TEXTES.nomProfilIncomplet} <Link href="/profil">{TEXTES.voirProfilIncomplet}</Link>
        </p>
      ) : (
        <p className={formStyles.hint} style={{ margin: "16px 0 0" }}>
          {TEXTES.nomReserve} <Link href="/adhesion">{TEXTES.voirAdhesion}</Link>
        </p>
      )}
    </section>
  );
}
