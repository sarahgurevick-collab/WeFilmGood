-- =====================================================================
-- L'ordre des projets dans la pitchothèque.
--
-- Repris de WeFilmGood 1, où il fonctionnait très bien :
--
--   1. Les projets labellisés d'abord.
--   2. Puis les autres, par tranche de remplissage de la fiche :
--      50 % et plus, puis 30 % et plus, puis le reste.
--   3. Un projet sans videopitch descend tout en bas, quel que soit son
--      remplissage — il garde seulement sa tranche entre projets sans
--      videopitch.
--
-- À l'intérieur de chaque tranche, l'ordre est tiré au sort, et change
-- chaque nuit à minuit (heure de Paris) : chaque projet a sa chance
-- d'être en haut de page, et la page reste la même toute la journée.
--
-- Le remplissage reprend les poids de src/lib/remplissage.ts :
-- tagline 20, logline 20, vignette 20, scénario 20, genre 10, format 10.
-- (Dans la base, la tagline est la colonne logline, et la logline la
-- colonne synopsis.)
--
-- « security invoker » : la fonction ne voit que ce que la personne
-- connectée a le droit de voir — les règles d'accès restent celles de
-- la table.
-- =====================================================================

create or replace function public.pitchotheque(p_limite int default 60, p_decalage int default 0)
returns table (id uuid, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with fichiers as (
    select
      f.project_id,
      bool_or(f.kind = 'vignette') as a_vignette,
      bool_or(f.kind = 'scenario') as a_scenario
    from public.project_files f
    group by f.project_id
  ),
  notes as (
    select
      p.id,
      p.status = 'labellise' as labellise,
      coalesce(btrim(p.trailer_url), '') <> '' as a_videopitch,
      (case when coalesce(btrim(p.logline), '') <> '' then 20 else 0 end
       + case when coalesce(btrim(p.synopsis), '') <> '' then 20 else 0 end
       + case when coalesce(f.a_vignette, false) then 20 else 0 end
       + case when coalesce(f.a_scenario, false) then 20 else 0 end
       + case when p.genre_slug is not null then 10 else 0 end
       + case when p.format is not null then 10 else 0 end) as remplissage
    from public.projects p
    left join fichiers f on f.project_id = p.id
    where p.is_public
  )
  select
    n.id,
    count(*) over () as total
  from notes n
  order by
    case
      when n.labellise then 0
      when n.a_videopitch then 1
      else 2
    end,
    case
      when n.labellise then 0
      when n.remplissage >= 50 then 1
      when n.remplissage >= 30 then 2
      else 3
    end,
    md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text)
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
$$;

grant execute on function public.pitchotheque(int, int) to authenticated;
