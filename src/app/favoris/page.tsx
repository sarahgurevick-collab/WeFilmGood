import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoComplet from "@/components/LogoComplet";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "@/app/galaxies/projets.module.css";
import gravityStyles from "@/app/projet/[id]/gravity.module.css";
import { basculerFavori } from "@/app/projet/[id]/gravity-actions";
import { GRAVITY } from "@/lib/gravity-textes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mes favoris — WeFilmGood" };

type Projet = {
  id: string;
  title: string;
  tagline: string | null;
  status: string;
  genre: { label_fr: string } | null;
  files: { storage_path: string; kind: string }[];
};

/**
 * Les favoris (12/11/2026) : les projets ouverts avec un Gravity — ils le
 * restent — et ceux mis de côté avec le cœur, pour les ouvrir un autre jour.
 * (« Enregistre le projet dans tes favoris et contacte les Talents le moment
 * venu », page d'adhésion.)
 */
export default async function FavorisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/favoris");

  const [{ data: ouvertures }, { data: favoris }] = await Promise.all([
    supabase
      .from("gravity_ouvertures")
      .select("project_id, ouvert_le")
      .eq("profile_id", user.id)
      .order("ouvert_le", { ascending: false })
      .returns<{ project_id: string; ouvert_le: string }[]>(),
    supabase
      .from("favoris")
      .select("project_id, ajoute_le")
      .eq("profile_id", user.id)
      .order("ajoute_le", { ascending: false })
      .returns<{ project_id: string; ajoute_le: string }[]>(),
  ]);
  const idsOuverts = (ouvertures ?? []).map((o) => o.project_id);
  // Un projet mis de côté puis ouvert n'apparaît plus que parmi les ouverts.
  const idsDeCote = (favoris ?? []).map((f) => f.project_id).filter((id) => !idsOuverts.includes(id));
  const ids = [...idsOuverts, ...idsDeCote];

  const { data: projets } = ids.length
    ? await supabase
        .from("projects")
        .select("id, title, tagline, status, genre:genres(label_fr), files:project_files(storage_path, kind)")
        .in("id", ids)
        .returns<Projet[]>()
    : { data: [] as Projet[] };
  const parId = new Map((projets ?? []).map((p) => [p.id, p]));
  const chemins = (projets ?? [])
    .map((p) => (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path)
    .filter((c): c is string => Boolean(c));
  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };
  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  const dateOuverture = new Map((ouvertures ?? []).map((o) => [o.project_id, o.ouvert_le]));

  const carte = (id: string, deCote: boolean) => {
    const p = parId.get(id);
    if (!p) return null;
    const chemin = (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path;
    const vignette = chemin ? (urlDe.get(chemin) ?? null) : null;
    const le = dateOuverture.get(id);
    return (
      <li key={id}>
        <Link href={`/projet/${p.id}`} className={styles.carte}>
          <div className={styles.vignette}>
            {vignette ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vignette} alt="" loading="lazy" />
            ) : (
              <span className={styles.sansImage}>Sans vignette</span>
            )}
          </div>
          <div className={styles.legende}>
            <strong>
              {p.title}
              {p.status === "labellise" && (
                <span className={styles.label} title="Projet labellisé WeFilmGood">
                  <LogoComplet hauteur={22} />
                </span>
              )}
            </strong>
            {p.genre?.label_fr && <span className={styles.genre}>{p.genre.label_fr}</span>}
            {p.tagline && <p className={styles.logline}>{p.tagline}</p>}
          </div>
        </Link>
        {le && (
          <p className={formStyles.hint}>
            {GRAVITY.ouvertLe}{" "}
            {new Date(le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
          </p>
        )}
        {deCote && (
          <form action={basculerFavori}>
            <input type="hidden" name="projet" value={p.id} />
            <input type="hidden" name="retour" value="favoris" />
            <button type="submit" className={gravityStyles.coeur}>
              {GRAVITY.favoris.retirer}
            </button>
          </form>
        )}
      </li>
    );
  };

  return (
    <PageShell title={GRAVITY.favoris.titre} connecte nav="favoris">
      <h2>{GRAVITY.favoris.ouverts}</h2>
      {idsOuverts.length === 0 ? (
        <p className={formStyles.hint}>{GRAVITY.favoris.aucunOuvert}</p>
      ) : (
        <ul className={styles.grille}>{idsOuverts.map((id) => carte(id, false))}</ul>
      )}
      <h2>{GRAVITY.favoris.deCote}</h2>
      {idsDeCote.length === 0 ? (
        <p className={formStyles.hint}>{GRAVITY.favoris.aucunDeCote}</p>
      ) : (
        <ul className={styles.grille}>{idsDeCote.map((id) => carte(id, true))}</ul>
      )}
    </PageShell>
  );
}
