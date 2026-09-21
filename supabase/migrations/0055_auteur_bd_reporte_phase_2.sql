-- =====================================================================
-- « Auteur de BD » est retiré de la liste des métiers proposés dans
-- « Qui êtes-vous ? », à la demande de Sarah — pas supprimé : à remettre
-- en phase 2. Les membres qui l'avaient déjà coché le gardent
-- (profile_roles n'est pas touché), il disparaît seulement du formulaire.
-- =====================================================================

update public.roles set is_public = false where slug = 'auteur_bd';
