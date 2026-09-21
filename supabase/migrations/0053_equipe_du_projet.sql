-- =====================================================================
-- « Mon équipe » : les talents d'un projet, sur sa fiche.
--
-- Comme sur WFG 1, tout membre voit qui porte un projet : l'auteur, et
-- les talents qui ont accepté d'y être rattachés. Seulement leur nom,
-- leur rôle, leur photo et le lien vers leur profil — jamais l'adresse
-- e-mail qui a servi à les inviter. Les invitations en attente restent
-- réservées à l'auteur et à l'administration (table project_co_authors).
-- =====================================================================

create or replace function public.equipe_projet(p_project_id uuid)
returns table (
  profile_id uuid,
  nom        text,
  role       text,
  avatar_url text,
  est_auteur boolean
)
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
  -- Les talents qui ont accepté l'invitation.
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
    and auth.uid() is not null;
$$;

grant execute on function public.equipe_projet(uuid) to authenticated;
