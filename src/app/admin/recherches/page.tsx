import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import styles from "../admin.module.css";

/**
 * Le journal des recherches sans résultat (30/09) : ce que les membres
 * ont tapé dans la Carte des étoiles sans rien trouver, ni projet, ni
 * talent, ni personnage. À relire de temps en temps pour en tirer des
 * synonymes ou des mots-clés à fusionner.
 */
export default async function RecherchesAdminPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const { data } = await supabase.rpc("recherches_sans_resultat_resume", { p_limite: 300 });
  const lignes = (data ?? []) as { requete: string; fois: number; derniere: string }[];

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Recherches sans résultat" theme="clair">
      <p className={formStyles.hint}>
        Ce que les membres ont tapé dans les Galaxies sans rien trouver, ni projet, ni
        talent, ni personnage. Les frappes intermédiaires d&apos;une même recherche ne sont
        comptées qu&apos;une fois.
      </p>
      {lignes.length === 0 ? (
        <p className={formStyles.hint}>Aucune recherche sans résultat pour l&apos;instant.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Recherche</th>
              <th>Fois</th>
              <th>Dernière fois</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.requete}>
                <td>
                  <Link href={`/pitchotheque?q=${encodeURIComponent(l.requete)}`}>{l.requete}</Link>
                </td>
                <td>{l.fois}</td>
                <td>
                  {new Date(l.derniere).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Europe/Paris",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
