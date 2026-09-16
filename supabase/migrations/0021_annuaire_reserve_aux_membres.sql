-- =====================================================================
-- L'annuaire des membres se ferme aux visiteurs.
--
-- Les profils étaient lisibles par tous : la clé publique présente dans
-- chaque page suffisait à lister l'intégralité des membres, leurs
-- métiers et leurs genres de prédilection. Or WeFilmGood ne fait pas
-- commerce de la présence de ses membres — un producteur connu a un
-- profil sans que personne ne le sache, et c'est ainsi que ça doit
-- rester.
--
-- Les référentiels (genres, métiers, langues, offres, CGUV) restent
-- publics : ils ne désignent personne.
-- =====================================================================

drop policy if exists "profils lisibles par tous" on public.profiles;
create policy "profils réservés aux membres"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "métiers lisibles par tous" on public.profile_roles;
create policy "métiers réservés aux membres"
  on public.profile_roles for select
  using (auth.uid() is not null);

drop policy if exists "mots-clés de profil lisibles par tous" on public.profile_keywords;
create policy "mots-clés de profil réservés aux membres"
  on public.profile_keywords for select
  using (auth.uid() is not null);

drop policy if exists "genres de profil lisibles par tous" on public.profile_genres;
create policy "genres de profil réservés aux membres"
  on public.profile_genres for select
  using (auth.uid() is not null);

drop policy if exists "langues de profil lisibles par tous" on public.profile_languages;
create policy "langues de profil réservées aux membres"
  on public.profile_languages for select
  using (auth.uid() is not null);
