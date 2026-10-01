-- Suivi des portraits proposés par la plateforme (01/10/2026).
--
-- Une ligne par personnage passé dans l'opération « un portrait pour les
-- personnages sans photo » (200 à 300 par jour) : l'avis porté sur le
-- portrait retenu (bon, moyen) ou l'absence de portrait convenable (rien),
-- et l'image d'origine — une même photo ne doit pas servir deux fois.
-- Sert aussi à ne pas repasser sur un personnage déjà traité, et à dresser
-- pour Sarah la fiche des « moyens » et des « sans portrait » de chaque lot.
create table if not exists public.portraits_suivi (
  character_id uuid primary key references public.characters(id) on delete cascade,
  lot text not null,
  avis text not null check (avis in ('bon', 'moyen', 'rien')),
  note text,
  requete text,
  source text,
  source_id text,
  traite_le timestamptz not null default now()
);

create index if not exists portraits_suivi_source_idx on public.portraits_suivi (source, source_id);
create index if not exists portraits_suivi_lot_idx on public.portraits_suivi (lot);

-- Réservé au serveur (clé de service) : aucune règle d'accès.
alter table public.portraits_suivi enable row level security;

notify pgrst, 'reload schema';
