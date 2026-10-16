-- Les langues qu'un lecteur accepte de lire (16/10/2026, Sarah) : il les
-- coche lui-même depuis son profil (/lecteur/profil). NULL = toutes ;
-- {} = aucune (plus de projet proposé), comme pour les formats.
alter table public.reader_profiles add column if not exists langues text[];
comment on column public.reader_profiles.langues is
  'Langues de projet (fr, en, es, de, it, pt, ar) que le lecteur accepte de lire. NULL = toutes ; {} = aucune.';

-- Les cases cochées sur WFG 1 (reader_fr, reader_en…). Un lecteur dont
-- aucune case n''était cochée reste à NULL : on ne lui ferme rien.
update public.reader_profiles rp
set langues = x.langues
from (
  select p.id as profile_id,
         array_agg(substr(d.name, 8) order by d.name) as langues
  from public.profiles p
  join wfg1.user_data d on d.user_id = p.legacy_user_id
  where d.name in ('reader_fr','reader_en','reader_es','reader_de','reader_it','reader_pt','reader_ar')
    and d.value = '1'
  group by p.id
) x
where rp.profile_id = x.profile_id and rp.langues is null;
