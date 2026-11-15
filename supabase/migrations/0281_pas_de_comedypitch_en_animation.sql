-- Pas de ComedyPitch pour les projets d'animation (15/11/2026, Sarah).
-- Le dépôt et la pastille verte sont retirés côté site
-- (src/lib/comedypitch.ts) ; ici, le filtre « Attendu » des Galaxies ne
-- propose plus leurs personnages. Les ComedyPitchs déjà en ligne restent
-- (aucun sur un projet d'animation au 15/11).

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
        -- Pas de ComedyPitch pour un projet d'animation (15/11).
        and not ('animation' = any(coalesce(p.techniques, '{}')))
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
