-- =====================================================================
-- « Où en est mon projet ? »
--
-- L'auteur recevait, sur WFG 1, un e-mail à chaque changement de
-- lecteur. Reçu quatre fois, ce message lui faisait comprendre que
-- personne ne voulait de son projet, et il écrivait à l'administration
-- — qui répond à des centaines de courriers.
--
-- Cette fonction lui donne de quoi se renseigner tout seul, sans rien
-- livrer de la cuisine interne : ni le nom du lecteur, ni les refus, ni
-- les réattributions. Un projet décliné par trois lecteurs affiche le
-- même état qu'un projet confié du premier coup — c'est exact, et c'est
-- tout ce qui le concerne.
-- =====================================================================

create or replace function public.etat_de_lecture(p_project_id uuid)
returns table (etat text, depose_le timestamptz, rendue_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when exists (
        select 1 from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p.id
      ) then 'disponible'
      when exists (
        select 1 from public.reading_assignments a
        where a.project_id = p.id and a.status in ('en_cours', 'rendue')
      ) then 'en_lecture'
      else 'attribution'
    end,
    p.created_at,
    (
      select max(pub.published_at) from public.reading_report_publications pub
      join public.reading_reports r on r.id = pub.reading_report_id
      where r.project_id = p.id
    )
  from public.projects p
  where p.id = p_project_id
    and (p.owner_id = auth.uid() or public.is_admin());
$$;

grant execute on function public.etat_de_lecture(uuid) to authenticated;
