-- 13/11/2026, Sarah : « le plus gros ». « animal » trouvait « animalier »,
-- « animale » ; « animaux » ne trouvait que « animal » et « animaux » en
-- mots entiers (227 projets contre 202). L'autre forme d'un mot est
-- maintenant cherchée comme un début de mot : « animaux » trouve tout ce qui
-- commence par « animal », « voisine » tout ce qui commence par « voisin ».
-- Elle reste un début de mot : « paris » ne va toujours pas chercher
-- « pari » au milieu de « comparaison ». Revers accepté : « mers » trouve
-- « merci », comme « mer » tapé seul ; ces projets sortent en fin de liste.
-- La même règle dans src/app/galaxies/mot-trouve.ts (le mot en rouge).
create or replace function public.rx_formes(w text)
returns text language sql immutable parallel safe as $$
  select case when cardinality(public.formes_du_mot(w)) = 0 then null
              else '\m(' || array_to_string(public.formes_du_mot(w), '|') || ')' end;
$$;
