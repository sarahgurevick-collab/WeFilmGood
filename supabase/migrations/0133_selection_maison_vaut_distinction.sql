-- Une sélection de la Maison des Scénaristes (Cannes 2013, Clermont 2021…)
-- compte comme une distinction (05/10/2026, Sarah) : l'interrupteur « prix »
-- est sur OUI et le projet porte le badge « Primé », même si l'auteur n'a rien
-- écrit dans le cadre des prix. Seule l'administration pose une sélection ;
-- l'auteur ne peut ni l'ajouter ni la retirer.
update public.projects p
   set has_awards = true
 where not has_awards
   and exists (select 1 from public.project_selections s where s.project_id = p.id);

create or replace function public.selection_vaut_distinction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects set has_awards = true where id = new.project_id and not has_awards;
  return new;
end;
$$;

drop trigger if exists selection_vaut_distinction on public.project_selections;
create trigger selection_vaut_distinction
  after insert on public.project_selections
  for each row execute function public.selection_vaut_distinction();
