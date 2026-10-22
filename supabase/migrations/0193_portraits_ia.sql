-- Portraits fabriqués par ordinateur (22/10/2026, décision de Sarah).
--
-- Pixabay signale ses images générées par IA (champ isAiGenerated). Depuis
-- le 20/10 le script les écartait ; trop de personnages restent sans
-- portrait (2 338), et ces images sont souvent crédibles. Elles sont donc
-- de nouveau acceptées, mais marquées : l'écran Portraits de l'admin les
-- montre dans un onglet à part, où Sarah les passe une par une — « Garder »
-- (ia_vue_le posé) ou « Retirer ». L'auteur ne voit rien de particulier :
-- toujours « Proposée par WeFilmGood », remplaçable.

alter table public.portraits_suivi add column if not exists ia boolean not null default false;
alter table public.portraits_suivi add column if not exists ia_vue_le timestamptz;

comment on column public.portraits_suivi.ia is 'Image signalée comme générée par ordinateur par sa source (Pixabay isAiGenerated).';
comment on column public.portraits_suivi.ia_vue_le is 'Sarah a regardé ce portrait fabriqué et l''a gardé.';

create index if not exists portraits_suivi_ia_idx on public.portraits_suivi (ia) where ia and ia_vue_le is null;
