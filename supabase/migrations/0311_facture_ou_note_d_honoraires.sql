-- =====================================================================
-- Facture ou note d'honoraires : le lecteur choisit le titre de son
-- document (Sarah, 21/11/2026).
--
-- C'est le lecteur qui facture La Maison des Scénaristes. Selon sa
-- situation, son document s'appelle « Facture lecture » ou « Note
-- d'honoraires lecture ». Il le choisit avec un bouton sur le document
-- lui-même ; son choix est repris sur ses documents suivants.
-- =====================================================================

alter table public.reader_invoices
  add column if not exists type_document text not null default 'facture'
  check (type_document in ('facture', 'note_honoraires'));

comment on column public.reader_invoices.type_document is
  'Titre du document choisi par le lecteur : facture (« Facture lecture ») ou note_honoraires (« Note d''honoraires lecture »).';

-- Un nouveau document reprend le dernier choix du lecteur.
create or replace function public.reprendre_type_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select f.type_document into new.type_document
  from public.reader_invoices f
  where f.reader_id = new.reader_id
  order by f.created_at desc
  limit 1;
  new.type_document := coalesce(new.type_document, 'facture');
  return new;
end;
$$;

drop trigger if exists reprendre_type_document on public.reader_invoices;
create trigger reprendre_type_document
  before insert on public.reader_invoices
  for each row execute function public.reprendre_type_document();

-- Le lecteur change le titre de son propre document, et de lui seul.
create or replace function public.choisir_type_facture(p_facture uuid, p_type text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.reader_invoices
  set type_document = p_type
  where id = p_facture
    and reader_id = auth.uid()
    and p_type in ('facture', 'note_honoraires');
$$;

revoke execute on function public.choisir_type_facture(uuid, text) from public, anon;
grant execute on function public.choisir_type_facture(uuid, text) to authenticated;
