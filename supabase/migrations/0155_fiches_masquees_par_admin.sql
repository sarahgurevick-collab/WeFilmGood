-- Fiches masquées par l'administration (11/10/2026, Sarah). Des auteurs
-- mécontents de WFG 1 avaient vidé leur fiche (résumé en « xxxx », titre en
-- points, nom réduit à ses consonnes). On les retire de la vue des membres
-- (Galaxies, recherche, profil : tout filtre sur is_public) sans rien
-- supprimer : la fiche, ses fiches de lecture et son auteur restent, et
-- Sarah garde leurs adresses pour leur écrire. Pour la faire revenir :
-- is_public = true, masque_par_admin_le = null.
alter table public.projects
  add column if not exists masque_par_admin_le timestamptz,
  add column if not exists masque_motif text;
comment on column public.projects.masque_par_admin_le is
  'Fiche retirée de la vue des membres par l''administration (is_public passé à faux en même temps). Null = jamais masquée.';

update public.projects
set is_public = false,
    masque_par_admin_le = now(),
    masque_motif = 'Fiche vidée par son auteur sur WFG 1 (liste du 11/10/2026)'
where legacy_id::text in ('2836','3000','3050','3612','4523','4412','3998','3583','3584','5173','2808','1902','1849','202','231','2437','297','319','523','88','5200','1037','4500','3006','4439','2975','5471')
  and masque_par_admin_le is null;
