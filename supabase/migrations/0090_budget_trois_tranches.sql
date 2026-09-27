-- Le budget en trois tranches (27/09/2026, demande de Sarah) : petits
-- budgets (< 1 M€), films du milieu, gros budgets (> 7 M€). L'import du
-- 19/09 n'avait pas repris le budget de WFG 1 (wfg1.projects.budget, cinq
-- tranches 0 à 4 : < 1 M, 1-3 M, 3-5 M, 5-10 M, > 10 M) : on le reprend
-- dans les nouvelles tranches. La tranche 3 (5 à 10 M€) chevauche la
-- limite de 7 M€ : elle attend la décision de Sarah et reste vide.
update public.projects p
   set budget_range = case w.budget
                        when 0 then 'petit'
                        when 1 then 'milieu'
                        when 2 then 'milieu'
                        when 4 then 'gros'
                      end
  from wfg1.projects w
 where p.legacy_id = w.project_id::text
   and w.budget in (0, 1, 2, 4)
   and p.budget_range is null;

-- Décision de Sarah (27/09/2026) : la tranche 5 à 10 M€ va dans « Films du
-- milieu ».
update public.projects p
   set budget_range = 'milieu'
  from wfg1.projects w
 where p.legacy_id = w.project_id::text
   and w.budget = 3
   and p.budget_range is null;
