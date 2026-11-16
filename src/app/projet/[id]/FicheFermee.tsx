import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { GRAVITY, soleilsRestants } from "@/lib/gravity-textes";
import { ouvrirAvecGravity } from "./gravity-actions";
import { clientCartes } from "@/lib/supabase/admin";
import styles from "./ficheFermee.module.css";

/**
 * La page d'un projet que le membre ne peut pas ouvrir sans adhésion
 * (15/11, Sarah : « comme sur WFG 1 ») : la carte du projet — image et
 * tagline, jamais le titre —, la phrase habituelle et le bouton vers
 * l'adhésion. Avant : une phrase seule sur fond noir.
 */
export default async function FicheFermee({
  supabase,
  projetId,
}: {
  supabase: SupabaseClient;
  projetId: string;
}) {
  const { data: carte } = await clientCartes(supabase)
    .from("projects")
    .select("tagline, files:project_files(storage_path, kind)")
    .eq("id", projetId)
    .eq("is_public", true)
    .maybeSingle<{ tagline: string | null; files: { storage_path: string; kind: string }[] | null }>();

  // Des soleils achetés (Pack Soleils, 16/11) ouvrent le projet, même sans adhésion.
  const { data: restants } = await supabase.rpc("soleils_pack_restants");

  const chemin = (carte?.files ?? []).find((f) => f.kind === "vignette")?.storage_path;
  const { data: signe } = chemin
    ? await supabase.storage.from("project-media").createSignedUrl(chemin, 60 * 60)
    : { data: null };

  return (
    <PageShell title="Galaxies" nav="pitchotheque" connecte>
      <div className={styles.carte}>
        {signe?.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signe.signedUrl} alt="" className={styles.image} />
        )}
        {carte?.tagline && <p className={styles.tagline}>{carte.tagline}</p>}
        {(restants ?? 0) > 0 ? (
          <>
            <form action={ouvrirAvecGravity}>
              <input type="hidden" name="projet" value={projetId} />
              <button type="submit" className={formStyles.submit}>
                {GRAVITY.boutonPack}
              </button>
            </form>
            <p className={styles.message}>{soleilsRestants(restants as number)}</p>
          </>
        ) : (
          <>
            <p className={styles.message}>{GRAVITY.sansAdhesion}</p>
            <Link href="/adhesion" className={formStyles.submit}>
              Découvrir l&apos;adhésion
            </Link>
          </>
        )}
      </div>
    </PageShell>
  );
}
