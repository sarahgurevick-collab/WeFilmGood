-- « “cabaret” présent dans la fiche de lecture » (02/11/2026, Sarah). Sur
-- la carte des Galaxies, le mot-clé qui fait sortir un projet est en rouge.
-- Quand ce mot n'est écrit nulle part sur la fiche projet (titre, tagline,
-- logline, résumé, personnages, comédiens) mais l'est dans une fiche de
-- lecture, invisible des producteurs, la carte le dit. Un mot-clé IA sur
-- cinq est dans ce cas (mesure du 02/11 sur 1 500 mots-clés).
-- La fonction ne révèle qu'un oui par couple (projet, mot) ; les fiches de
-- lecture restent confidentielles.
create or replace function public.mots_presents_dans_la_fiche_de_lecture(p_projets uuid[], p_mots text[])
returns table(project_id uuid, mot text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with couples as (
    select unnest(p_projets) as project_id, unnest(p_mots) as mot
  )
  select c.project_id, c.mot
  from couples c
  join public.projects p on p.id = c.project_id
  cross join lateral (select '%' || replace(replace(replace(public.sans_accent(c.mot), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif) m
  where auth.uid() is not null
    and nullif(btrim(c.mot), '') is not null
    -- Nulle part sur la fiche projet…
    and not (public.sans_accent(concat_ws(' ', p.title, p.tagline, p.logline, p.synopsis)) ilike m.motif)
    and not exists (select 1 from public.characters ch where ch.project_id = p.id
                    and public.sans_accent(concat_ws(' ', ch.name, ch.biography, ch.actor_name)) ilike m.motif)
    and not exists (select 1 from public.project_actors a where a.project_id = p.id
                    and public.sans_accent(a.libelle) ilike m.motif)
    -- … mais dans une fiche de lecture (WFG 1 ou WFG 2).
    and (exists (select 1 from public.legacy_reading_reports r where r.project_id = p.id
                 and public.sans_accent(concat_ws(' ', r.content, r.wfg_review, r.marks)) ilike m.motif)
         or exists (select 1 from public.reading_reports r where r.project_id = p.id
                    and public.sans_accent(concat_ws(' ', r.content, r.label_motivation)) ilike m.motif));
$$;

revoke all on function public.mots_presents_dans_la_fiche_de_lecture(uuid[], text[]) from public, anon;
grant execute on function public.mots_presents_dans_la_fiche_de_lecture(uuid[], text[]) to authenticated, service_role;
