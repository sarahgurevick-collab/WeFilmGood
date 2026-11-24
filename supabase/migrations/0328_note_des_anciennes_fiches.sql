-- =====================================================================
-- La note de l'auteur sur les anciennes fiches de WFG 1 (24/11/2026,
-- Sarah) : « Sur les fiches de lecture anciennes, de WFG 1, qui n'ont pas
-- de note, tu peux mettre le nouveau système de notation. Ne pas mettre
-- le rappel. Si l'auteur va voir sa fiche et souhaite mettre une note car
-- il avait oublié, c'est bien. Sinon, pas d'importance. C'est ancien. »
--
-- Une ancienne fiche jamais notée sur WFG 1 (author_rating à 0) peut
-- recevoir la note de l'auteur. Elle est rangée dans author_rating, sur
-- l'échelle de WFG 1 (cinq étoiles) pour que tous les écrans existants
-- (lecteur, administration) la lisent sans changement : rouge → 1,
-- jaune → 3, bleu → 4, vert → 5. note_auteur_le dit qu'elle a été donnée
-- sur WFG 2. Aucun rappel pour ces fiches.
-- =====================================================================

alter table public.legacy_reading_reports
  add column if not exists note_auteur_le timestamptz;

comment on column public.legacy_reading_reports.note_auteur_le is
  'Quand l''auteur a noté cette ancienne fiche sur WFG 2 (vide : note venue de WFG 1, ou pas de note).';

-- La note de WFG 1 accompagne désormais la fiche rendue à l'auteur.
drop function if exists public.get_legacy_reading_reports(uuid);
create function public.get_legacy_reading_reports(p_project_id uuid)
returns table (
  legacy_review_id integer,
  content          text,
  final_mark       smallint,
  wfg_review       text,
  read_at          timestamptz,
  author_rating    smallint
)
language sql
stable
security definer
set search_path = public
as $$
  select r.legacy_review_id, r.content, r.final_mark, r.wfg_review, r.read_at, r.author_rating
  from public.legacy_reading_reports r
  join public.projects p on p.id = r.project_id
  where r.project_id = p_project_id
    and ((r.statut = 2 and p.owner_id = auth.uid()) or public.is_admin())
  order by r.read_at desc nulls last;
$$;

revoke all on function public.get_legacy_reading_reports(uuid) from public, anon;
grant execute on function public.get_legacy_reading_reports(uuid) to authenticated;

-- L'auteur note une ancienne fiche, de 1 (rouge) à 4 (vert). Une fiche
-- déjà notée ne change pas.
create or replace function public.noter_ancienne_fiche(p_legacy_review_id integer, p_position integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.legacy_reading_reports r
  set author_rating = case when p_position = 1 then 1 else p_position + 1 end,
      note_auteur_le = now()
  from public.projects pr
  where r.legacy_review_id = p_legacy_review_id
    and pr.id = r.project_id
    and pr.owner_id = auth.uid()
    and r.statut = 2
    and coalesce(r.author_rating, 0) = 0
    and p_position between 1 and 4;
$$;

revoke all on function public.noter_ancienne_fiche(integer, integer) from public, anon;
grant execute on function public.noter_ancienne_fiche(integer, integer) to authenticated;
