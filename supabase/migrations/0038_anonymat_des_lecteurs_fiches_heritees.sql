-- =====================================================================
-- L'auteur ne doit jamais pouvoir identifier son lecteur.
--
-- Règle de la Maison des Scénaristes : un auteur ne connaît que le
-- prénom du lecteur, jamais son nom complet, et ne doit pas pouvoir le
-- retrouver. Les fiches de WFG 2 la respectent déjà —
-- `get_project_reading_report` ne renvoie que `split_part(full_name, ' ', 1)`.
--
-- Les fiches héritées importées aujourd'hui portaient en revanche
-- `reader_legacy_id`, et la table était lisible par l'auteur du projet.
-- Ce numéro ne mène à rien pour l'instant — `profiles.legacy_user_id`
-- n'est rempli nulle part — mais il suffira qu'un auteur réclame son
-- ancien compte pour que la jointure devienne possible.
--
-- Les règles d'accès de Postgres portent sur les lignes, pas sur les
-- colonnes : on réserve donc la table à l'administration, et l'auteur
-- passe par une fonction qui ne lui rend que ce qui le regarde.
-- =====================================================================

drop policy if exists "fiches héritées réservées à l'auteur et à l'admin"
  on public.legacy_reading_reports;

create policy "fiches héritées réservées à l'administration"
  on public.legacy_reading_reports for select
  using (public.is_admin());

create or replace function public.get_legacy_reading_reports(p_project_id uuid)
returns table (
  legacy_review_id integer,
  content text,
  final_mark smallint,
  wfg_review text,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.legacy_review_id, r.content, r.final_mark, r.wfg_review, r.read_at
  from public.legacy_reading_reports r
  join public.projects p on p.id = r.project_id
  where r.project_id = p_project_id
    and (p.owner_id = auth.uid() or public.is_admin())
  order by r.read_at desc nulls last;
$$;

grant execute on function public.get_legacy_reading_reports(uuid) to authenticated;
