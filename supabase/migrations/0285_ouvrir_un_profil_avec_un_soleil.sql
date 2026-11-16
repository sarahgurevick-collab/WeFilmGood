-- Contacter un talent sans passer par un projet (16/11/2026, Sarah :
-- « Contacter des talents qui n'ont pas de projets sur WFG », l'exemple du
-- dresseur d'animaux ; « Oui, 1 soleil »). Depuis la recherche de Talents
-- des Galaxies, on ouvre le profil d'un talent avec un soleil, comme un
-- projet : son nom et sa photo apparaissent, sa carte mène à son profil,
-- on peut lui écrire. Même réserve de soleils que les projets : le soleil
-- du jour (adhérent) d'abord, puis le Pack Soleils.

create table if not exists public.soleil_profils (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  membre_id  uuid not null references public.profiles(id) on delete cascade,
  ouvert_le  timestamptz not null default now(),
  jour       date not null,
  source     text not null default 'jour' check (source in ('jour', 'pack', 'admin')),
  primary key (profile_id, membre_id)
);
create index if not exists soleil_profils_jour on public.soleil_profils (profile_id, jour) where source = 'jour';
alter table public.soleil_profils enable row level security;
drop policy if exists "chacun voit ses profils ouverts, l'administration tous" on public.soleil_profils;
create policy "chacun voit ses profils ouverts, l'administration tous" on public.soleil_profils
  for select using (profile_id = auth.uid() or is_admin());
revoke insert, update, delete on public.soleil_profils from anon, authenticated;

-- Le soleil du jour est-il déjà dépensé (sur un projet ou un profil) ?
create or replace function public.soleil_du_jour_depense(p_profile uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.gravity_ouvertures o
                 where o.profile_id = p_profile and o.source = 'jour' and o.jour = public.jour_paris())
      or exists (select 1 from public.soleil_profils s
                 where s.profile_id = p_profile and s.source = 'jour' and s.jour = public.jour_paris());
$$;
revoke all on function public.soleil_du_jour_depense(uuid) from anon, authenticated;

create or replace function public.gravity_du_jour_disponible() returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null
     and public.a_une_adhesion_active(auth.uid())
     and not public.soleil_du_jour_depense(auth.uid());
$$;

create or replace function public.soleils_pack_restants(p_profile uuid default auth.uid()) returns int
 language sql stable security definer set search_path to 'public' as $$
  select greatest(0,
    coalesce((select sum(nombre) from public.soleils_achats
              where profile_id = p_profile and status = 'payee'), 0)
    - (select count(*) from public.gravity_ouvertures where profile_id = p_profile and source = 'pack')
    - (select count(*) from public.soleil_profils where profile_id = p_profile and source = 'pack'))::int
  where p_profile = auth.uid() or public.is_admin();
$$;

-- Dépenser un soleil : 'jour', 'pack', ou null s'il n'en reste pas.
-- (Appelée sous le verrou du membre.)
create or replace function public.soleil_a_depenser(p_profile uuid) returns text
 language sql stable security definer set search_path to 'public' as $$
  select case
    when public.a_une_adhesion_active(p_profile) and not public.soleil_du_jour_depense(p_profile) then 'jour'
    when public.soleils_pack_restants(p_profile) > 0 then 'pack'
  end;
$$;
revoke all on function public.soleil_a_depenser(uuid) from anon, authenticated;

create or replace function public.ouvrir_projet(p_project_id uuid) returns text
 language plpgsql security definer set search_path to 'public' as $$
declare
  v_moi uuid := auth.uid();
  v_owner uuid;
  v_source text;
begin
  if v_moi is null then return 'introuvable'; end if;
  select owner_id into v_owner from public.projects where id = p_project_id and is_public;
  if v_owner is null then return 'introuvable'; end if;
  if v_owner = v_moi or public.is_admin()
     or exists (select 1 from public.project_co_authors c
                where c.project_id = p_project_id and c.profile_id = v_moi and c.status = 'accepte') then
    return 'inutile';
  end if;
  if exists (select 1 from public.gravity_ouvertures where profile_id = v_moi and project_id = p_project_id) then
    return 'deja';
  end if;
  perform pg_advisory_xact_lock(hashtext('gravity:' || v_moi::text));
  v_source := public.soleil_a_depenser(v_moi);
  if v_source is null then
    return case when public.a_une_adhesion_active(v_moi) then 'utilise' else 'sans_adhesion' end;
  end if;
  insert into public.gravity_ouvertures (profile_id, project_id, jour, source)
  values (v_moi, p_project_id, public.jour_paris(), v_source);
  return 'ouvert';
end;
$$;

-- Ouvrir le profil d'un talent. Renvoie 'ouvert', 'deja', 'inutile'
-- (soi-même, l'administration), 'sans_soleil' ou 'introuvable'.
create or replace function public.ouvrir_profil(p_membre uuid) returns text
 language plpgsql security definer set search_path to 'public' as $$
declare
  v_moi uuid := auth.uid();
  v_source text;
begin
  if v_moi is null then return 'introuvable'; end if;
  if not exists (select 1 from public.profiles where id = p_membre and anonymized_at is null)
     or exists (select 1 from public.profile_roles where profile_id = p_membre and role_slug = 'lecteur') then
    return 'introuvable';
  end if;
  if p_membre = v_moi or public.is_admin() then return 'inutile'; end if;
  if exists (select 1 from public.soleil_profils where profile_id = v_moi and membre_id = p_membre) then
    return 'deja';
  end if;
  perform pg_advisory_xact_lock(hashtext('gravity:' || v_moi::text));
  v_source := public.soleil_a_depenser(v_moi);
  if v_source is null then return 'sans_soleil'; end if;
  insert into public.soleil_profils (profile_id, membre_id, jour, source)
  values (v_moi, p_membre, public.jour_paris(), v_source);
  return 'ouvert';
end;
$$;

create or replace function public.profil_ouvert_par_soleil(p_membre uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.soleil_profils s
                 where s.profile_id = auth.uid() and s.membre_id = p_membre);
$$;

revoke all on function public.ouvrir_projet(uuid), public.ouvrir_profil(uuid),
  public.profil_ouvert_par_soleil(uuid), public.soleils_pack_restants(uuid),
  public.gravity_du_jour_disponible() from anon;
grant execute on function public.ouvrir_projet(uuid), public.ouvrir_profil(uuid),
  public.profil_ouvert_par_soleil(uuid), public.soleils_pack_restants(uuid),
  public.gravity_du_jour_disponible() to authenticated;
