-- =====================================================================
-- Le tarif d'un lecteur lui est propre.
--
-- Tout le monde est à 15 € aujourd'hui, mais certains lecteurs valent
-- plus cher et le tarif sera fixé au cas par cas. Le porter sur le
-- lecteur plutôt que dans le code évite d'avoir à redéployer le site
-- pour changer un chiffre.
--
-- La facture en garde une copie : un tarif révisé ne réécrit jamais les
-- factures déjà établies.
-- =====================================================================

alter table public.reader_profiles
  add column if not exists tarif_cents integer not null default 1500;

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
  tarif integer;
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

  select coalesce(rp.tarif_cents, 1500) into tarif
  from public.reader_profiles rp
  where rp.profile_id = auth.uid();

  insert into public.reader_invoices (reader_id, numero, tarif_cents)
  values (
    auth.uid(),
    to_char(now(), 'YYYY') || '-' || lpad(nextval('reader_invoice_seq')::text, 4, '0'),
    coalesce(tarif, 1500)
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
