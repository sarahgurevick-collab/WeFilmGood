-- =====================================================================
-- Correction : conversions explicites vers les types énumérés.
--
-- Un CASE dont toutes les branches sont des littéraux est résolu par
-- PostgreSQL en type text, et text ne se convertit pas implicitement vers
-- un enum. Les deux déclencheurs ci-dessous échouaient donc à l'exécution :
--   - handle_new_user      : toute inscription échouait
--     (« Database error saving new user »)
--   - apply_reading_report_validation : la validation admin d'une fiche
--     n'arrivait jamais à labelliser le projet
--
-- La variable de catégorie est par ailleurs préfixée v_ pour ne plus
-- porter le même nom que la colonne profiles.category.
-- =====================================================================

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
begin
  v_category := nullif(new.raw_user_meta_data ->> 'category', '')::public.profile_category;

  insert into public.profiles (id, full_name, category, validation_status)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
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


create or replace function public.apply_reading_report_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'validee_admin' and old.status is distinct from 'validee_admin' then
    update public.projects
    set status = (case
                    when new.labellise then 'labellise'
                    else 'lecture_terminee_non_labellise'
                  end)::public.project_status
    where id = new.project_id;

    update public.reading_assignments
    set status = 'rendue', responded_at = coalesce(responded_at, now())
    where id = new.assignment_id;

    update public.reader_profiles
    set availability_status = 'vert', updated_at = now()
    where profile_id = new.reader_id
      and not exists (
        select 1 from public.reading_assignments a
        where a.reader_id = new.reader_id and a.status = 'en_cours'
      );
  end if;
  return new;
end;
$$;
