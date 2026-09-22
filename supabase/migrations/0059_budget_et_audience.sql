-- =====================================================================
-- Budget estimé et audience ciblée : deux menus de plus dans le bloc 1
-- de la fiche projet, groupés avec le format et le genre.
--
-- « target_audience » était en tableau (0004) pour plusieurs publics à
-- la fois ; l'écran n'a jamais existé et la colonne est restée vide.
-- On la ramène à une valeur unique, comme « budget_range » : la
-- maquette n'en demande qu'une.
-- =====================================================================

alter table public.projects
  alter column target_audience type text using null;
