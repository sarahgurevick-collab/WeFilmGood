-- =====================================================================
-- Les anciens messages de WFG 1 (19/10/2026, Sarah : « garder les anciens
-- messages échangés »).
--
-- wfg1.chat : 3 914 messages entre deux comptes. On reprend ceux dont
-- l'expéditeur ET le destinataire ont un profil sur WFG 2 (legacy_id), avec
-- leur date d'origine, marqués lus (aucun n'était non lu) : aucune
-- notification ne part. Hors projet, sans objet (l'écran gère l'absence).
-- Exclus : les messages vides, et ceux adressés à un lecteur (un lecteur
-- n'est pas joignable). Visibles des deux personnes seulement, selon la
-- règle habituelle (le destinataire doit avoir une adhésion active).
-- Rejouable : legacy_chat_id est unique.
-- =====================================================================

alter table public.project_messages
  add column if not exists legacy_chat_id bigint;
create unique index if not exists project_messages_legacy_chat_idx
  on public.project_messages (legacy_chat_id) where legacy_chat_id is not null;

insert into public.project_messages (project_id, sender_id, recipient_id, body, created_at, read_at, legacy_chat_id)
select null, s.id, d.id, btrim(c.message),
       (c.date::timestamp at time zone 'Europe/Paris'),
       (c.date::timestamp at time zone 'Europe/Paris'),
       c.chat_id
from wfg1.chat c
join public.profiles s on s.legacy_id = c.user_id::text
join public.profiles d on d.legacy_id = c.recipient_id::text
where s.id <> d.id
  and nullif(btrim(c.message), '') is not null
  and not exists (select 1 from public.profile_roles r where r.profile_id = d.id and r.role_slug = 'lecteur')
on conflict (legacy_chat_id) where legacy_chat_id is not null do nothing;
