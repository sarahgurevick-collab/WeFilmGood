-- Changer la catégorie d'un membre depuis l'écran des membres (10/10/2026,
-- Sarah). Sur WFG 1, un talent inscrit dans la mauvaise catégorie (une
-- réalisatrice en producteur) devait abandonner son profil et tout
-- refaire. Ici l'administration change la catégorie, le reste du profil
-- reste. La catégorie est ce qui est vérifié pour s'assurer que le talent
-- est professionnel : mêmes règles de validation que lorsqu'un membre la
-- choisit lui-même (choisir_categorie) — un producteur ou un talent déjà
-- validé le reste, sinon il passe en attente ; un auteur ou un cinéphile
-- n'a pas besoin de validation.
create or replace function public.admin_changer_categorie(p_profile uuid, p_category public.profile_category)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administration';
  end if;
  update public.profiles
  set category = p_category,
      validation_status = case
        when p_category in ('producteur', 'talent')
          then (case when validation_status = 'validee' then 'validee' else 'en_attente' end)::public.profile_validation_status
        else 'non_requise'::public.profile_validation_status
      end,
      updated_at = now()
  where id = p_profile;
end;
$$;
grant execute on function public.admin_changer_categorie(uuid, public.profile_category) to authenticated;
