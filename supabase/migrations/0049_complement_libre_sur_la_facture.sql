-- =====================================================================
-- Le complément libre du lecteur sur sa facture.
--
-- Le lecteur récupère sa facture en PDF et peut y ajouter une précision
-- — un numéro de virement, une mention de période, une remarque. Plutôt
-- qu'un espace vide à remplir à la main après coup, un champ qu'il
-- remplit avant d'imprimer, et dont le texte figure sur le document.
--
-- Ces lecteurs ne sont pas auto-entrepreneurs : c'est un revenu
-- d'appoint à côté de leur métier. La facture ne porte donc ni TVA, ni
-- SIRET — seulement le nom et l'adresse.
-- =====================================================================

alter table public.reader_invoices add column if not exists note text;

comment on column public.reader_invoices.note is
  'Complément libre que le lecteur ajoute à sa facture avant de la récupérer en PDF.';

create or replace function public.noter_facture(p_facture uuid, p_note text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.reader_invoices
  set note = nullif(btrim(p_note), '')
  where id = p_facture and reader_id = auth.uid();
$$;

grant execute on function public.noter_facture(uuid, text) to authenticated;
