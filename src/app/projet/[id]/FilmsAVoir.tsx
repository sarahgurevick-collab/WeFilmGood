import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";

export type FilmAVoir = {
  id: string;
  film_id: number;
  titre: string;
  annee: number | null;
  realisateur: string | null;
  pays: string | null;
  tmdb_id: number | null;
  commentaire: string | null;
};

export async function chargerFilmsAVoir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<FilmAVoir[]> {
  const { data } = await supabase.rpc("films_a_voir_du_projet", { p_project: projectId });
  return (data ?? []) as FilmAVoir[];
}

/**
 * « Films à voir » (Sarah, 22/11) : sous les fiches de lecture, les films
 * conseillés à l'auteur. Rien n'est affiché tant qu'aucun film n'a été choisi.
 */
export default function FilmsAVoir({ films }: { films: FilmAVoir[] }) {
  if (films.length === 0) return null;
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="films-a-voir">
      <h2 id="films-a-voir">Films à voir</h2>
      <ul style={{ paddingLeft: 18 }}>
        {films.map((f) => (
          <li key={f.id} style={{ marginBottom: 8 }}>
            <strong>{f.titre}</strong>
            <span className={formStyles.hint}>
              {" "}
              {[f.annee, f.realisateur].filter(Boolean).join(" · ")}
            </span>
            {f.commentaire && <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{f.commentaire}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
