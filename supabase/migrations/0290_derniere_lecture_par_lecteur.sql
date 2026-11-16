-- La date de la dernière fiche de chaque lecteur, WFG 1 et WFG 2 réunis
-- (16/11/2026, Sarah : « me laisser dans les premières lignes ceux qui sont
-- actifs »). Sert à classer les lecteurs dans le menu « Attribuer lecteur »
-- des projets en attente. Réservée à l'administration.
create or replace function public.derniere_lecture_par_lecteur()
returns table (profile_id uuid, derniere timestamptz)
language sql stable security definer set search_path = public as $$
  select x.pid, max(x.d)
  from (
    select r.reader_id as pid, r.submitted_at as d from public.reading_reports r
    union all
    select p.id, l.read_at
    from public.legacy_reading_reports l
    join public.profiles p on p.legacy_user_id = l.reader_legacy_id
    where l.statut <> 0
  ) x
  where public.is_admin()
  group by x.pid;
$$;
revoke all on function public.derniere_lecture_par_lecteur() from public, anon;
grant execute on function public.derniere_lecture_par_lecteur() to authenticated;
