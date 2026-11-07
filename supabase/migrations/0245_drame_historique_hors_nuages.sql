-- « drame historique » = Récit historique (07/11/2026, Sarah : « supprimer
-- drame historique = recit historique ») : hors des nuages et des suggestions,
-- comme les mots de l'escalier.

create or replace function public.refaire_mots_escalier()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  delete from public.mots_escalier;
  insert into public.mots_escalier (cle)
  select distinct public.cle_mot_escalier(m) from (
    select label_fr as m from public.genres
    union all select btrim(x) from public.sous_genres, unnest(string_to_array(label_fr, '/')) x
    union all select unnest(mots_cles) from public.sous_genres
    union all select unnest(array['fiction', 'documentaire', 'prise de vues réelles', 'prises de vues réelles',
                                  'animation', 'contenu IA', 'médias mixtes', 'cape et épée', 'film musical',
                                  'drame historique'])
  ) e
  where public.cle_mot_escalier(m) <> '';
  return null;
end;
$fn$;

update public.genres set position = position where false;

delete from public.nuages_mots_cles where public.mot_de_l_escalier(label);
