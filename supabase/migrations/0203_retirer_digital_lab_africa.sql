-- Digital Lab Africa est un ancien partenaire (Sarah, 24/10/2026) : retiré
-- des 2 projets (Dimbit, The Foxy Five : Oufoxed) et refusé au réimport.
-- Les deux projets n'avaient que lui : leur badge « Primé » (0133) part aussi.
insert into public.selections_exclues (libelle, raison)
values ('Digital Lab Africa', 'ancien partenaire') on conflict do nothing;
update public.projects p set has_awards = false
 where has_awards and coalesce(btrim(p.awards_detail), '') = ''
   and exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = 'Digital Lab Africa')
   and not exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle <> 'Digital Lab Africa');
delete from public.project_selections where libelle = 'Digital Lab Africa';
