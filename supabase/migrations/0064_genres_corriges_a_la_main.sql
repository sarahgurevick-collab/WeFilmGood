-- =====================================================================
-- Genres corrigés à la main par Sarah, fiche par fiche.
--
-- Les fiches WFG 1 aux genres anciens (Expérimental, Adaptation,
-- Erotique) avaient été rangées en Drame faute de mieux (0061). Sarah
-- relit les scénarios sur WFG 1 et tranche. Chaque ligne ci-dessous est
-- une décision, appliquée le jour même sur la base vivante ; ce fichier
-- la garde en mémoire.
-- =====================================================================

-- 22/09/2026 — « A Oût : le rêve d'une nuit B » (WFG 1 n° 1965) : biopic.
update public.projects set genre_slug = 'biopic'
where legacy_id = '1965' and genre_legacy = 'Expérimental';

-- 22/09/2026 — « Chrome » (WFG 1 n° 1996) : science-fiction.
update public.projects set genre_slug = 'horreur_scifi_fantastique'
where legacy_id = '1996' and genre_legacy = 'Expérimental';

-- 22/09/2026 — « Hand in Hand » (WFG 1 n° 2142) : documentaire.
update public.projects set genre_slug = 'documentaire'
where legacy_id = '2142' and genre_legacy = 'Expérimental';
