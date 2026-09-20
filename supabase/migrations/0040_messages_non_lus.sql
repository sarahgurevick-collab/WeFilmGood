-- =====================================================================
-- Le compteur de messages non lus.
--
-- Un talent non adhérent ne peut pas ouvrir sa messagerie, mais il doit
-- voir qu'un message l'attend : c'est ce « 1 » qui lui donne une raison
-- d'adhérer. Le nombre n'est pas le contenu — le compter ne trahit rien.
--
-- Un message n'est marqué lu que lorsqu'il a été RÉELLEMENT lu, donc
-- jamais tant que l'adhésion est inactive : le compteur continue de
-- signaler ce qui attend.
-- =====================================================================

alter table public.project_messages
  add column if not exists read_at timestamptz;

create or replace function public.compter_messages_non_lus()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.project_messages
  where recipient_id = auth.uid() and read_at is null;
$$;

grant execute on function public.compter_messages_non_lus() to authenticated;

-- Marque lus les messages que le destinataire a pu voir en clair : si
-- son adhésion est inactive, ils restent non lus et continuent de
-- clignoter.
create or replace function public.marquer_messages_lus()
returns integer
language sql
volatile
security definer
set search_path = public
as $$
  with vus as (
    update public.project_messages
    set read_at = now()
    where recipient_id = auth.uid()
      and read_at is null
      and public.a_une_adhesion_active(auth.uid())
    returning 1
  )
  select count(*)::int from vus;
$$;

grant execute on function public.marquer_messages_lus() to authenticated;
