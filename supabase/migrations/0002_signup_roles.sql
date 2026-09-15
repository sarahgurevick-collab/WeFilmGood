-- Étend le déclencheur d'inscription : en plus de créer le profil,
-- il enregistre les métiers cochés dans le formulaire (passés dans
-- les métadonnées utilisateur sous la clé "roles", un tableau de slugs).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_slug text;
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  if new.raw_user_meta_data ? 'roles' then
    for role_slug in
      select jsonb_array_elements_text(new.raw_user_meta_data -> 'roles')
    loop
      insert into public.profile_roles (profile_id, role_slug)
      values (new.id, role_slug)
      on conflict do nothing;
    end loop;
  end if;

  return new;
end;
$$;
