-- =====================================================================
-- Équipe sous les cartes : aussi les talents pas encore inscrits
-- (19/10/2026, Sarah : « métier seulement pour l'instant »).
--
-- Les équipes de WFG 1 ont été reprises avec un e-mail, sans compte pour
-- la plupart (464 liens). Sur la carte, on montre leur métier — jamais
-- leur adresse, jamais de nom, pas de portrait. profile_id vaut null.
-- =====================================================================

create or replace function public.equipes_des_projets(p_ids uuid[])
returns table (
  project_id uuid,
  profile_id uuid,
  role       text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.project_id, pr.id, r.label_fr, pr.avatar_url
  from public.project_co_authors c
  join public.projects p on p.id = c.project_id
  left join public.profiles pr on pr.id = c.profile_id
  left join public.roles r on r.slug = c.role_slug
  where c.project_id = any (p_ids)
    and c.status = 'accepte'
    and p.is_public
    and (c.profile_id is null or (c.profile_id <> p.owner_id and pr.anonymized_at is null))
    and auth.uid() is not null
  order by c.project_id, (c.profile_id is null), r.position nulls last, c.invited_at;
$$;

grant execute on function public.equipes_des_projets(uuid[]) to authenticated;
