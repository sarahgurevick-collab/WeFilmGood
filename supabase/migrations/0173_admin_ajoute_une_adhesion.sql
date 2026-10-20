-- =====================================================================
-- L'administration peut ajouter une adhésion (20/10/2026).
--
-- Le menu « Adhésion » de l'écran des membres ferme l'adhésion en cours
-- (UPDATE, permis à l'administration) puis en crée une (INSERT). Seul le
-- titulaire pouvait insérer, et seulement « en attente de paiement » :
-- l'insertion de l'administration échouait sans bruit, l'adhésion choisie
-- s'affichait quelques secondes puis disparaissait.
-- =====================================================================

drop policy if exists "un admin ajoute une adhésion" on public.memberships;
create policy "un admin ajoute une adhésion"
  on public.memberships for insert
  with check (public.is_admin());
