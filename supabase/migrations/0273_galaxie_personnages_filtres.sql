-- =====================================================================
-- La recherche avancée des personnages (13/11/2026, Sarah : « il faut un
-- filtre avancé ici, dans galaxie »). Quatre familles, toutes facultatives,
-- qui s'ajoutent aux règles de la Galaxie de Personnages (0123) :
--
--   p_role         'homme' ou 'femme'                       (characters.gender)
--   p_age          'enfant', 'adolescent', 'adulte', 'senior' (age_range)
--   p_importance   'principal' ou 'secondaire'              (character_type)
--   p_comedypitch  'attendu' ou 'disponible'
--
-- ComedyPitch, mêmes règles que le dépôt (src/lib/comedypitch.ts, 0261) :
--   disponible  au moins un ComedyPitch en ligne (dépôt validé) ;
--   attendu     aucun en ligne, et le personnage peut en recevoir un :
--               auteur adhérent et description d'au moins 300 caractères,
--               ou projet CinéCrush de la semaine et une description.
-- Un comédien qui suit « attendu » doit pouvoir déposer : pas de fausse
-- invitation.
-- =====================================================================

drop function if exists public.galaxie_personnages(integer, integer);

create or replace function public.galaxie_personnages(
  p_limite integer default 60,
  p_decalage integer default 0,
  p_role text default null,
  p_age text default null,
  p_importance text default null,
  p_comedypitch text default null
)
returns table(id uuid, total bigint)
language sql
stable security definer
set search_path to 'public'
as $$
  select c.id, count(*) over () as total
  from public.characters c
  join public.projects p on p.id = c.project_id
  where auth.uid() is not null
    and p.is_public
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
    and (p_role is null or c.gender = p_role)
    and (p_age is null or c.age_range::text = p_age)
    and (p_importance is null or c.character_type::text = p_importance)
    and (
      p_comedypitch is null
      or (
        p_comedypitch = 'disponible'
        and exists (
          select 1 from public.videopitch_depots d
          where d.personnage_id = c.id and d.genre = 'comedypitch' and d.etat = 'valide'
        )
      )
      or (
        p_comedypitch = 'attendu'
        and not exists (
          select 1 from public.videopitch_depots d
          where d.personnage_id = c.id and d.genre = 'comedypitch' and d.etat = 'valide'
        )
        and (
          (
            exists (
              select 1 from public.cinecrush k
              where k.project_id = p.id and k.semaine = public.dimanche_de_la_semaine()
            )
            and length(btrim(coalesce(c.biography, ''))) > 0
          )
          or (
            public.a_une_adhesion_active(p.owner_id)
            and length(btrim(coalesce(c.biography, ''))) >= 300
          )
        )
      )
    )
  order by (c.photo_path is not null) desc, md5(c.id::text || current_date::text)
  limit greatest(p_limite, 0) offset greatest(p_decalage, 0);
$$;

revoke all on function public.galaxie_personnages(integer, integer, text, text, text, text) from public, anon;
grant execute on function public.galaxie_personnages(integer, integer, text, text, text, text) to authenticated, service_role;
