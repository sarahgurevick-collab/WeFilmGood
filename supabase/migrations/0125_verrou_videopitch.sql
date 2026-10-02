-- Un vrai verrou sur les videopitchs (02/10/2026, décision de Sarah).
--
-- Jusqu'ici, les identifiants Vimeo étaient deux colonnes de « projects »,
-- lisibles par tout membre connecté : la fiche projet cachait le
-- videopitch aux non-adhérents, mais un membre technique pouvait encore
-- le retrouver. Ils passent dans une table à part, « project_videopitchs »,
-- que la base ne rend qu'à : l'auteur, son équipe (invitation acceptée),
-- l'administration, et les adhérents — dans la limite des métiers choisis
-- par l'auteur (« Qui peut voir votre videopitch », 0092-0093).
--
-- « projects.a_videopitch » dit seulement s'il y en a un : c'est ce dont
-- le classement de la pitchothèque a besoin. Il est tenu à jour tout seul.
--
-- ATTENTION pour la réimportation de WFG 1 : écrire les videopitchs dans
-- « project_videopitchs », plus dans « projects ».

create table if not exists public.project_videopitchs (
  project_id uuid primary key references public.projects(id) on delete cascade,
  videopitch_fr text,
  videopitch_en text
);

insert into public.project_videopitchs (project_id, videopitch_fr, videopitch_en)
select id, nullif(btrim(videopitch_fr), ''), nullif(btrim(videopitch_en), '')
from public.projects
where coalesce(btrim(videopitch_fr), '') <> '' or coalesce(btrim(videopitch_en), '') <> ''
on conflict (project_id) do nothing;

alter table public.projects add column if not exists a_videopitch boolean not null default false;
update public.projects p set a_videopitch = true
 where exists (select 1 from public.project_videopitchs v where v.project_id = p.id);

create or replace function public.tenir_a_videopitch() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'DELETE' then
    update public.projects set a_videopitch = false where id = old.project_id;
    return old;
  end if;
  update public.projects
     set a_videopitch = (new.videopitch_fr is not null or new.videopitch_en is not null)
   where id = new.project_id;
  return new;
end $$;

drop trigger if exists tenir_a_videopitch on public.project_videopitchs;
create trigger tenir_a_videopitch after insert or update or delete on public.project_videopitchs
  for each row execute function public.tenir_a_videopitch();

create or replace function public.peut_voir_videopitch(p_project_id uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and auth.uid() is not null
      and (
        p.owner_id = auth.uid()
        or public.is_admin()
        or exists (select 1 from public.project_co_authors c
                   where c.project_id = p.id and c.profile_id = auth.uid() and c.status = 'accepte')
        or (p.is_public
            and exists (select 1 from public.memberships m
                        where m.profile_id = auth.uid() and m.status = 'active'
                          and (m.expires_at is null or m.expires_at > now()))
            and public.projet_visible_pour_moi(p.owner_id, p.visible_pour))
      )
  );
$$;

alter table public.project_videopitchs enable row level security;

drop policy if exists "videopitch : auteur, équipe, admin et adhérents" on public.project_videopitchs;
create policy "videopitch : auteur, équipe, admin et adhérents" on public.project_videopitchs
  for select using (public.peut_voir_videopitch(project_id));

drop policy if exists "videopitch : l'admin écrit" on public.project_videopitchs;
create policy "videopitch : l'admin écrit" on public.project_videopitchs
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.project_videopitchs from anon, public;
grant select, insert, update, delete on public.project_videopitchs to authenticated;
grant all on public.project_videopitchs to service_role;

-- Le classement de la pitchothèque lit désormais « a_videopitch ».
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
      p.bandeau is not null as a_bandeau,
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
  -- Chaque nuit, vingt projets à bandeau tirés au sort sont semés dans
  -- les dix premières pages, deux par page ; les autres sont mêlés aux
  -- labellisés des pages suivantes (27/09/2026). Tous ont été labellisés.
  bandeaux as (
    select c.id, row_number() over (order by c.tirage) - 1 as r
    from classes c
    where c.a_bandeau
  ),
  places as (
    select
      c.*,
      -- place visée (page r/2, un en haut, un au milieu), moins les projets
      -- déjà semés avant lui, puisqu'ils ne comptent pas dans « rang ».
      case when b.r < 20 then (b.r / 2) * 50 + (b.r % 2) * 25 + 12 - b.r + 0.5 end as place_semee,
      row_number() over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 20, false)
        order by c.tirage
      ) as rang,
      count(*) over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 20, false)
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
    -- labellisés : les dix premières pages en gardent deux, pas plus.
    -- les projets à bandeau non tirés ce jour-là sont mêlés aux autres
    -- labellisés, mais au-delà de la dixième page, qui garde ses deux.
    case
      when p.place_semee is not null then p.place_semee
      when p.a_bandeau then 480 + (p.rang::numeric / (p.effectif + 1)) * greatest(p.labellises - 480, 1)
      else p.rang
    end,
    p.tirage
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
end;
$function$;


-- Les identifiants quittent « projects » : c'est ce qui ferme le verrou.
alter table public.projects drop column videopitch_fr, drop column videopitch_en;
