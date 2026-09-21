-- =====================================================================
-- « Auteur de BD » revient : c'est la phase 2 pour laquelle son retrait
-- (migration 0055) avait été prévu. Il est de nouveau proposé aux
-- auteurs, dans le bloc « Votre parcours ».
-- =====================================================================

update public.roles set is_public = true where slug = 'auteur_bd';
