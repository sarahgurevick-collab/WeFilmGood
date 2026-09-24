import Link from "next/link";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import profilStyles from "@/app/profil/profil.module.css";
import AfficheProjet from "./AfficheProjet";
import { AUDIENCES, BUDGETS, FORMATS } from "./ChampsFiche";
import { signerImages } from "./[id]/fichiers";
import { BLOCS, etatDesBlocs, hrefBloc, type Bloc, type ProjetAModifier } from "./blocs";
import styles from "./affiche.module.css";

/**
 * Un bloc de la fiche projet, présenté comme le sommaire du profil : à
 * gauche l'affiche (la fiche telle que la verra un producteur, remplie en
 * direct sur le bloc « La fiche »), à droite le générique des trois blocs
 * puis le formulaire. Sans projet (nouvelle fiche), seul le premier bloc
 * est ouvert : les deux autres attendent la création.
 */
export default async function BlocProjet({
  actif,
  projet,
  children,
}: {
  actif: Bloc;
  projet: ProjetAModifier | null;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const [etat, { data: genres }, { data: vignettes }] = await Promise.all([
    projet ? etatDesBlocs(supabase, projet.id) : Promise.resolve(null),
    supabase.from("genres").select("slug, label_fr"),
    projet
      ? supabase
          .from("project_files")
          .select("storage_path")
          .eq("project_id", projet.id)
          .eq("kind", "vignette")
          .limit(1)
      : Promise.resolve({ data: [] as { storage_path: string }[] }),
  ]);

  const cheminVignette = vignettes?.[0]?.storage_path ?? null;
  const signees = await signerImages(supabase, [cheminVignette]);
  const vignette = cheminVignette ? (signees.get(cheminVignette) ?? null) : null;

  const libelles: Record<string, string> = Object.fromEntries([
    ...[...FORMATS, ...BUDGETS, ...AUDIENCES].map((o) => [o.value, o.label]),
    ...(genres ?? []).map((g) => [g.slug, g.label_fr]),
  ]);

  const bloc = BLOCS.find((b) => b.cle === actif)!;

  return (
    <PageShell nav="deposer" connecte>
      <div className={styles.scene}>
        <div className={styles.colonneAffiche}>
          {/* Nouvelle fiche : pas de lien de retour, le menu mène déjà à la pitchothèque. */}
          {projet && (
            <Link href={`/projet/${projet.id}`} className={styles.retour}>
              ← Retour à la fiche
            </Link>
          )}
          <AfficheProjet
            initial={{
              title: projet?.title ?? "",
              logline: projet?.logline ?? "",
              synopsis: projet?.synopsis ?? "",
              format: projet?.format ?? "",
              genre_slug: projet?.genre_slug ?? "",
              budget_range: projet?.budget_range ?? "",
              target_audience: projet?.target_audience ?? "",
              has_awards: projet?.has_awards ?? false,
            }}
            libelles={libelles}
            vignette={vignette}
            enDirect={actif === "fiche"}
            lienFiche={actif === "fiche" || !projet ? null : hrefBloc(projet.id, "fiche")}
          />
        </div>

        <div className={styles.colonneFormulaire}>
          <nav className={styles.generique} aria-label="Les trois blocs de la fiche">
            {BLOCS.map((b) => {
              const estFait = etat?.fait[b.cle] ?? false;
              const pourcent = etat?.pourcent[b.cle] ?? 0;
              const contenu = (
                <>
                  <span className={styles.etapeHaut}>
                    <span className={estFait ? styles.numeroFait : styles.numero}>
                      {estFait ? "✓" : b.numero}
                    </span>
                    {b.titre}
                  </span>
                  <span className={styles.barre} aria-hidden="true">
                    <span style={{ width: `${pourcent}%` }} />
                  </span>
                </>
              );
              if (!projet && b.cle !== "fiche") {
                return (
                  <span key={b.cle} className={styles.etapeFermee} title="Après la création de la fiche">
                    {contenu}
                  </span>
                );
              }
              return (
                <Link
                  key={b.cle}
                  href={projet ? hrefBloc(projet.id, b.cle) : "/projet"}
                  className={b.cle === actif ? styles.etapeActive : styles.etape}
                  aria-current={b.cle === actif ? "step" : undefined}
                >
                  {contenu}
                </Link>
              );
            })}
          </nav>

          <p className={profilStyles.surtitre}>
            {projet ? `« ${projet.title} »` : "Nouvelle fiche projet"} · Bloc {bloc.numero} sur{" "}
            {BLOCS.length}
            {projet && ` · ${etat?.pourcent[actif] ?? 0} %`}
          </p>
          <h1 className={profilStyles.titre}>{bloc.titre}</h1>
          {children}
          <p className={profilStyles.menuNote} style={{ marginTop: 28 }}>
            {projet
              ? "Chaque bloc s'enregistre seul. Vous pouvez partir et revenir quand vous voulez."
              : "Les documents et les personnages s'ouvrent dès que la fiche est créée."}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
