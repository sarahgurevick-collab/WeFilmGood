-- =====================================================================
-- Les videopitchs, repris de WeFilmGood 1.
--
-- Hébergés sur Vimeo en marque blanche, comme les masterclass : on ne
-- garde que le numéro de la vidéo, le lecteur Vimeo fait le reste.
-- Un projet peut en avoir deux — un en français, un en anglais — et la
-- fiche projet propose alors de passer de l'un à l'autre.
--
-- La pitchothèque en tient compte : un projet sans videopitch descend
-- tout en bas (voir 0050).
-- =====================================================================

alter table public.projects add column if not exists videopitch_fr text;
alter table public.projects add column if not exists videopitch_en text;

comment on column public.projects.videopitch_fr is
  'Numéro Vimeo du videopitch en français (vimeo.com/<numéro>).';
comment on column public.projects.videopitch_en is
  'Numéro Vimeo du videopitch en anglais (vimeo.com/<numéro>).';

create or replace function public.pitchotheque(p_limite int default 60, p_decalage int default 0)
returns table (id uuid, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with fichiers as (
    select
      f.project_id,
      bool_or(f.kind = 'vignette') as a_vignette,
      bool_or(f.kind = 'scenario') as a_scenario
    from public.project_files f
    group by f.project_id
  ),
  notes as (
    select
      p.id,
      p.status = 'labellise' as labellise,
      (coalesce(btrim(p.videopitch_fr), '') <> ''
       or coalesce(btrim(p.videopitch_en), '') <> ''
       or coalesce(btrim(p.trailer_url), '') <> '') as a_videopitch,
      (case when coalesce(btrim(p.logline), '') <> '' then 20 else 0 end
       + case when coalesce(btrim(p.synopsis), '') <> '' then 20 else 0 end
       + case when coalesce(f.a_vignette, false) then 20 else 0 end
       + case when coalesce(f.a_scenario, false) then 20 else 0 end
       + case when p.genre_slug is not null then 10 else 0 end
       + case when p.format is not null then 10 else 0 end) as remplissage
    from public.projects p
    left join fichiers f on f.project_id = p.id
    where p.is_public
  )
  select
    n.id,
    count(*) over () as total
  from notes n
  order by
    case
      when n.labellise then 0
      when n.a_videopitch then 1
      else 2
    end,
    case
      when n.labellise then 0
      when n.remplissage >= 50 then 1
      when n.remplissage >= 30 then 2
      else 3
    end,
    md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text)
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
$$;
