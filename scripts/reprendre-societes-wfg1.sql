-- Reprend de WFG 1 (schéma wfg1) le nom de société et le SIREN des membres.
-- Rejouable : ne remplit qu'une société vide, n'écrase jamais un SIREN déjà là.
-- Usage : docker exec -i supabase-db psql -U postgres -d postgres < scripts/reprendre-societes-wfg1.sql
with s as (
  select a.user_id::text as legacy_id,
         coalesce(nullif(btrim(d.value), ''), nullif(btrim(a.society_name), '')) as societe
  from wfg1.accounts a
  left join (select user_id, max(value) as value from wfg1.user_data where name = 'society_name' group by user_id) d
    on d.user_id = a.user_id
)
update public.profiles p
set societe = left(regexp_replace(s.societe, '\s+', ' ', 'g'), 200)
from s
where p.legacy_id = s.legacy_id and s.societe is not null and nullif(btrim(p.societe), '') is null;

with n as (
  select user_id::text as legacy_id, max(btrim(value)) as saisi,
         regexp_replace(max(value), '[^0-9]', '', 'g') as chiffres
  from wfg1.user_data where name = 'siren_nb' group by user_id
)
insert into public.societes_siren (profile_id, siren, saisi)
select p.id, left(n.chiffres, 9), n.saisi
from n join public.profiles p on p.legacy_id = n.legacy_id
where length(n.chiffres) in (9, 14) and p.anonymized_at is null
on conflict (profile_id) do nothing;

select (select count(*) from public.profiles where nullif(btrim(societe), '') is not null) as profils_avec_societe,
       (select count(*) from public.societes_siren) as siren_gardes;
