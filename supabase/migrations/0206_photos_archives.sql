-- Les photos des pages Facebook (Maison des Scénaristes, WeFilmGood),
-- copiées sur le serveur depuis l'export officiel de Facebook (24/10/2026).
-- Le disque dur de Sarah est perdu : c'est la copie de sauvegarde, et
-- Sarah coche celles qui pourront aller sur le site. Rien n'est public :
-- seule l'administration lit et écrit, le site lira les photos cochées
-- par le serveur.

insert into storage.buckets (id, name, public)
values ('photos-archives', 'photos-archives', false)
on conflict (id) do nothing;

create policy "photos-archives : administration"
  on storage.objects for all
  using (bucket_id = 'photos-archives' and public.is_admin())
  with check (bucket_id = 'photos-archives' and public.is_admin());

create table if not exists public.photos_archives (
  id uuid primary key default gen_random_uuid(),
  -- La page Facebook d'origine.
  source text not null check (source in ('mds', 'wefilmgood')),
  album text not null,
  album_description text,
  -- Date de la photo sur Facebook (publication), et de l'album.
  prise_le timestamptz,
  album_le timestamptz,
  legende text,
  -- Chemin dans l'export Facebook : sert à ne jamais importer deux fois.
  chemin_export text not null,
  -- Dans le bucket photos-archives : l'image en grand et sa vignette.
  chemin text not null,
  chemin_vignette text not null,
  largeur int,
  hauteur int,
  -- Cochée par Sarah : peut aller en ligne.
  en_ligne boolean not null default false,
  coche_le timestamptz,
  importe_le timestamptz not null default now(),
  unique (source, chemin_export)
);
create index if not exists photos_archives_par_album on public.photos_archives (source, album_le, album, prise_le);
create index if not exists photos_archives_en_ligne on public.photos_archives (en_ligne) where en_ligne;
comment on table public.photos_archives is 'Photos copiées depuis les exports Facebook des pages MdS et WeFilmGood ; en_ligne = cochée par Sarah (24/10/2026).';

alter table public.photos_archives enable row level security;
create policy "photos_archives : administration" on public.photos_archives
  for all using (public.is_admin()) with check (public.is_admin());
