-- La fiche du match s'ouvre à l'adhérent sans soleil (Sarah, 23/11/2026 :
-- « Sans soleil pour l'adhérent ») : comme pour le CinéCrush de la semaine
-- (0280), il voit les noms et les photos de l'équipe, et l'enveloppe du
-- porteur s'ouvre (un seul message tant qu'il n'a pas répondu, 0316).
-- Vaut tant que ce projet est le match d'un de ses projets.
create or replace function public.match_ouvert_pour_moi(p_project_id uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null
     and public.a_une_adhesion_active(auth.uid())
     and exists (select 1 from public.projets_matchs pm
                   join public.projects mien on mien.id = pm.project_id
                  where mien.owner_id = auth.uid() and pm.match_id = p_project_id);
$$;
revoke all on function public.match_ouvert_pour_moi(uuid) from public, anon;
grant execute on function public.match_ouvert_pour_moi(uuid) to authenticated;

-- L'équipe : les noms aussi pour l'adhérent, sur la fiche de son match.
CREATE OR REPLACE FUNCTION public.equipe_projet(p_project_id uuid)
 RETURNS TABLE(profile_id uuid, nom text, role text, avatar_url text, est_auteur boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with droit as (
    select auth.uid() is not null and (
      is_admin()
      or exists (select 1 from public.gravity_ouvertures o where o.profile_id = auth.uid() and o.project_id = p_project_id)
      or exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
      or exists (select 1 from public.project_co_authors c
                 where c.project_id = p_project_id and c.profile_id = auth.uid() and c.status = 'accepte')
      or public.cinecrush_ouvert_pour_moi(p_project_id)
      or public.match_ouvert_pour_moi(p_project_id)
    ) as voit_les_noms
  )
  select pr.id,
         case when (select voit_les_noms from droit) or pr.id = auth.uid()
              then coalesce(nullif(btrim(pr.display_name), ''), pr.full_name) end,
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
  select pr.id,
         case when (select voit_les_noms from droit) or pr.id = auth.uid()
              then coalesce(nullif(btrim(pr.display_name), ''), pr.full_name) end,
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
$function$;

notify pgrst, 'reload schema';
