-- =====================================================================
-- Le lien de partage devient court et reconnaissable.
--
-- Avant : /projets/partage/3f2a9c14-8b7e-4d21-95c6-0e5a1d7b8c93
-- Après : /p/les-bannis-k7m3xq2a
--
-- Le titre permet à l'auteur de reconnaître le projet dans un e-mail —
-- d'autant que 107 titres sont en double sur la plateforme, et que le
-- suffixe les distingue.
--
-- Ce suffixe n'est pas un numéro de série : ce lien est la SEULE
-- protection du projet (qui l'a peut lire), donc une suite prévisible
-- s'énumérerait au script. Huit caractères tirés au hasard dans un
-- alphabet de 31 signes donnent environ 850 milliards de possibilités.
--
-- L'alphabet écarte les caractères qu'on confond en lisant ou en
-- dictant : ni 0/O, ni 1/l/i.
-- =====================================================================

create extension if not exists unaccent;

alter table public.projects add column if not exists share_code text;

create unique index if not exists projects_share_code_key
  on public.projects (share_code) where share_code is not null;

-- Le titre réduit à une suite de mots lisibles dans une URL.
create or replace function public.slug_titre(p_titre text)
returns text
language sql
immutable
as $$
  -- Un titre long est raccourci au dernier mot entier : mieux vaut
  -- « les-enquetes-stupides-de-chou-et » que « …-paimpon ».
  with brut as (
    select trim(both '-' from
      regexp_replace(lower(public.unaccent(coalesce(p_titre, ''))), '[^a-z0-9]+', '-', 'g')
    ) as s
  ), coupe as (
    select case
      when length(s) <= 40 then s
      when position('-' in left(s, 41)) = 0 then left(s, 40)
      else regexp_replace(left(s, 41), '-[a-z0-9]*$', '')
    end as s
    from brut
  )
  select coalesce(nullif(trim(both '-' from s), ''), 'projet') from coupe;
$$;

-- Postgres refuse de changer le type de retour d'une fonction existante :
-- l'ancienne rendait un uuid, la nouvelle rend le lien lisible.
drop function if exists public.set_project_share_token(uuid, boolean);

create function public.set_project_share_token(p_project_id uuid, p_actif boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  titre text;
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  suffixe text;
  candidat text;
begin
  select p.title into titre
  from public.projects p
  where p.id = p_project_id and p.owner_id = auth.uid();

  if not found then
    raise exception 'Seul le titulaire du projet peut partager ce lien';
  end if;

  if not p_actif then
    update public.projects set share_code = null where id = p_project_id;
    return null;
  end if;

  -- On retire puis on reprend : réactiver donne toujours un lien neuf,
  -- ce qui éteint définitivement celui qui aurait circulé.
  loop
    suffixe := '';
    for i in 1..8 loop
      suffixe := suffixe || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidat := public.slug_titre(titre) || '-' || suffixe;
    exit when not exists (select 1 from public.projects where share_code = candidat);
  end loop;

  update public.projects set share_code = candidat where id = p_project_id;
  return candidat;
end;
$$;

-- L'ancienne prenait un uuid, la nouvelle un code lisible : les deux
-- signatures sont retirées pour que la migration puisse être rejouée.
drop function if exists public.get_shared_project(uuid);
drop function if exists public.get_shared_project(text);

create function public.get_shared_project(p_code text)
returns table (
  id uuid, title text, logline text, format project_format, country text,
  genre_label text, labellise boolean, author_name text, vignette_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.title, p.logline, p.format, p.country,
    g.label_fr,
    p.status = 'labellise',
    auteur.full_name,
    (
      select pf.storage_path from public.project_files pf
      where pf.project_id = p.id and pf.kind = 'vignette'
      order by pf.uploaded_at desc limit 1
    )
  from public.projects p
  left join public.genres g on g.slug = p.genre_slug
  join public.profiles auteur on auteur.id = p.owner_id
  where p.share_code = p_code;
$$;

grant execute on function public.get_shared_project(text) to anon, authenticated;
grant execute on function public.set_project_share_token(uuid, boolean) to authenticated;
