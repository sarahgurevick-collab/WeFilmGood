import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import Bandeau from "@/components/Bandeau";
import formStyles from "@/components/form.module.css";
import profilStyles from "@/app/profil/profil.module.css";
import { createClient } from "@/lib/supabase/server";
import { tauxDeRemplissage } from "@/lib/remplissage";
import { signerImages } from "@/app/projet/[id]/fichiers";
import { BLOCS, etatDesBlocs, hrefBloc } from "@/app/projet/blocs";
import styles from "./page.module.css";
import SelecteurProjet from "./SelecteurProjet";

const STATUT_LISIBLE: Record<string, string> = {
  brouillon: "Brouillon",
  depose: "Déposé",
  en_lecture: "En lecture",
  labellise: "Labellisé",
  lecture_terminee_non_labellise: "Lu",
};

const FORMATS: Record<string, string> = {
  long_metrage: "Long métrage",
  court_metrage: "Court métrage",
  serie: "Série",
  immersif_360_vr: "360/VR",
};

type Projet = {
  id: string;
  title: string;
  logline: string | null;
  synopsis: string | null;
  format: string | null;
  genre_slug: string | null;
  status: string;
  bandeau: string | null;
  created_at: string;
  genre: { label_fr: string } | null;
  files: { kind: string; storage_path: string }[];
};

/**
 * Mes projets, présentés comme Mon profil (28/09/2026, demande de Sarah) :
 * pour chaque fiche, à gauche ce que voit un talent connecté (l'affiche),
 * à droite « Fiche complétée » avec sa jauge et les trois blocs à remplir.
 * Une nouvelle version du scénario se dépose depuis le bloc Documents ;
 * un autre projet se crée en bas.
 */
export default async function MesProjetsPage({
  searchParams,
}: {
  searchParams: Promise<{ projet?: string }>;
}) {
  const { projet: projetChoisi } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/mes-projets");

  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, logline, synopsis, format, genre_slug, status, bandeau, created_at, genre:genres(label_fr), files:project_files(kind, storage_path)",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Projet[]>();
  const tous = data ?? [];
  if (tous.length === 0) redirect("/projet");
  // Plusieurs projets : un sélecteur, et un seul projet affiché à la fois
  // (le plus récent par défaut).
  const courant = tous.find((p) => p.id === projetChoisi) ?? tous[0];
  const projets = [courant];

  const urls = await signerImages(
    supabase,
    projets.map((p) => p.files.find((f) => f.kind === "vignette")?.storage_path),
  );

  // L'état de chaque fiche : ses trois blocs, et le remplissage global.
  const etats = await Promise.all(
    projets.map(async (p) => {
      const [blocs, { count: personnages }] = await Promise.all([
        etatDesBlocs(supabase, p.id),
        supabase.from("characters").select("id", { count: "exact", head: true }).eq("project_id", p.id),
      ]);
      const taux = tauxDeRemplissage({
        titre: p.title,
        tagline: p.logline,
        logline: p.synopsis,
        genre: p.genre_slug,
        format: p.format,
        aUneVignette: p.files.some((f) => f.kind === "vignette"),
        aUnScenario: p.files.some((f) => f.kind === "scenario"),
        nombrePersonnages: personnages ?? 0,
      });
      return { blocs, taux };
    }),
  );

  return (
    <PageShell nav="deposer" connecte>
      <h1 className={profilStyles.titre}>Mes projets</h1>
      <p className={profilStyles.chapeau}>
        {tous.length === 1 ? "Votre fiche projet" : `Vos ${tous.length} fiches projet`}, telles que
        les voient les talents. Une nouvelle version de votre scénario se dépose depuis le bloc
        « Documents » de la fiche : inutile de créer une seconde fiche pour le même projet.
      </p>

      {/* Le bouton de création en haut, bien visible (28/09), à côté du
          sélecteur quand il y a plusieurs projets. */}
      <div className={styles.entete}>
        {tous.length > 1 && <SelecteurProjet projets={tous.map((p) => ({ id: p.id, titre: p.title }))} courant={courant.id} />}
        <Link href="/projet" className={formStyles.submit} style={{ display: "inline-block" }}>
          Nouvelle fiche projet
        </Link>
      </div>

      {projets.map((p, i) => {
        const image = urls.get(p.files.find((f) => f.kind === "vignette")?.storage_path ?? "");
        const { blocs, taux } = etats[i];
        return (
          <div key={p.id} className={`${profilStyles.scene} ${styles.projet}`}>
            {/* L'affiche : la fiche telle que la voient les talents. */}
            <section className={profilStyles.affiche} aria-label={`Fiche de ${p.title}`}>
              <p className={profilStyles.afficheSurtitre}>Ce que voit un talent connecté</p>
              <div className={styles.vignette} aria-hidden="true">
                <Bandeau valeur={p.bandeau} />
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" />
                ) : (
                  <Link href={hrefBloc(p.id, "documents")} className={profilStyles.manque}>
                    + votre image de présentation
                  </Link>
                )}
              </div>
              <p className={profilStyles.afficheNom}>{p.title}</p>
              <p className={profilStyles.afficheLigne}>
                {[p.genre?.label_fr, p.format ? FORMATS[p.format] : null].filter(Boolean).join(" · ") || (
                  <Link href={hrefBloc(p.id, "fiche")} className={profilStyles.manque}>
                    + genre et format
                  </Link>
                )}
                {" · "}
                {STATUT_LISIBLE[p.status] ?? p.status}
              </p>
              {p.logline ? (
                <p className={styles.tagline}>{p.logline}</p>
              ) : (
                <Link href={hrefBloc(p.id, "fiche")} className={`${styles.tagline} ${profilStyles.manque}`}>
                  + votre tagline
                </Link>
              )}
              <Link href={`/projet/${p.id}`} className={profilStyles.afficheLien}>
                Voir ma fiche
              </Link>
            </section>

            {/* Les trois blocs, comme ceux du profil. */}
            <section className={profilStyles.generique} aria-label={`Compléter ${p.title}`}>
              <div className={profilStyles.generiqueEntete}>
                <h2 className={profilStyles.generiqueTitre}>Fiche complétée</h2>
                <strong className={profilStyles.generiqueCompte}>{taux} %</strong>
              </div>
              <div className={profilStyles.jauge} aria-hidden="true">
                <span style={{ width: `${taux}%` }} />
              </div>
              {BLOCS.map((b) => {
                const estFait = blocs.fait[b.cle];
                const pourcentDuBloc = blocs.pourcent[b.cle];
                const incomplet = pourcentDuBloc < 100;
                return (
                  <Link
                    key={b.cle}
                    href={hrefBloc(p.id, b.cle)}
                    className={incomplet ? profilStyles.etapeIncomplete : profilStyles.etapeComplete}
                    title={incomplet ? "Cliquez pour compléter ce bloc" : "Cliquez pour modifier ce bloc"}
                  >
                    <span className={estFait ? profilStyles.etapeFaite : profilStyles.etapeNumero}>
                      {estFait ? "✓" : b.numero}
                    </span>
                    <span className={profilStyles.etapeTexte}>
                      <strong>{b.titre}</strong>
                      <span>{incomplet ? b.duree : "Complet · modifier"}</span>
                    </span>
                    {incomplet && <span className={profilStyles.etapePourcent}>{pourcentDuBloc} %</span>}
                  </Link>
                );
              })}
            </section>
          </div>
        );
      })}

    </PageShell>
  );
}
