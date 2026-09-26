import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { signerImages } from "@/app/projet/[id]/fichiers";
import styles from "./page.module.css";

const STATUT_LISIBLE: Record<string, string> = {
  brouillon: "Brouillon",
  depose: "Déposé",
  en_lecture: "En lecture",
  labellise: "Labellisé",
};

type Projet = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  vignette: { storage_path: string }[];
};

/**
 * Les fiches projet du membre connecté, pour y revenir depuis le menu
 * (l'onglet « Mes projets », 26/09/2026). Deux gestes bien séparés, à la
 * demande de Sarah : déposer une nouvelle version du scénario d'un projet
 * existant — depuis sa fiche, sans en créer une seconde —, et créer une
 * fiche pour un nouveau projet. Sans aucune fiche, on arrive directement
 * sur la création.
 */
export default async function MesProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/mes-projets");

  const { data } = await supabase
    .from("projects")
    .select("id, title, status, created_at, vignette:project_files(storage_path)")
    .eq("owner_id", user.id)
    .eq("project_files.kind", "vignette")
    .order("created_at", { ascending: false })
    .returns<Projet[]>();
  const projets = data ?? [];
  if (projets.length === 0) redirect("/projet");

  const urls = await signerImages(
    supabase,
    projets.map((p) => p.vignette[0]?.storage_path),
  );

  return (
    <PageShell eyebrow="Mon profil" title="Mes projets" connecte nav="deposer">
      <p className={formStyles.hint}>
        Une nouvelle version de votre scénario se dépose depuis la fiche du projet, dans son bloc
        « Documents » : inutile de créer une seconde fiche pour le même projet.
      </p>

      <ul className={styles.liste}>
        {projets.map((p) => {
          const image = p.vignette[0] ? urls.get(p.vignette[0].storage_path) : undefined;
          return (
            <li key={p.id} className={styles.carte}>
              <Link href={`/projet/${p.id}`} className={styles.vignette} aria-hidden="true">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" />
                ) : (
                  <span className={styles.sansImage} />
                )}
              </Link>
              <div className={styles.texte}>
                <Link href={`/projet/${p.id}`} className={styles.titre}>
                  {p.title}
                </Link>
                <span className={styles.statut}>{STATUT_LISIBLE[p.status] ?? p.status}</span>
                <span className={styles.liens}>
                  <Link href={`/projet/${p.id}`}>Voir la fiche</Link>
                  <Link href={`/projet/${p.id}/documents`}>Déposer une nouvelle version</Link>
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p style={{ marginTop: 32 }}>
        <Link href="/projet" className={formStyles.submit} style={{ display: "inline-block" }}>
          Nouvelle fiche projet
        </Link>
      </p>
    </PageShell>
  );
}
