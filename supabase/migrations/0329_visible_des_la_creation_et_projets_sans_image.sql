-- =====================================================================
-- Sarah, 24/11/2026 :
--   « un projet est visible dès qu'il est créé. On le trouve en tapant
--     son titre. Par contre s'il n'a pas de videopitch, il sera à la fin.
--     S'il n'a pas d'image d'illustration, il n'est pas visible. »
--
-- Les deux dernières règles existent déjà (fonction pitchotheque : sans
-- videopitch = dernière famille ; sans vignette = absent, 0076). Il
-- manquait la première : un projet déposé depuis le site restait
-- invisible des membres (is_public faux par défaut) et rien ne le
-- rendait visible. « My Project » de Nicolas en a fait les frais.
--
-- Les fiches masquées par l'administration (0155) ne changent pas.
--
-- Et la liste des projets sans image, pour la page d'administration
-- « Projets sans image » : toujours à jour, à la place d'un export.
-- =====================================================================

alter table public.projects alter column is_public set default true;

create or replace function public.projets_sans_image()
returns table (
  id uuid,
  title text,
  format text,
  bandeau text,
  a_videopitch boolean,
  created_at timestamptz,
  owner_id uuid,
  auteur text,
  email text,
  selections text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    p.title,
    p.format::text,
    p.bandeau,
    (p.a_videopitch or coalesce(btrim(p.trailer_url), '') <> ''),
    p.created_at,
    p.owner_id,
    pr.full_name,
    u.email::text,
    (select string_agg(s.libelle, ', ' order by s.libelle) from public.project_selections s where s.project_id = p.id)
  from public.projects p
  left join public.profiles pr on pr.id = p.owner_id
  left join auth.users u on u.id = p.owner_id
  where public.is_admin()
    and p.is_public
    and not exists (select 1 from public.project_files f where f.project_id = p.id and f.kind = 'vignette')
  order by
    -- d'abord les sélectionnés et les projets à bandeau (priorité de Sarah, 01/11),
    -- puis ceux qui ont un videopitch, puis les plus récents.
    (exists (select 1 from public.project_selections s where s.project_id = p.id) or p.bandeau is not null) desc,
    (p.a_videopitch or coalesce(btrim(p.trailer_url), '') <> '') desc,
    p.created_at desc;
$$;

revoke all on function public.projets_sans_image() from public, anon;
grant execute on function public.projets_sans_image() to authenticated;
