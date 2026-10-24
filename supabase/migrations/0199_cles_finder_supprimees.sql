-- Les « clés Finder » de WFG 1 (24/10/2026, Sarah). Dans la famille 7 des
-- mots-clés de WFG 1 se mêlaient deux choses :
--   - les sélections de la Maison des Scénaristes (Cannes 2019, Clermont
--     2021, PCDV, SerieMania, Satis, Valence, FEMI, Maison bleue, Cinephilia,
--     Digital Lab Africa, Menu) et le partenariat Muse Awards : visibles,
--     posées par l'administration seule ;
--   - les « clés Finder », fantômes : invisibles dans le Finder, elles
--     faisaient apparaître un projet sur la page dédiée à un contact
--     (Netflix, Vipfiction, FFFMED, La Guilde des Scénaristes, Le projet du
--     jour). WFG 2 n'en a pas besoin : les mots-clés font mieux.
-- Elles sont supprimées, et la réimportation de WFG 1 ne pourra pas les
-- ramener : la table ci-dessous les refuse à l'entrée.
-- (Vipfiction et FFFMED l'avaient été à la main le 23/10, 0197 et 0198.)

create table if not exists public.selections_exclues (
  libelle text primary key,
  raison text not null
);
comment on table public.selections_exclues is
  'Étiquettes de WFG 1 que project_selections refuse : les clés Finder (24/10/2026, Sarah).';
insert into public.selections_exclues (libelle, raison) values
  ('Netflix', 'clé Finder : page dédiée à un contact Netflix'),
  ('Vipfiction', 'clé Finder : accès gratuit d''un producteur'),
  ('FFFMED', 'clé Finder'),
  ('La Guilde des Scénaristes', 'clé Finder'),
  ('Le projet du jour', 'clé Finder')
on conflict do nothing;

create or replace function public.refuser_selection_exclue()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.selections_exclues e where e.libelle = new.libelle) then
    return null; -- ignorée sans erreur, pour que les scripts de reprise passent
  end if;
  return new;
end;
$$;
drop trigger if exists refuser_selection_exclue on public.project_selections;
create trigger refuser_selection_exclue
  before insert on public.project_selections
  for each row execute function public.refuser_selection_exclue();

-- Le badge « Primé » (0133) posé par une clé Finder seule : retiré.
update public.projects p
   set has_awards = false
 where has_awards
   and coalesce(btrim(p.awards_detail), '') = ''
   and exists (select 1 from public.project_selections s join public.selections_exclues e on e.libelle = s.libelle where s.project_id = p.id)
   and not exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle not in (select libelle from public.selections_exclues));

delete from public.project_selections where libelle in (select libelle from public.selections_exclues);
