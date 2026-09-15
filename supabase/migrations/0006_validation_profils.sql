-- =====================================================================
-- Validation admin des profils Producteur/Talent.
-- Le profil Auteur n'a besoin d'aucune validation (pas de pré-requis).
-- =====================================================================

do $$ begin
  create type public.profile_validation_status as enum
    ('non_requise', 'en_attente', 'validee', 'refusee');
exception when duplicate_object then null;
end $$;

alter table public.profiles add column if not exists
  validation_status public.profile_validation_status not null default 'non_requise';
alter table public.profiles add column if not exists validated_at timestamptz;
alter table public.profiles add column if not exists validated_by uuid references public.profiles(id);


-- ---------------------------------------------------------------------
-- Extension du déclencheur d'inscription : enregistre la catégorie
-- (auteur/producteur/talent) transmise dans les métadonnées utilisateur
-- et déclenche la validation admin pour les profils Producteur/Talent.
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
  category    public.profile_category;
begin
  category := nullif(new.raw_user_meta_data ->> 'category', '')::public.profile_category;

  insert into public.profiles (id, full_name, category, validation_status)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    category,
    case when category in ('producteur', 'talent') then 'en_attente' else 'non_requise' end
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
-- Validation/refus d'un profil Producteur/Talent par un admin.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_profile_validation(
  p_profile_id uuid,
  p_status public.profile_validation_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  update public.profiles
  set validation_status = p_status,
      validated_at = now(),
      validated_by = auth.uid()
  where id = p_profile_id;
end;
$$;

grant execute on function public.admin_set_profile_validation(uuid, public.profile_validation_status) to authenticated;
