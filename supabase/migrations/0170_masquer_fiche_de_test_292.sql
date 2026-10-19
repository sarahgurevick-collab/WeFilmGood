-- Fiche de test de Sarah (« Derrière le miroir », legacy 292), masquée à sa
-- demande le 19/10/2026 comme les 27 fiches vidées de la migration 0155.
-- Pour la faire revenir : is_public = true, masque_par_admin_le = null.
update public.projects
set is_public = false,
    masque_par_admin_le = now(),
    masque_motif = 'Fiche de test de Sarah, masquée à sa demande (19/10/2026)'
where legacy_id::text = '292'
  and masque_par_admin_le is null;
