-- =====================================================================
-- Profils en attente (19/10/2026) : 445 talents des équipes de WFG 1 ont
-- maintenant un profil, avec leur seule adresse e-mail. Tant qu'il n'a ni
-- prénom ni nom, un profil n'est ni un portrait ni un lien sur la fiche
-- d'un projet (« Membre » sans nom serait un cul-de-sac) :
--   - la fiche (equipe_projet) ne le montre pas, comme avant leur création ;
--   - les cartes (equipes_des_projets) le comptent comme « pas encore
--     inscrit » : le métier seul, sans portrait.
-- Dès que Sarah complète le nom, le talent apparaît partout.
-- =====================================================================

create or replace function public.equipe_projet(p_project_id uuid)
returns table (profile_id uuid, nom text, role text, avatar_url text, est_auteur boolean)
language sql
stable
security definer
set search_path = public
as $$
  -- L'auteur, avec son premier métier déclaré.
  select pr.id,
         coalesce(nullif(btrim(pr.display_name), ''), pr.full_name),
         (select r.label_fr from public.profile_roles x
          join public.roles r on r.slug = x.role_slug
          where x.profile_id = pr.id
          order by r.position limit 1),
         pr.avatar_url,
         true
  from public.projects p
  join public.profiles pr on pr.id = p.owner_id
  where p.id = p_project_id and auth.uid() is not null
  union all
  -- Les talents qui ont accepté l'invitation, une fois leur nom connu.
  select pr.id,
         coalesce(nullif(btrim(pr.display_name), ''), pr.full_name),
         r.label_fr,
         pr.avatar_url,
         false
  from public.project_co_authors c
  join public.profiles pr on pr.id = c.profile_id
  left join public.roles r on r.slug = c.role_slug
  where c.project_id = p_project_id
    and c.status = 'accepte'
    and coalesce(nullif(btrim(pr.display_name), ''), nullif(btrim(pr.full_name), '')) is not null
    and auth.uid() is not null;
$$;

create or replace function public.equipes_des_projets(p_ids uuid[])
returns table (project_id uuid, profile_id uuid, role text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  with l as (
    select c.project_id, c.invited_at, r.label_fr, r.position, pr.id as pid, pr.avatar_url,
           coalesce(nullif(btrim(pr.display_name), ''), nullif(btrim(pr.full_name), '')) is not null as nomme
    from public.project_co_authors c
    join public.projects p on p.id = c.project_id
    left join public.profiles pr on pr.id = c.profile_id
    left join public.roles r on r.slug = c.role_slug
    where c.project_id = any (p_ids)
      and c.status = 'accepte'
      and p.is_public
      and (c.profile_id is null or (c.profile_id <> p.owner_id and pr.anonymized_at is null))
      and auth.uid() is not null
  )
  select project_id,
         case when nomme then pid end,
         label_fr,
         case when nomme then avatar_url end
  from l
  order by project_id, (not nomme), position nulls last, invited_at;
$$;

grant execute on function public.equipe_projet(uuid) to authenticated;
grant execute on function public.equipes_des_projets(uuid[]) to authenticated;
