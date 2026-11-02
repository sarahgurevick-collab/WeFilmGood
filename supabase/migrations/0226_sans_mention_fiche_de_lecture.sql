-- Après consultation (02/11/2026, Sarah) : le producteur se fiche de savoir
-- pourquoi un projet remonte, ce qui compte est qu'il trouve. La mention
-- « “mot” présent dans la fiche de lecture » (0224, le jour même) est
-- retirée des Galaxies, et avec elle la fonction qui la servait.
drop function if exists public.mots_presents_dans_la_fiche_de_lecture(uuid[], text[]);
