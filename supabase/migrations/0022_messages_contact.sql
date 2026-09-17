-- =====================================================================
-- Messagerie de contact ouverte aux visiteurs sans profil.
--
-- On accepte qu'un formulaire ouvert à tout le monde attire un peu de
-- spam : c'est le compromis choisi pour laisser n'importe qui écrire à
-- la plateforme sans devoir créer de compte au préalable.
-- =====================================================================

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  nom        text,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now(),
  lu         boolean not null default false
);

alter table public.contact_messages enable row level security;

-- Table fermée : ni lecture ni écriture directe, tout passe par la
-- fonction ci-dessous (écriture) et par un admin (lecture).
drop policy if exists "un admin lit les messages de contact" on public.contact_messages;
create policy "un admin lit les messages de contact"
  on public.contact_messages for select
  using (public.is_admin());

create or replace function public.envoyer_message_contact(
  p_nom     text,
  p_email   text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if trim(coalesce(p_email, '')) = '' or trim(coalesce(p_message, '')) = '' then
    raise exception 'Email et message sont obligatoires';
  end if;

  insert into public.contact_messages (nom, email, message)
  values (nullif(trim(p_nom), ''), trim(p_email), trim(p_message));
end;
$$;

grant execute on function public.envoyer_message_contact(text, text, text) to anon, authenticated;
