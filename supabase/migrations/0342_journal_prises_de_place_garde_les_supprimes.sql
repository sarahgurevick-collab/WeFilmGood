-- Journal des prises de place : la ligne reste quand le membre est supprimé
-- (28/11/2026, Sarah supprime le profil vide « Frc Ryr » dont elle avait pris
-- la place le jour même ; on n'efface jamais une ligne de ce journal).
alter table public.admin_impersonations drop constraint if exists admin_impersonations_target_id_fkey;
