-- Bandeau « Sélection MdS/WFG » (24/10/2026, Sarah). « Film primé » veut
-- dire : le film a été réalisé et primé. Une sélection de la Maison des
-- Scénaristes / WeFilmGood n'est pas ça : elle a son propre bandeau, posé
-- AUTOMATIQUEMENT sur tout projet qui porte une sélection (Cannes, Clermont,
-- PCDV, SerieMania, Satis, Valence, FEMI, Maison bleue, Digital Lab Africa,
-- Menu, et le partenariat Cinephilia — pas Muse Awards).
-- Un seul bandeau par projet : Tourné, Signé, Script primé et Film primé
-- passent devant ; la sélection ne s'affiche que s'il n'y a rien d'autre.

alter table public.projects drop constraint if exists projects_bandeau_check;
alter table public.projects add constraint projects_bandeau_check
  check (bandeau in ('signe', 'tourne', 'script_prime', 'film_prime', 'selection_mds'));

create or replace function public.a_une_selection_mds(p_project_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.project_selections s
    where s.project_id = p_project_id and s.libelle <> 'Muse Awards'
  );
$$;

-- Après un ajout ou un retrait de sélection : le bandeau automatique suit,
-- sans toucher un bandeau posé à la main.
create or replace function public.suivre_bandeau_selection()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.project_id, old.project_id);
begin
  update public.projects p
     set bandeau = case when public.a_une_selection_mds(pid) then 'selection_mds' else null end
   where p.id = pid and (p.bandeau is null or p.bandeau = 'selection_mds');
  return null;
end;
$$;
drop trigger if exists suivre_bandeau_selection on public.project_selections;
create trigger suivre_bandeau_selection
  after insert or delete on public.project_selections
  for each row execute function public.suivre_bandeau_selection();

-- Quand l'administration retire un bandeau posé à la main (« aucun »),
-- la sélection reprend sa place.
create or replace function public.bandeau_selection_par_defaut()
returns trigger language plpgsql as $$
begin
  if new.bandeau is null and public.a_une_selection_mds(new.id) then
    new.bandeau := 'selection_mds';
  end if;
  return new;
end;
$$;
drop trigger if exists bandeau_selection_par_defaut on public.projects;
create trigger bandeau_selection_par_defaut
  before insert or update of bandeau on public.projects
  for each row execute function public.bandeau_selection_par_defaut();

-- Les projets déjà sélectionnés : 205 sans autre bandeau.
update public.projects p set bandeau = 'selection_mds'
 where p.bandeau is null and public.a_une_selection_mds(p.id);

CREATE OR REPLACE FUNCTION public.pitchotheque(p_limite integer DEFAULT 60, p_decalage integer DEFAULT 0, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text, p_equipe text DEFAULT NULL::text, p_selection text DEFAULT NULL::text, p_comedien text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
#variable_conflict use_column
begin
  return query
with fichiers as (
    select
      f.project_id,
      bool_or(f.kind = 'vignette') as a_vignette,
      bool_or(f.kind = 'scenario') as a_scenario
    from public.project_files f
    group by f.project_id
  ),
  personnages as (
    select c.project_id, count(*) as nombre
    from public.characters c
    group by c.project_id
  ),
  notes as (
    select
      p.id,
      p.status = 'labellise' as labellise,
      -- Le bandeau Sélection (automatique, 24/10) ne change pas la place
      -- du projet dans les Galaxies : seuls signé, tourné, primé le font.
      (p.bandeau is not null and p.bandeau <> 'selection_mds') as a_bandeau,
      (p.a_videopitch
       or coalesce(btrim(p.trailer_url), '') <> '') as a_videopitch,
      round(
        (case when coalesce(btrim(p.logline), '') <> '' then 20 else 0 end
         + case when coalesce(btrim(p.synopsis), '') <> '' then 20 else 0 end
         + case when coalesce(f.a_vignette, false) then 20 else 0 end
         + case when coalesce(f.a_scenario, false) then 20 else 0 end
         + case when p.genre_slug is not null then 10 else 0 end
         + case when p.format is not null then 10 else 0 end
         + case when coalesce(pe.nombre, 0) > 0 then 10 else 0 end) * 100.0 / 110
      ) as remplissage
    from public.projects p
    left join fichiers f on f.project_id = p.id
    left join personnages pe on pe.project_id = p.id
    where p.is_public
       and auth.uid() is not null
      and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
      and (p_format is null or p.format::text = p_format)
      and (p_genre is null or p.genre_slug = p_genre)
      and (p_audience is null or p.target_audience = p_audience)
      and (p_budget is null or p.budget_range = p_budget)
      and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
      and (p_selection is null or exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = p_selection))
      and (p_comedien is null or exists (select 1 from public.project_actors a where a.project_id = p.id and a.libelle = p_comedien))
      and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
           and exists (select 1 from public.project_co_authors ca
                      where ca.project_id = p.id and ca.status = 'accepte'
                        and (ca.role_slug = p_equipe
                             or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  )
  ,
  classes as (
    select
      n.id,
      n.a_bandeau,
      case
        when n.a_bandeau or n.labellise then 0
        when n.a_videopitch then 1
        else 2
      end as famille,
      case
        when n.a_bandeau or n.labellise then 0
        when n.remplissage >= 50 then 1
        when n.remplissage >= 30 then 2
        else 3
      end as tranche,
      md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text) as tirage
    from notes n
  ),
  -- Chaque nuit, trente projets à bandeau tirés au sort sont semés dans
  -- les dix premières pages, trois par page (au lieu de deux : 03/10/2026) ; les autres sont mêlés aux
  -- labellisés des pages suivantes (27/09/2026). Tous ont été labellisés.
  bandeaux as (
    select c.id, row_number() over (order by c.tirage) - 1 as r
    from classes c
    where c.a_bandeau
  ),
  places as (
    select
      c.*,
      -- place visée (page r/3, un en haut, un au milieu, un en bas), moins les projets
      -- déjà semés avant lui, puisqu'ils ne comptent pas dans « rang ».
      case when b.r < 30 then (b.r / 3) * 50 + (b.r % 3) * 17 + 8 - b.r + 0.5 end as place_semee,
      row_number() over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 30, false)
        order by c.tirage
      ) as rang,
      count(*) over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 30, false)
      ) as effectif,
      count(*) filter (where not c.a_bandeau) over (partition by c.famille, c.tranche) as labellises
    from classes c
    left join bandeaux b on b.id = c.id
  )
  select
    p.id,
    count(*) over () as total
  from places p
  order by p.famille, p.tranche,
    -- les projets à bandeau non tirés ce jour-là passent après les
    -- labellisés : les dix premières pages en gardent trois, pas plus.
    -- les projets à bandeau non tirés ce jour-là sont mêlés aux autres
    -- labellisés, mais au-delà de la dixième page, qui garde ses trois.
    case
      when p.place_semee is not null then p.place_semee
      when p.a_bandeau then 470 + (p.rang::numeric / (p.effectif + 1)) * greatest(p.labellises - 470, 1)
      else p.rang
    end,
    p.tirage
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
end;
$function$;
