-- Le Pack Soleils (Sarah, 16/11/2026 : « construis-le »).
-- On achète 5, 10 ou 20 soleils (adhérent : 22, 40 ou 70 € ; sans
-- adhésion : 5 € le soleil), payés par HelloAsso. Un soleil du pack ouvre
-- un projet, comme le soleil du jour ; il ne se perd pas.
-- Ordre de dépense : le soleil du jour d'abord (adhérent), puis le pack.
-- Le solde = soleils achetés et payés − projets ouverts avec le pack
-- (gravity_ouvertures.source = 'pack', prévu dès 0259).

create table if not exists public.soleils_achats (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  nombre            int  not null check (nombre in (5, 10, 20)),
  amount_cents      int  not null check (amount_cents > 0),
  adherent          boolean not null,
  status            text not null default 'en_attente_paiement'
                    check (status in ('en_attente_paiement', 'payee', 'annulee')),
  payment_provider  text not null default 'helloasso',
  payment_reference text,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);
create index if not exists soleils_achats_profil on public.soleils_achats (profile_id);
alter table public.soleils_achats enable row level security;
drop policy if exists "chacun voit ses achats de soleils, l'administration tous" on public.soleils_achats;
create policy "chacun voit ses achats de soleils, l'administration tous" on public.soleils_achats
  for select using (profile_id = auth.uid() or is_admin());
-- Écritures : seulement par le serveur (clé de service).
revoke insert, update, delete on public.soleils_achats from anon, authenticated;

-- Les soleils du pack qui restent.
create or replace function public.soleils_pack_restants(p_profile uuid default auth.uid()) returns int
 language sql stable security definer set search_path to 'public' as $$
  select greatest(0,
    coalesce((select sum(nombre) from public.soleils_achats
              where profile_id = p_profile and status = 'payee'), 0)
    - (select count(*) from public.gravity_ouvertures
       where profile_id = p_profile and source = 'pack'))::int
  where p_profile = auth.uid() or public.is_admin();
$$;
revoke all on function public.soleils_pack_restants(uuid) from anon;
grant execute on function public.soleils_pack_restants(uuid) to authenticated;

-- Ouvrir un projet : le soleil du jour (adhérent), sinon un soleil du pack.
-- Renvoie 'ouvert', 'deja', 'inutile', 'sans_adhesion' (ni adhésion ni
-- pack), 'utilise' (adhérent : soleil du jour dépensé, pack vide) ou
-- 'introuvable'.
create or replace function public.ouvrir_projet(p_project_id uuid) returns text
 language plpgsql security definer set search_path to 'public' as $$
declare
  v_moi uuid := auth.uid();
  v_owner uuid;
  v_adherent boolean;
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
  -- Un soleil à la fois, même si deux clics partent en même temps.
  perform pg_advisory_xact_lock(hashtext('gravity:' || v_moi::text));
  v_adherent := public.a_une_adhesion_active(v_moi);
  if v_adherent and not exists (select 1 from public.gravity_ouvertures
             where profile_id = v_moi and source = 'jour' and jour = public.jour_paris()) then
    insert into public.gravity_ouvertures (profile_id, project_id, jour, source)
    values (v_moi, p_project_id, public.jour_paris(), 'jour');
    return 'ouvert';
  end if;
  if public.soleils_pack_restants(v_moi) > 0 then
    insert into public.gravity_ouvertures (profile_id, project_id, jour, source)
    values (v_moi, p_project_id, public.jour_paris(), 'pack');
    return 'ouvert';
  end if;
  return case when v_adherent then 'utilise' else 'sans_adhesion' end;
end;
$$;
revoke all on function public.ouvrir_projet(uuid) from anon;
grant execute on function public.ouvrir_projet(uuid) to authenticated;
