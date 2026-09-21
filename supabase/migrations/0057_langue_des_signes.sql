-- =====================================================================
-- La langue des signes rejoint les langues parlées, à la demande de
-- Sarah : un auteur sourd ou muet peut présenter son videopitch en LSF,
-- et un producteur peut le chercher sur ce critère.
-- =====================================================================

insert into public.languages (code, label_fr, label_en, position)
values ('lsf', 'Langue des signes (LSF)', 'French sign language (LSF)', 10)
on conflict (code) do nothing;
