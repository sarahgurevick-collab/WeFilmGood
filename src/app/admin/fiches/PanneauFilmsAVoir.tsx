import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { chargerFilmsAVoir } from "@/app/projet/[id]/FilmsAVoir";
import FilmsProchesEnDessous from "./FilmsProchesEnDessous";
import { ajouterFilmAVoir, commenterFilmAVoir, retirerFilmAVoir } from "./films-a-voir-actions";

/**
 * Réservé à l'administration (Sarah, 22/11) : les mots-clés du projet, les
 * films que les lecteurs ont cités dans leurs fiches de WFG 1, et la liste
 * « Films à voir » que l'auteur verra sous ses fiches (seulement si elle
 * n'est pas vide).
 */
export default async function PanneauFilmsAVoir({ projectId, retour }: { projectId: string; retour: string }) {
  const supabase = await createClient();
  const [films, { data: mk }, { data: cites }] = await Promise.all([
    chargerFilmsAVoir(supabase, projectId),
    supabase.from("project_keywords").select("keywords(label_fr)").eq("project_id", projectId),
    supabase.from("films_cites").select("tmdb_id, extrait").eq("project_id", projectId),
  ]);
  const mots = ((mk ?? []) as unknown as { keywords: { label_fr: string } | null }[])
    .map((m) => m.keywords?.label_fr ?? "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr"));

  // Les films cités par les lecteurs : un par film de la base, hors ceux déjà choisis.
  const ids = (cites ?? []).map((c) => c.tmdb_id);
  const { data: fc } = ids.length
    ? await supabase
        .from("films_cnc")
        .select("id, titre, titre_affiche, annee_sortie, annee_agrement, realisateur, tmdb_id")
        .in("tmdb_id", ids)
    : { data: [] };
  const dejaChoisis = new Set(films.map((f) => f.film_id));
  const citesFilms = new Map<number, { id: number; titre: string; annee: number | null; realisateur: string | null; extrait: string | null }>();
  for (const f of fc ?? []) {
    if (f.tmdb_id == null || citesFilms.has(f.tmdb_id) || dejaChoisis.has(f.id)) continue;
    citesFilms.set(f.tmdb_id, {
      id: f.id,
      titre: f.titre_affiche ?? f.titre,
      annee: f.annee_sortie ?? f.annee_agrement,
      realisateur: f.realisateur,
      extrait: (cites ?? []).find((c) => c.tmdb_id === f.tmdb_id)?.extrait ?? null,
    });
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Films à voir</h2>
      <p className={formStyles.hint}>
        Réservé à l&apos;administration. L&apos;auteur voit « Films à voir » sous ses fiches seulement
        si vous y avez mis un film.
      </p>

      <p style={{ margin: "12px 0 4px" }}>
        <strong>Mots-clés du projet :</strong>{" "}
        {mots.length ? mots.join(", ") : "aucun"}
      </p>
      <div style={{ margin: "0 0 12px" }}>
        <FilmsProchesEnDessous projectId={projectId} />
      </div>

      {films.length > 0 && (
        <ul style={{ paddingLeft: 18 }}>
          {films.map((f) => (
            <li key={f.id} style={{ marginBottom: 12 }}>
              <strong>{f.titre}</strong>{" "}
              <span className={formStyles.hint}>{[f.annee, f.realisateur].filter(Boolean).join(" · ")}</span>
              <form action={commenterFilmAVoir} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="retour" value={retour} />
                <input
                  name="commentaire"
                  defaultValue={f.commentaire ?? ""}
                  placeholder="Pourquoi ce film (facultatif)"
                  style={{ flex: "1 1 320px" }}
                />
                <button type="submit" className={formStyles.submit}>Enregistrer</button>
                <button type="submit" formAction={retirerFilmAVoir} className={formStyles.submit}>Retirer</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {citesFilms.size > 0 && (
        <>
          <p style={{ margin: "16px 0 4px" }}>
            <strong>Films cités par les lecteurs dans leurs fiches :</strong>
          </p>
          <ul style={{ paddingLeft: 18 }}>
            {[...citesFilms.values()].map((f) => (
              <li key={f.id} style={{ marginBottom: 6 }}>
                <strong>{f.titre}</strong>{" "}
                <span className={formStyles.hint}>{[f.annee, f.realisateur].filter(Boolean).join(" · ")}</span>
                {f.extrait && <span style={{ display: "block", fontSize: 13 }}>« {f.extrait} »</span>}
                <form action={ajouterFilmAVoir}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="film_id" value={f.id} />
                  <input type="hidden" name="retour" value={retour} />
                  <button type="submit" className={formStyles.submit}>Ajouter aux films à voir</button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
