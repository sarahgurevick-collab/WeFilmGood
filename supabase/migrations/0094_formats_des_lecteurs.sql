-- Les formats qu'un lecteur peut lire (27/09/2026, demande de Sarah) :
-- long métrage, court métrage, série, VR/360. Tous par défaut (NULL). Un
-- lecteur dont toutes les cases sont décochées reste lecteur, mais ne
-- reçoit plus de projet : il n'apparaît plus dans l'assignation. Rien ne
-- lui est signalé.
alter table public.reader_profiles add column if not exists formats text[];
comment on column public.reader_profiles.formats is
  'Formats (project_format) que le lecteur peut lire. NULL = tous ; {} = aucun (plus de projet proposé).';
