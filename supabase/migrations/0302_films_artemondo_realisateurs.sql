-- Réalisateur et année des trois films d'Artemondo dont la fiche du site
-- était décalée ou absente — donnés par Sarah le 21/11/2026.
update public.films_cnc set realisateur = 'MERLIN Laurent', annee_sortie = 2018
 where source = 'artemondo' and titre = 'Le fils du désert';
update public.films_cnc set realisateur = 'HAMDI Nora', annee_sortie = 2019
 where source = 'artemondo' and titre = 'La Maquisarde';
update public.films_cnc set realisateur = 'GIRERD Stéphanie', annee_sortie = 2015
 where source = 'artemondo' and titre = 'Africaine';
