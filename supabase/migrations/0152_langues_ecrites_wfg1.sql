-- Les langues écrites de WFG 1 (11/10/2026, Sarah) : WFG 2 n'a qu'une liste,
-- « Langues parlées » ; une langue qu'on écrit s'y ajoute (291 ajouts sur
-- les profils repris, le reste était déjà dans les langues parlées).
insert into public.profile_languages (profile_id, language_code)
select distinct p.id,
  case l.code when 'cn' then 'zh' when 'jp' then 'ja' else l.code end
from (
  select d.user_id, unnest(string_to_array(d.value, '|')) as code
  from wfg1.user_data d where d.name = 'written_languages'
) l
join public.profiles p on p.legacy_id::text = l.user_id::text
join public.languages g on g.code = case l.code when 'cn' then 'zh' when 'jp' then 'ja' else l.code end
on conflict do nothing;
