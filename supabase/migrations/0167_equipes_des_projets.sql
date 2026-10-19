-- =====================================================================
-- L'équipe déjà en place, sous les cartes de projet (19/10/2026, Sarah).
--
-- Un producteur s'intéresse aux projets où des talents sont déjà
-- rattachés : les cartes des Galaxies et le profil d'un auteur doivent
-- le montrer avant qu'il dépense un crédit. Comme equipe_projet (0053),
-- mais pour plusieurs projets d'un coup, et sans l'auteur (la carte est
-- sous son nom ou sous son projet). Pas d'adresse e-mail, jamais.
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
  join public.profiles pr on pr.id = c.profile_id
  left join public.roles r on r.slug = c.role_slug
  where c.project_id = any (p_ids)
    and c.status = 'accepte'
    and c.profile_id is not null
    and c.profile_id <> p.owner_id
    and p.is_public
    and pr.anonymized_at is null
    and auth.uid() is not null
  order by c.project_id, r.position nulls last, c.invited_at;
$$;

grant execute on function public.equipes_des_projets(uuid[]) to authenticated;
