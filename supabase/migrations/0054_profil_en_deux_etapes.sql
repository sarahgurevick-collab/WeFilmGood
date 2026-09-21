-- =====================================================================
-- Profil en deux étapes.
--
-- Étape 1, l'inscription : prénom, nom, email — rien d'autre. Étape 2,
-- une fois le compte activé : le profil se complète bloc par bloc, et
-- c'est là que la catégorie (auteur, producteur, talent) se choisit.
-- =====================================================================

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name  text;


-- ---------------------------------------------------------------------
-- Le déclencheur d'inscription lit prénom et nom, et compose full_name
-- s'il n'est pas fourni. La catégorie reste acceptée pour les anciens
-- parcours (lecteurs, comptes créés par l'administration).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_slug   text;
  reader_code text;
  code_row    public.reader_invite_codes;
  v_category  public.profile_category;
  v_first     text;
  v_last      text;
  v_full      text;
begin
  v_category := nullif(new.raw_user_meta_data ->> 'category', '')::public.profile_category;
  v_first    := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last     := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  v_full     := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(concat_ws(' ', v_first, v_last)), '')
  );

  insert into public.profiles (id, full_name, first_name, last_name, category, validation_status)
  values (
    new.id,
    v_full,
    v_first,
    v_last,
    v_category,
    (case
       when v_category in ('producteur', 'talent') then 'en_attente'
       else 'non_requise'
     end)::public.profile_validation_status
  )
  on conflict (id) do update
    set category = excluded.category,
        validation_status = excluded.validation_status;

  if new.raw_user_meta_data ? 'roles' then
    for role_slug in
      select jsonb_array_elements_text(new.raw_user_meta_data -> 'roles')
    loop
      insert into public.profile_roles (profile_id, role_slug)
      values (new.id, role_slug)
      on conflict do nothing;
    end loop;
  end if;

  reader_code := new.raw_user_meta_data ->> 'reader_code';
  if reader_code is not null then
    select * into code_row
    from public.reader_invite_codes
    where code = reader_code
      and is_active
      and (max_uses is null or use_count < max_uses)
    for update;

    if found then
      insert into public.profile_roles (profile_id, role_slug)
      values (new.id, 'lecteur')
      on conflict do nothing;

      insert into public.reader_profiles (profile_id)
      values (new.id)
      on conflict do nothing;

      insert into public.reader_invite_redemptions (code, profile_id)
      values (reader_code, new.id);

      update public.reader_invite_codes
      set use_count = use_count + 1,
          is_active = case
            when max_uses is not null and use_count + 1 >= max_uses then false
            else is_active
          end
      where code = reader_code;
    end if;
  end if;

  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- Choisir sa catégorie depuis le profil. Un producteur ou un talent
-- passe en attente de validation, sauf s'il a déjà été validé ; un
-- auteur n'a besoin d'aucune validation. Passer par une fonction évite
-- qu'un membre écrive lui-même « validee » dans son profil.
-- ---------------------------------------------------------------------
create or replace function public.choisir_categorie(p_category public.profile_category)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  update public.profiles
  set category = p_category,
      validation_status = case
        when p_category in ('producteur', 'talent')
          then (case when validation_status = 'validee' then 'validee' else 'en_attente' end)::public.profile_validation_status
        else 'non_requise'::public.profile_validation_status
      end,
      updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.choisir_categorie(public.profile_category) to authenticated;
