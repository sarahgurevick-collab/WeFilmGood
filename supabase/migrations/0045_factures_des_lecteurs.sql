-- =====================================================================
-- Les factures des lecteurs.
--
-- Un lecteur est payé 15 € par fiche, et établissait sa facture à la
-- main. L'administration devait ensuite vérifier qu'aucune ligne ne
-- rejouait un projet déjà réglé sur une facture précédente.
--
-- Ici, une fiche déjà facturée n'est plus sélectionnable : l'erreur
-- devient impossible au lieu d'être rattrapée. C'est le vrai gain.
--
-- Le tarif est copié sur la facture plutôt que lu ailleurs : s'il change
-- un jour, les factures passées gardent le leur.
-- =====================================================================

create sequence if not exists reader_invoice_seq;

create table if not exists public.reader_invoices (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles(id),
  numero text not null unique,
  tarif_cents integer not null default 1500,
  created_at timestamptz not null default now()
);

alter table public.reading_reports
  add column if not exists invoice_id uuid references public.reader_invoices(id);

create index if not exists reading_reports_invoice_idx
  on public.reading_reports (invoice_id);

alter table public.reader_invoices enable row level security;

drop policy if exists "factures visibles du lecteur et de l'admin" on public.reader_invoices;
create policy "factures visibles du lecteur et de l'admin"
  on public.reader_invoices for select
  using (reader_id = auth.uid() or public.is_admin());

/**
 * Établit une facture pour les fiches choisies.
 *
 * Ne retient que les fiches du lecteur qui appelle, validées et non
 * encore facturées : une fiche déjà réglée ne peut pas être rejouée,
 * même en forçant la requête.
 */
create or replace function public.etablir_facture(p_reports uuid[])
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  nouvelle uuid;
  retenues integer;
begin
  select count(*) into retenues
  from public.reading_reports r
  where r.id = any(p_reports)
    and r.reader_id = auth.uid()
    and r.status = 'validee_admin'
    and r.invoice_id is null;

  if retenues = 0 then
    return null;
  end if;

  insert into public.reader_invoices (reader_id, numero)
  values (
    auth.uid(),
    to_char(now(), 'YYYY') || '-' || lpad(nextval('reader_invoice_seq')::text, 4, '0')
  )
  returning id into nouvelle;

  update public.reading_reports r
  set invoice_id = nouvelle
  where r.id = any(p_reports)
    and r.reader_id = auth.uid()
    and r.status = 'validee_admin'
    and r.invoice_id is null;

  return nouvelle;
end;
$$;

grant execute on function public.etablir_facture(uuid[]) to authenticated;
