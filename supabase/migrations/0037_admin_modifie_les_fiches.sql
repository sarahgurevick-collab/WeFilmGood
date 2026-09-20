-- =====================================================================
-- L'administratrice peut corriger une fiche projet.
--
-- Elle fait une grande part du travail à la place des auteurs : corriger
-- une logline truffée de fautes, compléter un champ laissé vide. Une
-- fiche mal écrite dessert un bon projet, et demander à l'auteur de
-- recopier un texte corrigé par e-mail ne marche pas.
--
-- Le droit de modification était réservé au titulaire.
-- =====================================================================

drop policy if exists "chacun modifie ses projets" on public.projects;
create policy "chacun modifie ses projets, l'admin toutes les fiches"
  on public.projects for update
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());
