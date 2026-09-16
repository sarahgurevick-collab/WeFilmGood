-- =====================================================================
-- Motivation de la labellisation.
--
-- Quand le lecteur place sa note au-delà du seuil, il justifie en
-- quelques lignes ce qui lui a plu. Le texte reste celui du lecteur : il
-- n'est pas retouché à la publication, contrairement à la fiche.
-- =====================================================================

alter table public.reading_reports add column if not exists label_motivation text;
