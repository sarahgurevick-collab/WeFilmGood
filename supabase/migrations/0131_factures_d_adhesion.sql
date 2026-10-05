-- Factures d'adhésion (05/10/2026) : émises automatiquement quand le paiement
-- HelloAsso est confirmé (src/lib/adhesion-paiement.ts), numérotées sans
-- trou, une par adhésion, consultables et imprimables par leur titulaire.
-- Les mentions de la Maison des Scénaristes (association loi 1901, TVA non
-- applicable, article 293 B du CGI) sont dans la page.
create table if not exists public.membership_invoices (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.memberships(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  numero        text not null unique,
  amount_cents  int not null,
  issued_at     timestamptz not null default now(),
  bill_to_name    text,
  bill_to_address text,
  bill_to_siren   text,
  note            text,
  created_at    timestamptz not null default now()
);
create index if not exists membership_invoices_profile_idx on public.membership_invoices (profile_id);

alter table public.membership_invoices enable row level security;
drop policy if exists "factures d'adhésion visibles par leur titulaire et l'admin" on public.membership_invoices;
create policy "factures d'adhésion visibles par leur titulaire et l'admin"
  on public.membership_invoices for select
  using (profile_id = auth.uid() or public.is_admin());

-- Compteur annuel : FA-2026-0001, FA-2026-0002…
create table if not exists public.membership_invoice_counter (
  annee   int primary key,
  dernier int not null default 0
);
alter table public.membership_invoice_counter enable row level security;

-- Crée la facture d'une adhésion (une seule : rejouable). Réservée au
-- service de l'application, jamais appelée depuis le navigateur.
create or replace function public.creer_facture_adhesion(p_membership uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_m public.memberships%rowtype;
  v_annee int;
  v_n int;
begin
  select id into v_id from public.membership_invoices where membership_id = p_membership;
  if v_id is not null then return v_id; end if;

  select * into v_m from public.memberships where id = p_membership;
  if not found or v_m.status <> 'active' or coalesce(v_m.amount_cents, 0) <= 0 then
    return null;
  end if;

  v_annee := extract(year from coalesce(v_m.started_at, now()))::int;
  insert into public.membership_invoice_counter (annee, dernier) values (v_annee, 1)
  on conflict (annee) do update set dernier = public.membership_invoice_counter.dernier + 1
  returning dernier into v_n;

  insert into public.membership_invoices (membership_id, profile_id, numero, amount_cents, issued_at)
  values (p_membership, v_m.profile_id, 'FA-' || v_annee || '-' || lpad(v_n::text, 4, '0'), v_m.amount_cents, coalesce(v_m.started_at, now()))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.creer_facture_adhesion(uuid) from public, anon, authenticated;
grant execute on function public.creer_facture_adhesion(uuid) to service_role;

-- Le titulaire renseigne à qui la facture est adressée (société, adresse,
-- SIREN) : seuls ces champs changent, jamais le montant ni le numéro.
create or replace function public.renseigner_facture_adhesion(
  p_facture uuid, p_nom text, p_adresse text, p_siren text, p_note text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.membership_invoices
     set bill_to_name = nullif(btrim(p_nom), ''),
         bill_to_address = nullif(btrim(p_adresse), ''),
         bill_to_siren = nullif(btrim(p_siren), ''),
         note = nullif(btrim(p_note), '')
   where id = p_facture and profile_id = auth.uid();
$$;
revoke all on function public.renseigner_facture_adhesion(uuid, text, text, text, text) from public, anon;
grant execute on function public.renseigner_facture_adhesion(uuid, text, text, text, text) to authenticated;
