-- 24/10/2026, Sarah : « Menu » est une clé Finder (à supprimer, 6 projets),
-- et « Digital Lab Africa » un partenariat comme Muse Awards : pas de
-- bandeau Sélection. Seul le partenariat Cinephilia compte comme sélection.

insert into public.selections_exclues (libelle, raison)
values ('Menu', 'clé Finder') on conflict do nothing;

update public.projects p set has_awards = false
 where has_awards and coalesce(btrim(p.awards_detail), '') = ''
   and exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = 'Menu')
   and not exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle <> 'Menu');
delete from public.project_selections where libelle = 'Menu';

create or replace function public.a_une_selection_mds(p_project_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.project_selections s
    where s.project_id = p_project_id
      -- Les partenariats ne sont pas des sélections de la Maison, sauf Cinephilia.
      and s.libelle not in ('Muse Awards', 'Digital Lab Africa')
  );
$$;
update public.projects p set bandeau = null
 where bandeau = 'selection_mds' and not public.a_une_selection_mds(p.id);
