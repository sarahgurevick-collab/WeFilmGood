-- =====================================================================
-- Messagerie projet -> auteur, verrouillée par l'adhésion de l'auteur.
--
-- N'importe quel membre connecté peut écrire à l'auteur d'un projet
-- public. Le message part toujours et reste actif — l'auteur voit
-- qu'il a reçu quelque chose — mais il ne peut en lire le contenu que
-- si son adhésion est active. C'est volontaire : ça motive à réadhérer
-- pour découvrir qui s'intéresse à son projet, plutôt que de masquer
-- purement et simplement la prise de contact.
-- =====================================================================

create or replace function public.a_une_adhesion_active(p_profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.memberships
    where profile_id = p_profile_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

grant execute on function public.a_une_adhesion_active(uuid) to anon, authenticated;


create table if not exists public.project_messages (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists project_messages_recipient_idx on public.project_messages (recipient_id);
create index if not exists project_messages_sender_idx on public.project_messages (sender_id);

alter table public.project_messages enable row level security;

drop policy if exists "on écrit à l'auteur d'un projet qu'on ne possède pas" on public.project_messages;
create policy "on écrit à l'auteur d'un projet qu'on ne possède pas"
  on public.project_messages for insert
  with check (
    sender_id = auth.uid()
    and sender_id <> recipient_id
    and recipient_id = (select owner_id from public.projects where id = project_id)
  );

drop policy if exists "l'expéditeur et le destinataire voient leurs messages" on public.project_messages;
create policy "l'expéditeur et le destinataire voient leurs messages"
  on public.project_messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());


-- Vue côté destinataire : la ligne est toujours visible (on sait qu'on
-- a reçu un message), le corps n'apparaît que si l'adhésion est active.
create or replace view public.mes_messages_recus as
select
  m.id,
  m.project_id,
  p.title as project_title,
  m.sender_id,
  coalesce(sp.display_name, sp.full_name) as sender_name,
  m.created_at,
  case when public.a_une_adhesion_active(m.recipient_id) then m.body else null end as body,
  not public.a_une_adhesion_active(m.recipient_id) as verrouille
from public.project_messages m
join public.projects p on p.id = m.project_id
join public.profiles sp on sp.id = m.sender_id
where m.recipient_id = auth.uid()
order by m.created_at desc;

grant select on public.mes_messages_recus to authenticated;
