-- =====================================================================
-- CinéMatch : les réponses « libres » qui sont en fait une case de la
-- liste retrouvent leur case (21/10/2026, Sarah).
--
-- Sur WFG 1 le jeu était traduit et la réponse était stockée sous le
-- libellé affiché : « En Muet » en français, « In silent movie » en
-- anglais. La reprise (migration 0047) n'a reconnu que les libellés
-- français ; les anglais, et quelques variantes françaises (« Tennesse
-- Williams » : 176 réponses !), sont tombés dans « autre: ». Deux
-- personnes ayant coché la même case ne se rapprochaient donc plus.
--
-- Ici : une table d'alias (libellé anglais ou variante → case), une
-- fonction de rattachement, un déclencheur qui l'applique à chaque
-- enregistrement (un texte libre identique à une case devient la case,
-- aussi pour l'avenir), et la correction de l'existant — après une
-- sauvegarde des réponses telles qu'elles étaient.
-- =====================================================================

-- 1. Sauvegarde, pour pouvoir revenir en arrière.
create table if not exists public.personality_answers_sauvegarde_0178 as
  select id as profile_id, personality_answers, now() as sauvegarde_le
  from public.profiles
  where personality_answers is not null and personality_answers <> '{}'::jsonb;

-- 2. Normalisation : celle de 0047, plus les tirets (— – -), les
--    apostrophes typographiques et les espaces autour des tirets.
create or replace function public.normaliser_reponse_portrait(t text)
returns text
language sql
immutable
as $$
  select trim(
           regexp_replace(
             regexp_replace(
               replace(replace(public.normaliser_reponse(t), '’', ''''), 'œ', 'oe'),
               '\s*[—–-]\s*', ' - ', 'g'),
             '\s+', ' ', 'g'));
$$;

-- 3. Les alias : libellés anglais de WFG 1 et variantes françaises.
create table if not exists public.personality_option_alias (
  question_key text not null references public.personality_questions(key) on delete cascade,
  alias        text not null,
  option_slug  text not null,
  primary key (question_key, alias),
  foreign key (question_key, option_slug) references public.personality_options(question_key, option_slug) on delete cascade
);
comment on table public.personality_option_alias is
  'CinéMatch : textes (libellé anglais de WFG 1, variante, faute) qui valent une case de la liste. alias est normalisé par normaliser_reponse_portrait.';

alter table public.personality_option_alias enable row level security;
drop policy if exists "alias lisibles par tous" on public.personality_option_alias;
create policy "alias lisibles par tous" on public.personality_option_alias for select using (true);

insert into public.personality_option_alias (question_key, alias, option_slug)
select question_key, public.normaliser_reponse_portrait(alias), option_slug
from (values
  -- 1. cinéma
  ('cinema', 'In cinemascope', 'cinemascope'), ('cinema', 'In IMAX', 'imax'), ('cinema', 'In silent movie', 'muet'),
  ('cinema', 'In 360', '360'), ('cinema', 'In 3D', '3d'), ('cinema', 'In Odorama', 'odorama'),
  -- 2. film
  ('film_nationalite', 'An European one', 'europeen'), ('film_nationalite', 'A European one', 'europeen'),
  ('film_nationalite', 'An American independent one', 'independant_us'), ('film_nationalite', 'An American blockbuster one', 'blockbuster_us'),
  ('film_nationalite', 'A Nordic one', 'nordique'), ('film_nationalite', 'An African one', 'africain'),
  ('film_nationalite', 'An Asian one', 'asiatique'), ('film_nationalite', 'A Mediterranean one', 'mediterraneen'),
  ('film_nationalite', 'An Indian one', 'indien'), ('film_nationalite', 'An Oceanian one', 'oceanien'),
  ('film_nationalite', 'A South American one', 'sud_americain'), ('film_nationalite', 'A South-American one', 'sud_americain'),
  -- 3. film préféré
  ('film_prefere', 'City of God by Fernando Meirelles / Kátia Lund (2001)', 'cite_de_dieu'),
  ('film_prefere', 'City of God - Fernando Meirelles / Kátia Lund (2001)', 'cite_de_dieu'),
  ('film_prefere', 'Once Upon a Time in A West - Sergio Leone (1969)', 'il_etait_une_fois_ouest'),
  ('film_prefere', 'Once Upon a Time in the West - Sergio Leone (1969)', 'il_etait_une_fois_ouest'),
  ('film_prefere', 'The Seventh Seal - Ingmar Bergman (1957)', 'septieme_sceau'),
  ('film_prefere', 'Le Septième Seau - Ingmar Bergman (1957)', 'septieme_sceau'),
  ('film_prefere', 'Cléo from 5 to 7 - Agnès Varda (1962)', 'cleo_5_a_7'),
  ('film_prefere', 'Cléo de 5 à 7 - Agnès Verda (1962)', 'cleo_5_a_7'),
  ('film_prefere', 'The Great Dictator - Charlie Chaplin (1940)', 'dictateur'),
  ('film_prefere', 'In the Realm of the Senses - Nagisa Oshima (1976)', 'empire_des_sens'),
  ('film_prefere', 'Radiance - Naomi Kawase (2017)', 'vers_la_lumiere'),
  -- 4. série
  ('serie', 'Gomorrah - Stefano Sollima', 'gomorra'), ('serie', 'Money Heist - Alex Pina', 'casa_de_papel'),
  -- 5. personnage
  ('personnage_film', 'Louise - Thelma and Louise', 'louise'),
  ('personnage_film', 'Hannibal Lecter - The Silence of the Lambs', 'hannibal_lecter'),
  ('personnage_film', 'Vito Corleone - The Godfather', 'vito_corleone'),
  ('personnage_film', 'Harry Callahan - Dirty Harry', 'harry_callahan'),
  ('personnage_film', 'Amélie Poulain - Amélie', 'amelie_poulain'),
  -- 8. producteur
  ('producteur', 'Franco Zeferelli', 'franco_zefereli'), ('producteur', 'Franco Zeffirelli', 'franco_zefereli'),
  -- 9. livre
  ('livre', 'The Lover - Marguerite Duras', 'amant'), ('livre', 'The Name of the Rose - Umberto Eco', 'nom_de_la_rose'),
  ('livre', 'The Call of Cthulhu - HP Lovecraft', 'appel_de_cthulhu'), ('livre', 'The Call of Cthulhu - H.P. Lovecraft', 'appel_de_cthulhu'),
  ('livre', 'War and Peace - Léon Tolstoï', 'guerre_et_paix'), ('livre', 'War and Peace - Leo Tolstoy', 'guerre_et_paix'),
  ('livre', 'Journey to West - Wu Cheng''en', 'peregrination_ouest'), ('livre', 'Journey to the West - Wu Cheng''en', 'peregrination_ouest'),
  ('livre', 'Twenty-Four Hours in the Life of a Woman - Stefan Zweig', 'vingt_quatre_heures'),
  ('livre', 'The Call of the Wild - Jack London', 'appel_de_la_foret'),
  ('livre', 'A Room of One''s Own - Virginia Woolf', 'chambre_a_soi'),
  ('livre', 'And Then There Were None - Agatha Christie', 'dix_petits_negres'),
  ('livre', 'Harry Potter and the Philosopher''s Stone - J. Rowling', 'harry_potter'),
  ('livre', 'Harry Potter and the Philosopher''s Stone - J.K. Rowling', 'harry_potter'),
  -- 10. théâtre
  ('piece_theatre', 'Waiting for Godot - Samuel Beckett', 'attendant_godot'),
  ('piece_theatre', 'Death of a Salesman - Arthur Miller', 'mort_commis_voyageur'),
  ('piece_theatre', 'A Streetcar named Desire - Tennesse Williams', 'tramway_nomme_desir'),
  ('piece_theatre', 'A Streetcar Named Desire - Tennessee Williams', 'tramway_nomme_desir'),
  ('piece_theatre', 'Un Tramway Nommé Désir - Tennesse Williams', 'tramway_nomme_desir'),
  ('piece_theatre', 'The Three-penny Opera - Bertolt Brecht', 'opera_de_quatsous'),
  ('piece_theatre', 'The Threepenny Opera - Bertolt Brecht', 'opera_de_quatsous'),
  ('piece_theatre', 'L''Opéra des Quat''sous - Brecht', 'opera_de_quatsous'),
  ('piece_theatre', 'Œdipe - Sophocle', 'oedipe'), ('piece_theatre', 'Oedipus - Sophocles', 'oedipe'),
  ('piece_theatre', 'No Trifling with Love - Alfred de Musset', 'on_ne_badine_pas'),
  ('piece_theatre', 'Tartuffe - Molière', 'tartuffe'), ('piece_theatre', '4:48 Psychosis - Sarah Kane', '448_psychose'),
  -- 11. musique
  ('musique', 'Classic', 'classique'), ('musique', 'Classical', 'classique'), ('musique', 'World Music', 'monde'),
  ('musique', 'Film Music', 'film'),
  -- 12. instrument
  ('instrument', 'Piano /Keyboard', 'piano'), ('instrument', 'Piano / Keyboard', 'piano'), ('instrument', 'Piano', 'piano'),
  ('instrument', 'Synthétiseur', 'piano'), ('instrument', 'Keyboard', 'piano'),
  ('instrument', 'Violin', 'violon'), ('instrument', 'Guitar', 'guitare'), ('instrument', 'Drums', 'batterie'),
  ('instrument', 'Harp', 'harpe'), ('instrument', 'Harpsichord', 'clavecin'), ('instrument', 'Flute', 'flute'),
  ('instrument', 'Bagpipes', 'cornemuse'), ('instrument', 'Accordion', 'accordeon'),
  -- 13. peintre
  ('peintre', 'Edward Hopper', 'hopper'), ('peintre', 'Claude Monet', 'monet'), ('peintre', 'Michelangelo', 'michel_ange'),
  ('peintre', 'Hokusai', 'yokusai'),
  -- 14. événement
  ('evenement_historique', 'The French Revolution', 'revolution_francaise'),
  ('evenement_historique', 'The Fall of the Berlin Wall', 'chute_mur_berlin'),
  ('evenement_historique', 'The European Construction', 'construction_europeenne'),
  ('evenement_historique', 'The Declaration of Independence of India', 'declaration_independance_inde'),
  ('evenement_historique', 'The Fall of the Roman Empire', 'chute_empire_romain'),
  ('evenement_historique', 'The Declaration of Independence of the USA', 'declaration_independance_usa'),
  ('evenement_historique', 'The Industrial Revolution', 'revolution_industrielle'),
  ('evenement_historique', 'The Carnation Revolution', 'revolution_oeillets'),
  ('evenement_historique', 'St Bartholomew''s Day Massacre', 'st_barthelemy'),
  ('evenement_historique', 'Mao''s Chinese Revolution', 'revolution_chinoise'),
  -- 15. ville
  ('ville', 'London', 'londres'), ('ville', 'Istanbul', 'istambul'), ('ville', 'Singapore', 'singapour'),
  -- 16. sport
  ('sport', 'Swimming', 'natation'), ('sport', 'Boxing', 'boxe'), ('sport', 'Surfing', 'surf'),
  ('sport', 'Cycling', 'velo'), ('sport', 'Basketball', 'basket'), ('sport', 'Basket', 'basket'),
  -- 17. sens
  ('sens', 'Sight', 'vue'), ('sens', 'Touch', 'toucher'), ('sens', 'Hearing', 'ouie'),
  ('sens', 'Smell', 'odorat'), ('sens', 'Sense of balance', 'equilibre'), ('sens', 'Taste', 'gout'),
  -- 18. alcool
  ('alcool', 'Wine', 'vin'), ('alcool', 'Whiskey', 'whisky'), ('alcool', 'Beer', 'biere'),
  ('alcool', 'Cider', 'cidre'), ('alcool', 'Sake', 'sake'),
  -- 19. plat
  ('plat', 'Pecking Duck', 'canard_laque'), ('plat', 'Peking Duck', 'canard_laque'),
  ('plat', 'Tandoori Chicken', 'poulet_tandoori'), ('plat', 'Beef Bourguignon', 'boeuf_bourguignon')
) as v(question_key, alias, option_slug)
on conflict (question_key, alias) do nothing;

-- 4. Rattachement d'un texte à une case : le libellé français normalisé,
--    sinon un alias. Null si ce n'est vraiment pas une case.
create or replace function public.rattacher_reponse_portrait(p_question_key text, p_texte text)
returns text
language sql
stable
as $$
  select coalesce(
    (select o.option_slug from public.personality_options o
      where o.question_key = p_question_key
        and public.normaliser_reponse_portrait(o.label_fr) = public.normaliser_reponse_portrait(p_texte)
      limit 1),
    (select a.option_slug from public.personality_option_alias a
      where a.question_key = p_question_key
        and a.alias = public.normaliser_reponse_portrait(p_texte)
      limit 1)
  );
$$;

-- 5. Le déclencheur : à chaque enregistrement, un « autre:… » qui vaut
--    une case devient la case. Vaut pour le profil, la page du Menu, et
--    les réponses d'un visiteur posées à l'arrivée par le lien magique.
create or replace function public.rattacher_reponses_portrait_trg()
returns trigger
language plpgsql
as $$
declare
  k text;
  v text;
  slug text;
  resultat jsonb := '{}'::jsonb;
begin
  if new.personality_answers is null or jsonb_typeof(new.personality_answers) <> 'object' then
    return new;
  end if;
  for k, v in select * from jsonb_each_text(new.personality_answers) loop
    if v like 'autre:%' then
      slug := public.rattacher_reponse_portrait(k, substr(v, 7));
      if slug is not null then v := slug; end if;
    end if;
    resultat := resultat || jsonb_build_object(k, v);
  end loop;
  new.personality_answers := resultat;
  return new;
end;
$$;

drop trigger if exists rattacher_reponses_portrait on public.profiles;
create trigger rattacher_reponses_portrait
  before insert or update of personality_answers on public.profiles
  for each row execute function public.rattacher_reponses_portrait_trg();

-- 6. L'existant : une mise à jour « à vide » fait passer chaque profil
--    dans le déclencheur. Le updated_at n'est pas touché.
update public.profiles
   set personality_answers = personality_answers
 where personality_answers is not null
   and exists (select 1 from jsonb_each_text(personality_answers) e where e.value like 'autre:%');
