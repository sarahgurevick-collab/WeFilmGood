-- L'audience de WFG 1 n'avait pas été reprise (19/09). Ses codes, d'après
-- le menu de l'ancien site montré par Sarah le 27/09/2026 : 0 Enfant,
-- 1 Adolescent, 2 Adulte, 3 Sénior, 4 Tous publics. Rangés dans les
-- audiences de WFG 2.
update public.projects p
   set target_audience = case w.target_audience
                           when 0 then 'jeune_public'
                           when 1 then 'jeunes_adultes'
                           when 2 then 'adultes'
                           when 3 then 'adultes'
                           when 4 then 'tous_publics'
                         end
  from wfg1.projects w
 where p.legacy_id = w.project_id::text
   and w.target_audience between 0 and 4
   and p.target_audience is null;
