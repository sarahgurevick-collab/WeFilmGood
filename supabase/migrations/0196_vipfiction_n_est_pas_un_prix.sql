-- « Vipfiction » n'est pas un prix (23/10/2026, Sarah) : c'est une étiquette
-- de WFG 1 qui donne à un producteur l'accès gratuit au projet. Elle avait été
-- reprise parmi les sélections de la Maison, et la règle du 05/10 (0133,
-- « une sélection vaut distinction ») mettait le badge « Primé ».

-- 1. La règle ignore désormais Vipfiction.
create or replace function public.selection_vaut_distinction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.libelle <> 'Vipfiction' then
    update public.projects set has_awards = true where id = new.project_id and not has_awards;
  end if;
  return new;
end;
$$;

-- 2. Les projets « primés » par Vipfiction seul (sans autre sélection ni prix
--    écrit) : Un bateau dans le ciel, Elementaria.
update public.projects p
   set has_awards = false
 where has_awards
   and coalesce(btrim(p.awards_detail), '') = ''
   and exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = 'Vipfiction')
   and not exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle <> 'Vipfiction');
