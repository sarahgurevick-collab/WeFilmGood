-- La satisfaction de l'auteur sur sa fiche de lecture passe de cinq emojis à
-- une jauge à quatre positions (Sarah, 21/11/2026) : 1 rouge, 2 jaune, 3 bleu,
-- 4 vert. La table est vide au moment du changement (aucune fiche de WFG 2
-- n'a encore été notée) : rien à convertir.
-- Les notes sur cinq étoiles de WFG 1 (legacy_reading_reports.author_rating)
-- ne changent pas ; elles sont rangées à l'affichage (positionDepuisCinq).
alter table public.reading_report_ratings
  drop constraint reading_report_ratings_stars_check,
  add constraint reading_report_ratings_stars_check check (stars >= 1 and stars <= 4);
