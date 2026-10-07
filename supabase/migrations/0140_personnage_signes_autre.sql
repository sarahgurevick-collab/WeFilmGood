-- Un champ libre à côté des signes à cocher (07/10/2026, demande de Sarah).
alter table public.characters add column if not exists signes_autre text;
notify pgrst, 'reload schema';
