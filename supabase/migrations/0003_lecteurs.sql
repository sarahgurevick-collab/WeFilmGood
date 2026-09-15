-- =====================================================================
-- Profils lecteurs — inscription protégée par un code secret que seul
-- l'administrateur peut voir et générer.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Le rôle "lecteur" existe comme les autres métiers, mais ne doit
--    jamais apparaître dans le formulaire d'inscription public.
-- ---------------------------------------------------------------------
alter table public.roles add column if not exists is_public boolean not null default true;

insert into public.roles (slug, label_fr, label_en, position, is_public) values
  ('lecteur', 'Lecteur', 'Script reader', 100, false)
on conflict (slug) do update set is_public = excluded.is_public;


-- ---------------------------------------------------------------------
-- 2. Administration
--    Table volontairement sans aucune policy : ni lecture ni écriture
--    via la clé anon ou une session utilisateur, quelle qu'elle soit.
--    Seuls le rôle service et la CLI Supabase liée par jeton peuvent
--    y toucher — c'est ce qui empêche un utilisateur de s'auto-promouvoir.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.profile_id = uid);
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;


-- ---------------------------------------------------------------------
-- 3. Codes d'invitation lecteurs
-- ---------------------------------------------------------------------
create table if not exists public.reader_invite_codes (
  code       text primary key,
  label      text,
  max_uses   int,
  use_count  int not null default 0,
  is_active  boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.reader_invite_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references public.reader_invite_codes(code),
  profile_id  uuid not null unique references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

alter table public.reader_invite_codes       enable row level security;
alter table public.reader_invite_redemptions enable row level security;

-- Réservé aux admins : ni un visiteur ni un lecteur inscrit ne peut lister
-- les codes existants.
drop policy if exists "codes lecteurs réservés aux admins" on public.reader_invite_codes;
create policy "codes lecteurs réservés aux admins"
  on public.reader_invite_codes for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "usages de code réservés aux admins" on public.reader_invite_redemptions;
create policy "usages de code réservés aux admins"
  on public.reader_invite_redemptions for select
  using (public.is_admin());

-- Vérifie qu'un code est valide sans jamais exposer le contenu de la table
-- (fonction "security definer" : elle seule voit à travers le RLS ci-dessus).
create or replace function public.check_reader_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reader_invite_codes c
    where c.code = p_code
      and c.is_active
      and (c.max_uses is null or c.use_count < c.max_uses)
  );
$$;

grant execute on function public.check_reader_code(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Extension du déclencheur d'inscription : consomme le code lecteur
--    s'il est fourni et encore valide, et attribue le rôle "lecteur".
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
