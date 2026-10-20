-- =====================================================================
-- Inviter un talent sur un projet (20/10/2026).
--
-- Le porteur saisit l'adresse e-mail et le métier ; le talent reçoit un
-- lien magique, puis accepte ou refuse sur une page à lui. La ligne reste
-- « invite » (jamais montrée aux autres membres) jusqu'à sa réponse.
--
-- Deux fonctions pour que l'invité ne voie QUE sa propre invitation, même
-- si le projet n'est pas encore public, et ne puisse rien changer d'autre
-- que sa réponse (la règle de mise à jour existante laissait tout modifier).
-- =====================================================================

create or replace function public.mon_invitation(p_id uuid)
returns table (
  project_id uuid,
  titre      text,
  porteur    text,
  metier     text,
  statut     text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.project_id, p.title,
         coalesce(nullif(btrim(o.display_name), ''), nullif(btrim(o.full_name), ''), 'Un auteur'),
         r.label_fr,
         c.status
  from public.project_co_authors c
  join public.projects p on p.id = c.project_id
  join public.profiles o on o.id = p.owner_id
  left join public.roles r on r.slug = c.role_slug
  where c.id = p_id and c.profile_id = auth.uid();
$$;

create or replace function public.repondre_invitation(p_id uuid, p_accepte boolean)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_projet uuid;
begin
  update public.project_co_authors
     set status = case when p_accepte then 'accepte' else 'refuse' end,
         responded_at = now()
   where id = p_id
     and profile_id = auth.uid()
     and status = 'invite'
  returning project_id into v_projet;
  if v_projet is null then
    return null;
  end if;
  return v_projet::text;
end;
$$;

grant execute on function public.mon_invitation(uuid) to authenticated;
grant execute on function public.repondre_invitation(uuid, boolean) to authenticated;
