-- Le métier « Créateur SFX digitaux » devient « Créateur SFX/IA »
-- (02/10/2026, décision de Sarah). Le code du métier (sfx_digitaux) ne
-- change pas : aucun profil n'est touché. « ia » s'ajoute aux synonymes
-- pour la recherche.
update public.roles
   set label_fr = 'Créateur SFX/IA',
       label_en = 'SFX/AI artist',
       synonymes = array['effets spéciaux', 'vfx', 'ia', 'intelligence artificielle']
 where slug = 'sfx_digitaux';
