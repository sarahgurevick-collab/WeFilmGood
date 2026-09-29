-- Personnages de WFG 1 : le code genre « 0 » voulait dire femme (Nicole, Nora, Clara…)
-- et n'avait pas été repris. On ne remplit que les genres encore vides,
-- pour ne rien écraser de ce que les auteurs ont saisi sur WFG 2.
update public.characters c
   set gender = 'femme'
  from wfg1.characters_sheet w
 where w.character_id::text = c.legacy_id
   and w.gender = '0'
   and c.gender is null;
