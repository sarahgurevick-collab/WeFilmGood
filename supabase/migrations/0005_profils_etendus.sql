-- =====================================================================
-- Extension des profils : coordonnées privées, voyant lecteur, langues,
-- réseaux sociaux, festivals, témoignage, et quiz de personnalité.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Coordonnées et informations privées — visibles uniquement par le
--    titulaire du profil et l'administrateur.
--    NB : city/country restent sur public.profiles, publics comme
--    aujourd'hui (décision explicite : pas de rupture sur l'existant).
-- ---------------------------------------------------------------------
create table if not exists public.profile_private_details (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  address     text,
  postal_code text,
  phone       text,
  birthdate   date,
  gender      text check (gender in ('homme', 'femme', 'autre')),
  updated_at  timestamptz not null default now()
);

alter table public.profile_private_details enable row level security;

drop policy if exists "coordonnées privées réservées au titulaire et à l'admin" on public.profile_private_details;
create policy "coordonnées privées réservées au titulaire et à l'admin"
  on public.profile_private_details for all
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());


-- ---------------------------------------------------------------------
-- 1bis. Coordonnées de contact — visibles par le titulaire, l'admin, et
--       tout profil ayant débloqué le contact via une adhésion active
--       (cf. migration 0009_adhesions.sql qui étend cette policy).
--       Distinct de profile_private_details : ce sont les coordonnées
--       que le titulaire ACCEPTE de partager une fois débloqué, pas les
--       informations administratives obligatoires.
-- ---------------------------------------------------------------------
create table if not exists public.profile_contact_info (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email      text,
  phone      text,
  updated_at timestamptz not null default now()
);

alter table public.profile_contact_info enable row level security;

drop policy if exists "contact visible par le titulaire et l'admin" on public.profile_contact_info;
create policy "contact visible par le titulaire et l'admin"
  on public.profile_contact_info for select
  using (auth.uid() = profile_id or public.is_admin());

drop policy if exists "chacun gère ses coordonnées de contact" on public.profile_contact_info;
create policy "chacun gère ses coordonnées de contact"
  on public.profile_contact_info for insert
  with check (auth.uid() = profile_id);

drop policy if exists "chacun met à jour ses coordonnées de contact" on public.profile_contact_info;
create policy "chacun met à jour ses coordonnées de contact"
  on public.profile_contact_info for update
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);


-- ---------------------------------------------------------------------
-- 2. Voyant de disponibilité du lecteur (vert/orange/rouge).
-- ---------------------------------------------------------------------
create table if not exists public.reader_profiles (
  profile_id         uuid primary key references public.profiles(id) on delete cascade,
  availability_status text not null default 'vert'
    check (availability_status in ('vert', 'orange', 'rouge')),
  updated_at         timestamptz not null default now()
);

alter table public.reader_profiles enable row level security;

drop policy if exists "voyant lecteur réservé au lecteur et à l'admin" on public.reader_profiles;
create policy "voyant lecteur réservé au lecteur et à l'admin"
  on public.reader_profiles for all
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());


-- ---------------------------------------------------------------------
-- 3. Langues parlées — mot-clé de recherche <CM+>.
-- ---------------------------------------------------------------------
create table if not exists public.languages (
  code     text primary key,
  label_fr text not null,
  label_en text not null,
  position int  not null default 0
);

insert into public.languages (code, label_fr, label_en, position) values
  ('fr', 'Français', 'French',     1),
  ('en', 'Anglais',  'English',    2),
  ('es', 'Espagnol', 'Spanish',    3),
  ('de', 'Allemand', 'German',     4),
  ('it', 'Italien',  'Italian',    5),
  ('pt', 'Portugais','Portuguese', 6),
  ('ru', 'Russe',    'Russian',    7),
  ('zh', 'Chinois',  'Chinese',    8),
  ('ja', 'Japonais', 'Japanese',   9)
on conflict (code) do nothing;

alter table public.languages enable row level security;

drop policy if exists "langues lisibles par tous" on public.languages;
create policy "langues lisibles par tous"
  on public.languages for select using (true);

create table if not exists public.profile_languages (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  language_code text not null references public.languages(code) on delete cascade,
  primary key (profile_id, language_code)
);

alter table public.profile_languages enable row level security;

drop policy if exists "langues de profil lisibles par tous" on public.profile_languages;
create policy "langues de profil lisibles par tous"
  on public.profile_languages for select using (true);

drop policy if exists "chacun gère ses langues" on public.profile_languages;
create policy "chacun gère ses langues"
  on public.profile_languages for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);


-- ---------------------------------------------------------------------
-- 4. Métiers complémentaires utilisés comme mots-clés de recherche
--    (non proposés à l'inscription, is_public = false).
-- ---------------------------------------------------------------------
insert into public.roles (slug, label_fr, label_en, position, is_public) values
  ('agent',              'Agent',              'Agent',              90, false),
  ('diffuseur',          'Diffuseur',          'Broadcaster',        91, false),
  ('talonneur_truquiste','Talonneur truquiste','Rigging specialist', 92, false)
on conflict (slug) do update set is_public = excluded.is_public;


-- ---------------------------------------------------------------------
-- 5. Réseaux sociaux — visibles par les profils connectés uniquement.
-- ---------------------------------------------------------------------
create table if not exists public.profile_social_links (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  network    text not null check (network in ('vimeo', 'linkedin', 'viadeo', 'instagram')),
  url        text not null,
  primary key (profile_id, network)
);

alter table public.profile_social_links enable row level security;

drop policy if exists "réseaux sociaux visibles par les connectés" on public.profile_social_links;
create policy "réseaux sociaux visibles par les connectés"
  on public.profile_social_links for select using (auth.uid() is not null);

drop policy if exists "chacun gère ses réseaux sociaux" on public.profile_social_links;
create policy "chacun gère ses réseaux sociaux"
  on public.profile_social_links for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);


-- ---------------------------------------------------------------------
-- 6. Présence en festival.
-- ---------------------------------------------------------------------
create table if not exists public.profile_festivals (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  festival_name text not null,
  year         int,
  project_id   uuid references public.projects(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

alter table public.profile_festivals enable row level security;

drop policy if exists "festivals visibles par les connectés" on public.profile_festivals;
create policy "festivals visibles par les connectés"
  on public.profile_festivals for select using (auth.uid() is not null);

drop policy if exists "chacun gère ses festivals" on public.profile_festivals;
create policy "chacun gère ses festivals"
  on public.profile_festivals for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);


-- ---------------------------------------------------------------------
-- 7. Biofilmo, agent, témoignage.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists biofilmo text;
alter table public.profiles add column if not exists agent_name text;
alter table public.profiles add column if not exists testimonial text;
alter table public.profiles add column if not exists testimonial_is_public boolean not null default false;


-- ---------------------------------------------------------------------
-- 8. Quiz de personnalité ("Si j'étais... je serais").
--    Catalogue de questions/options admin-editable + réponses en JSONB
--    sur le profil (pas de table de réponses normalisée : ce sont des
--    données d'affichage, aucun besoin de filtrage croisé identifié).
-- ---------------------------------------------------------------------
create table if not exists public.personality_questions (
  key      text primary key,
  label_fr text not null,
  kind     text not null check (kind in ('choix', 'libre')),
  position int  not null default 0
);

create table if not exists public.personality_options (
  question_key text not null references public.personality_questions(key) on delete cascade,
  option_slug  text not null,
  label_fr     text not null,
  position     int  not null default 0,
  primary key (question_key, option_slug)
);

alter table public.personality_questions enable row level security;
alter table public.personality_options   enable row level security;

drop policy if exists "questions de personnalité lisibles par tous" on public.personality_questions;
create policy "questions de personnalité lisibles par tous"
  on public.personality_questions for select using (true);

drop policy if exists "options de personnalité lisibles par tous" on public.personality_options;
create policy "options de personnalité lisibles par tous"
  on public.personality_options for select using (true);

insert into public.personality_questions (key, label_fr, kind, position) values
  ('cinema',            'Si j''étais le cinéma, je serais…',              'choix', 1),
  ('film_nationalite',  'Si j''étais un film, je serais…',                'choix', 2),
  ('film_prefere',      'Si j''étais mon film préféré, je serais…',       'choix', 3),
  ('serie',             'Si j''étais une série, je serais…',              'choix', 4),
  ('personnage_film',   'Si j''étais un personnage de film, je serais…',  'choix', 5),
  ('acteur',            'Si j''étais un acteur, je serais…',              'choix', 6),
  ('actrice',           'Si j''étais une actrice, je serais…',            'choix', 7),
  ('producteur',        'Si j''étais un producteur/productrice, je serais…', 'choix', 8),
  ('livre',             'Si j''étais un livre, je serais…',               'choix', 9),
  ('piece_theatre',     'Si j''étais une pièce de théâtre, je serais…',   'choix', 10),
  ('musique',           'Si j''étais une musique, je serais…',            'choix', 11),
  ('instrument',        'Si j''étais un instrument de musique, je serais…', 'choix', 12),
  ('peintre',           'Si j''étais un peintre, je serais…',             'choix', 13),
  ('evenement_historique','Si j''étais un événement historique, je serais…', 'choix', 14),
  ('ville',             'Si j''étais une ville, je serais…',              'choix', 15),
  ('sport',             'Si j''étais un sport, je serais…',               'choix', 16),
  ('sens',              'Si j''étais un sens, je serais…',                'choix', 17),
  ('alcool',            'Si j''étais un alcool, je serais…',              'choix', 18),
  ('plat',              'Si j''étais un plat, je serais…',                'choix', 19),
  ('diner_ideal',       'Si je devais dîner avec l''hôte idéal, ce serait…', 'libre', 20)
on conflict (key) do nothing;

insert into public.personality_options (question_key, option_slug, label_fr, position) values
  ('cinema', '360',        'En 360',          1),
  ('cinema', '3d',         'En 3D',           2),
  ('cinema', 'imax',       'En IMAX',         3),
  ('cinema', 'cinemascope','En Cinémascope',  4),
  ('cinema', 'muet',       'En Muet',         5),
  ('cinema', 'odorama',    'En Odorama',      6),

  ('film_nationalite', 'africain',            'Un film africain',                   1),
  ('film_nationalite', 'blockbuster_us',      'Un blockbuster américain',           2),
  ('film_nationalite', 'independant_us',      'Un film indépendant américain',      3),
  ('film_nationalite', 'asiatique',           'Un film asiatique',                  4),
  ('film_nationalite', 'europeen',            'Un film européen',                   5),
  ('film_nationalite', 'indien',              'Un film indien',                     6),
  ('film_nationalite', 'mediterraneen',       'Un film méditerranéen',              7),
  ('film_nationalite', 'nordique',            'Un film nordique',                   8),
  ('film_nationalite', 'oceanien',            'Un film océanien',                   9),
  ('film_nationalite', 'sud_americain',       'Un film sud-américain',             10),

  ('film_prefere', 'cite_de_dieu',      'La Cité de Dieu — Fernando Meirelles / Kátia Lund (2001)', 1),
  ('film_prefere', 'cleo_5_a_7',        'Cléo de 5 à 7 — Agnès Varda (1962)',                        2),
  ('film_prefere', 'devdas',            'Devdas — Sanjay Leela Bhansali (2002)',                     3),
  ('film_prefere', 'il_etait_une_fois_ouest', 'Il était une fois dans l''Ouest — Sergio Leone (1969)', 4),
  ('film_prefere', 'dictateur',         'Le dictateur — Charlie Chaplin (1940)',                     5),
  ('film_prefere', 'empire_des_sens',   'L''Empire des Sens — Nagisa Oshima (1976)',                 6),
  ('film_prefere', 'point_break',       'Point Break — Kathryn Bigelow (1991)',                      7),
  ('film_prefere', 'septieme_sceau',    'Le Septième Sceau — Ingmar Bergman (1957)',                 8),
  ('film_prefere', 'stalker',           'Stalker — Andrei Tarkovski (1979)',                         9),
  ('film_prefere', 'vers_la_lumiere',   'Vers la Lumière — Naomi Kawase (2017)',                    10),

  ('serie', 'bron',            'Bron — Hans Rosenfeldt',                                     1),
  ('serie', 'dr_who',          'Dr Who — Sydney Newman / Donald Wilson',                     2),
  ('serie', 'casa_de_papel',   'La Casa de Papel — Alex Pina',                               3),
  ('serie', 'gomorra',         'Gomorra — Stefano Sollima',                                  4),
  ('serie', 'princess_agents', 'Princess Agents — Yang Tao / Chen Lan',                      5),
  ('serie', 'the_killing',     'The Killing — Veena Sud',                                    6),
  ('serie', 'sopranos',        'The Sopranos — David Chase',                                 7),
  ('serie', 'treve',           'La Trêve — Stéphane Bergmans / Benjamin d''Aoust / Matthieu Donck', 8),
  ('serie', 'village_francais','Un Village Français — Frédéric Krivine',                     9),
  ('serie', 'vikings',         'Vikings — Michael Hirst',                                   10),

  ('personnage_film', 'amelie_poulain',  'Amélie Poulain — Le Fabuleux destin d''Amélie Poulain', 1),
  ('personnage_film', 'forrest_gump',    'Forrest Gump — Forrest Gump',                           2),
  ('personnage_film', 'hannibal_lecter', 'Hannibal Lecter — Le silence des agneaux',              3),
  ('personnage_film', 'harry_callahan',  'Harry Callahan — L''Inspecteur Harry',                  4),
  ('personnage_film', 'ellen_ripley',    'Lieutenant Ellen Ripley — Alien',                       5),
  ('personnage_film', 'louise',          'Louise — Thelma et Louise',                             6),
  ('personnage_film', 'mary_poppins',    'Mary Poppins — Mary Poppins',                           7),
  ('personnage_film', 'rocky_balboa',    'Rocky Balboa — Rocky',                                  8),
  ('personnage_film', 'sarah_connor',    'Sarah Connor — Terminator',                             9),
  ('personnage_film', 'vito_corleone',   'Vito Corleone — Le Parrain',                           10),

  ('acteur', 'antonio_banderas',    'Antonio Banderas',    1),
  ('acteur', 'bruno_ganz',          'Bruno Ganz',          2),
  ('acteur', 'gary_oldman',         'Gary Oldman',         3),
  ('acteur', 'jean_gabin',          'Jean Gabin',          4),
  ('acteur', 'javier_bardem',       'Javier Bardem',       5),
  ('acteur', 'jet_li',              'Jet Li',              6),
  ('acteur', 'klaus_kinski',        'Klaus Kinski',        7),
  ('acteur', 'marcello_mastroianni','Marcello Mastroianni',8),
  ('acteur', 'robert_de_niro',      'Robert de Niro',      9),
  ('acteur', 'shahrukh_khan',       'Shahrukh Khan',      10),

  ('actrice', 'aishwarya_rai',    'Aishwarya Rai',     1),
  ('actrice', 'audrey_hepburn',   'Audrey Hepburn',    2),
  ('actrice', 'charlize_theron',  'Charlize Theron',   3),
  ('actrice', 'gong_li',          'Gong Li',           4),
  ('actrice', 'isabelle_huppert', 'Isabelle Huppert',  5),
  ('actrice', 'jennifer_lawrence','Jennifer Lawrence', 6),
  ('actrice', 'meryl_streep',     'Meryl Streep',      7),
  ('actrice', 'noomi_rapace',     'Noomi Rapace',      8),
  ('actrice', 'nathalie_portman', 'Nathalie Portman',  9),
  ('actrice', 'penelope_cruz',    'Penelope Cruz',    10),

  ('producteur', 'alice_guy',              'Alice Guy',                1),
  ('producteur', 'anne_dominique_toussaint','Anne-Dominique Toussaint',2),
  ('producteur', 'franco_zefereli',        'Franco Zefereli',          3),
  ('producteur', 'jane_campion',           'Jane Campion',             4),
  ('producteur', 'leon_gaumont',           'Léon Gaumont',             5),
  ('producteur', 'luc_besson',             'Luc Besson',               6),
  ('producteur', 'oprah_winfrey',          'Oprah Winfrey',            7),
  ('producteur', 'shahrukh_khan',          'Shahrukh Khan',            8),
  ('producteur', 'walt_disney',            'Walt Disney',              9),
  ('producteur', 'whoopi_goldberg',        'Whoopi Goldberg',         10),

  ('livre', '1984',              '1984 — George Orwell',                                     1),
  ('livre', 'vingt_quatre_heures','Vingt-quatre heures de la vie d''une femme — Stephan Zweig',2),
  ('livre', 'guerre_et_paix',    'Guerre et Paix — Léon Tolstoï',                             3),
  ('livre', 'harry_potter',      'Harry Potter à L''École des Sorciers — J. Rowling',         4),
  ('livre', 'amant',             'L''Amant — Marguerite Duras',                               5),
  ('livre', 'appel_de_cthulhu',  'L''Appel de Cthulhu — Howard Phillips Lovecraft',           6),
  ('livre', 'appel_de_la_foret', 'L''appel de la forêt — Jack London',                        7),
  ('livre', 'peregrination_ouest','La Pérégrination vers l''Ouest — Wu Cheng''en',            8),
  ('livre', 'nom_de_la_rose',    'Le nom de la rose — Umberto Eco',                           9),
  ('livre', 'dix_petits_negres', 'Dix petits nègres — Agatha Christie',                      10),
  ('livre', 'chambre_a_soi',     'Une chambre à soi — Virginia Woolf',                       11),

  ('piece_theatre', '448_psychose',    '4:48 Psychose — Sarah Kane',                        1),
  ('piece_theatre', 'art',             'Art — Yasmina Reza',                                 2),
  ('piece_theatre', 'attendant_godot', 'En Attendant Godot — Samuel Beckett',                3),
  ('piece_theatre', 'mort_commis_voyageur', 'La Mort d''Un Commis Voyageur — Arthur Miller',  4),
  ('piece_theatre', 'opera_de_quatsous','L''Opéra de Quat''sous — Brecht',                   5),
  ('piece_theatre', 'oedipe',          'Oedipe — Sophocle',                                  6),
  ('piece_theatre', 'on_ne_badine_pas','On ne badine pas avec l''amour — Alfred de Musset',  7),
  ('piece_theatre', 'othello',         'Othello — Shakespeare',                              8),
  ('piece_theatre', 'tramway_nomme_desir','Un Tramway Nommé Désir — Tennessee Williams',     9),
  ('piece_theatre', 'tartuffe',        'Tartuffe — Molière',                                10),

  ('musique', 'monde',        'Musique du Monde', 1),
  ('musique', 'classique',    'Musique Classique',2),
  ('musique', 'film',         'Musique de film',  3),
  ('musique', 'jazz',         'Jazz',             4),
  ('musique', 'rock',         'Rock',             5),
  ('musique', 'hip_hop',      'Hip Hop',          6),
  ('musique', 'zouk',         'Zouk',             7),
  ('musique', 'metal',        'Metal',            8),
  ('musique', 'rap',          'Rap',              9),
  ('musique', 'techno',       'Techno',          10),

  ('instrument', 'violon',       'Violon',              1),
  ('instrument', 'cornemuse',    'Cornemuse',           2),
  ('instrument', 'guitare',      'Guitare',             3),
  ('instrument', 'harpe',        'Harpe',               4),
  ('instrument', 'clavecin',     'Clavecin',            5),
  ('instrument', 'piano',        'Piano / Synthétiseur',6),
  ('instrument', 'flute',        'Flûte',               7),
  ('instrument', 'saxophone',    'Saxophone',           8),
  ('instrument', 'batterie',     'Batterie',            9),
  ('instrument', 'accordeon',    'Accordéon',          10),

  ('peintre', 'magritte',        'Magritte',            1),
  ('peintre', 'hopper',          'Hopper',              2),
  ('peintre', 'michel_ange',     'Michel-Ange',         3),
  ('peintre', 'yokusai',         'Yokusai',             4),
  ('peintre', 'monet',           'Monet',               5),
  ('peintre', 'frida_kahlo',     'Frida Kahlo',         6),
  ('peintre', 'sonia_delaunay',  'Sonia Delaunay',      7),
  ('peintre', 'sarah_maple',     'Sarah Maple',         8),
  ('peintre', 'niki_de_saint_phalle','Niki de Saint Phalle', 9),
  ('peintre', 'tamara_de_lempicka','Tamara de Lempicka',10),

  ('evenement_historique', 'st_barthelemy',        'La St Barthélemy',                             1),
  ('evenement_historique', 'chute_empire_romain',  'La Chute de l''Empire Romain',                 2),
  ('evenement_historique', 'declaration_independance_usa', 'La Déclaration d''Indépendance des USA', 3),
  ('evenement_historique', 'revolution_francaise', 'La Révolution Française',                      4),
  ('evenement_historique', 'revolution_industrielle','La Révolution Industrielle',                 5),
  ('evenement_historique', 'chute_mur_berlin',     'La Chute du Mur de Berlin',                    6),
  ('evenement_historique', 'construction_europeenne','La Construction Européenne',                 7),
  ('evenement_historique', 'revolution_oeillets',  'La Révolution des oeillets',                   8),
  ('evenement_historique', 'declaration_independance_inde', 'La Déclaration d''Indépendance de l''Inde', 9),
  ('evenement_historique', 'revolution_chinoise',  'La Révolution Chinoise de Mao',               10),

  ('ville', 'new_york',   'New York',   1),
  ('ville', 'paris',      'Paris',      2),
  ('ville', 'londres',    'Londres',    3),
  ('ville', 'dubai',      'Dubai',      4),
  ('ville', 'sydney',     'Sydney',     5),
  ('ville', 'singapour',  'Singapour',  6),
  ('ville', 'madrid',     'Madrid',     7),
  ('ville', 'bangkok',    'Bangkok',    8),
  ('ville', 'istambul',   'Istambul',   9),
  ('ville', 'kuala_lumpur','Kuala Lumpur', 10),

  ('sport', 'rugby',      'Rugby',       1),
  ('sport', 'basket',     'Basket-Ball', 2),
  ('sport', 'boxe',       'Boxe',        3),
  ('sport', 'natation',   'Natation',    4),
  ('sport', 'velo',       'Vélo',        5),
  ('sport', 'hockey',     'Hockey',      6),
  ('sport', 'surf',       'Surf',        7),

  ('sens', 'gout',              'Goût',              1),
  ('sens', 'odorat',            'Odorat',            2),
  ('sens', 'ouie',              'Ouïe',              3),
  ('sens', 'equilibre',         'Sens de l''équilibre', 4),
  ('sens', 'toucher',           'Toucher',           5),
  ('sens', 'vue',               'Vue',               6),

  ('alcool', 'biere',      'Bière',      1),
  ('alcool', 'champagne',  'Champagne',  2),
  ('alcool', 'cidre',      'Cidre',      3),
  ('alcool', 'sake',       'Saké',       4),
  ('alcool', 'vin',        'Vin',        5),
  ('alcool', 'whisky',     'Whisky',     6),

  ('plat', 'boeuf_bourguignon', 'Boeuf Bourguignon', 1),
  ('plat', 'canard_laque',      'Canard Laqué',       2),
  ('plat', 'foie_gras',         'Foie Gras',          3),
  ('plat', 'poulet_tandoori',   'Poulet Tandoori',    4),
  ('plat', 'sushi',             'Sushi',              5),
  ('plat', 'tajine',            'Tajine',             6)
on conflict (question_key, option_slug) do nothing;

alter table public.profiles add column if not exists personality_answers jsonb not null default '{}'::jsonb;
