import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { estAdresseFictive } from "@/lib/sans-adresse";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import styles from "../admin.module.css";

/**
 * Les projets sans image de présentation (24/11, Sarah : « plus pratique
 * qu'un export xls qui ne reste pas à jour »). Sans image, un projet
 * n'est visible ni dans les Galaxies ni dans la recherche (0076) : cette
 * liste dit lesquels, toujours à jour. D'abord les projets sélectionnés
 * ou à bandeau (sa priorité du 01/11), puis ceux qui ont un videopitch,
 * puis les plus récents.
 *
 * La liste vient de la fonction projets_sans_image (0329), réservée à
 * l'administration : elle donne aussi l'adresse de l'auteur.
 */

type Ligne = {
  id: string;
  title: string;
  format: string | null;
  bandeau: string | null;
  a_videopitch: boolean;
  created_at: string;
  owner_id: string;
  auteur: string | null;
  email: string | null;
  selections: string | null;
};

const FORMATS: Record<string, string> = {
  long_metrage: "Long métrage",
  court_metrage: "Court métrage",
  serie: "Série",
  immersif_360_vr: "Format immersif",
};

/** La base ne renvoie que 1 000 lignes par demande : on lit par tranches. */
async function toutLire(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Ligne[]> {
  const tranche = 1000;
  const lignes: Ligne[] = [];
  for (let debut = 0; ; debut += tranche) {
    const { data } = await supabase.rpc("projets_sans_image").range(debut, debut + tranche - 1);
    const lot = (data ?? []) as Ligne[];
    lignes.push(...lot);
    if (lot.length < tranche) return lignes;
  }
}

/**
 * La liste, entière (« Projets sans image ») ou réduite aux projets
 * sélectionnés ou à bandeau (« Sélectionnés sans image », 27/11, Sarah :
 * « je préfère travailler avec un onglet en admin » plutôt qu'un export).
 */
export default async function ListeSansImage({ seulementSelectionnes = false }: { seulementSelectionnes?: boolean }) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const tous = await toutLire(supabase);
  const estSelectionne = (l: Ligne) => Boolean(l.selections || l.bandeau);
  const lignes = seulementSelectionnes ? tous.filter(estSelectionne) : tous;
  const selectionnes = tous.filter(estSelectionne).length;

  return (
    <PageShell
      nav="admin"
      avantTitre={<NavAdmin />}
      title={seulementSelectionnes ? "Sélectionnés sans image" : "Projets sans image"}
      theme="clair"
    >
      <p className={formStyles.hint}>
        {seulementSelectionnes
          ? `${lignes.length} projets sélectionnés sans image.`
          : `${lignes.length} projets sans image, dont ${selectionnes} sélectionnés.`}{" "}
        Sans image, un projet
        n&apos;apparaît ni dans les Galaxies ni dans la recherche. Dès que l&apos;image est posée, le
        projet quitte cette liste.
      </p>
      {lignes.length === 0 ? (
        <p className={formStyles.hint}>Tous les projets ont une image.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Projet</th>
              <th>Auteur</th>
              <th>Format</th>
              <th>Sélection</th>
              <th>StoryPitch</th>
              <th>Créé le</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/projet/${l.id}`}>{l.title}</Link>
                </td>
                <td>
                  <Link href={`/membres/${l.owner_id}`}>{l.auteur ?? "—"}</Link>
                  {l.email && !estAdresseFictive(l.email) && (
                    <>
                      <br />
                      <em className={formStyles.hint}>{l.email}</em>
                    </>
                  )}
                </td>
                <td>{l.format ? (FORMATS[l.format] ?? l.format) : ""}</td>
                <td>{l.selections ?? ""}</td>
                <td>{l.a_videopitch ? "Oui" : ""}</td>
                <td>
                  {new Date(l.created_at).toLocaleDateString("fr-FR", {
                    dateStyle: "medium",
                    timeZone: "Europe/Paris",
                  })}
                </td>
                <td>
                  <Link href={`/projet/${l.id}/documents`}>Poser l&apos;image</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
