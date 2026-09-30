import { lireFiltres } from "@/app/pitchotheque/filtres";
import { rechercherPersonnages, rechercherProjets, rechercherTalents } from "@/app/pitchotheque/actions";
import { createClient } from "@/lib/supabase/server";

/**
 * La recherche de la Carte des étoiles : projets, talents et personnages
 * en un seul appel, calculés en parallèle (29/09).
 *
 * Une route plutôt que des actions serveur : Next.js passe les actions
 * l'une après l'autre, si bien que chaque lettre tapée (« a », « ar »,
 * « arc »…) attendait son tour et que les résultats défilaient par paliers
 * pendant une demi-minute. Ici, le navigateur annule la recherche
 * précédente dès qu'une nouvelle lettre arrive.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erreur: "connexion requise" }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const q = (params.q ?? "").trim();
  if (!q) return Response.json({ projets: [], total: 0, talents: [], totalTalents: 0, personnages: [], totalPersonnages: 0 });

  const [p, t, c] = await Promise.all([
    rechercherProjets(q, lireFiltres(params)),
    rechercherTalents(q),
    rechercherPersonnages(q),
  ]);
  // Rien nulle part : noté dans le journal des recherches sans résultat.
  if (p.total === 0 && t.total === 0 && c.total === 0) {
    await supabase.rpc("noter_recherche_sans_resultat", { q });
  }
  return Response.json({
    projets: p.projets,
    total: p.total,
    parLeSens: p.parLeSens ?? [],
    talents: t.talents,
    totalTalents: t.total,
    personnages: c.personnages,
    totalPersonnages: c.total,
  });
}
