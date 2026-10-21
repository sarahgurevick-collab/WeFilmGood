-- =====================================================================
-- CinéMatch : les traits d'union à l'intérieur des mots (21/10/2026, soir).
--
-- La normalisation posée en 0178 (normaliser_reponse_portrait) écartait
-- TOUS les tirets : « jean-paul belmondo » devenait « jean - paul
-- belmondo », « post-rock » → « post - rock ». La mise à jour de 0185 a
-- réécrit ainsi des réponses correctes. Ici :
--  1. la règle ne touche plus qu'aux tirets séparateurs (entourés d'au
--     moins une espace, ou tirets longs) ;
--  2. les réponses abîmées sont réparées depuis la sauvegarde
--     personality_answers_sauvegarde_0178 (même texte au tiret près) ;
--  3. les alias sont reposés avec la nouvelle règle (mêmes sources que
--     0178, 0180-0184) ;
--  4. les libellés : ceux qui n'apportaient rien (identiques à la clé)
--     sont retirés, ceux dont la clé change sont reposés, et 13 posés à la
--     main (« Jean-Paul Belmondo », « Volley-ball »…).
-- =====================================================================

create or replace function public.normaliser_reponse_portrait(t text)
returns text
language sql
immutable
as $$
  select trim(
           regexp_replace(
             regexp_replace(
               replace(replace(public.normaliser_reponse(t), '’', ''''), 'œ', 'oe'),
               '\s*[—–]\s*|\s+-\s*|\s*-\s+', ' - ', 'g'),
             '\s+', ' ', 'g'));
$$;

-- 2. Réparation depuis la sauvegarde : même texte au tiret près.
do $$
declare
  r record;
  k text;
  v text;
  b text;
  bn text;
  resultat jsonb;
  touche boolean;
begin
  for r in
    select p.id, p.personality_answers as actuel, s.personality_answers as sauve
    from public.profiles p
    join lateral (
      select personality_answers from public.personality_answers_sauvegarde_0178 s
      where s.profile_id = p.id order by sauvegarde_le desc limit 1
    ) s on true
    where exists (select 1 from jsonb_each_text(p.personality_answers) e where e.value like 'autre:% - %')
  loop
    resultat := '{}'::jsonb; touche := false;
    for k, v in select * from jsonb_each_text(r.actuel) loop
      b := r.sauve ->> k;
      if v like 'autre:% - %' and b is not null and b like 'autre:%' then
        bn := public.normaliser_reponse_portrait(substr(b, 7));
        if bn <> substr(v, 7) and replace(bn, ' - ', '-') = replace(substr(v, 7), ' - ', '-') then
          v := 'autre:' || bn; touche := true;
        end if;
      end if;
      resultat := resultat || jsonb_build_object(k, v);
    end loop;
    if touche then
      update public.profiles set personality_answers = resultat where id = r.id;
    end if;
  end loop;
end $$;

-- 3. Les alias, reposés avec la nouvelle règle (les anciens restent, sans effet).
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

insert into public.personality_libre_alias (question_key, alias, texte)
select 'serie', public.normaliser_reponse_portrait(a), 'breaking bad'
from unnest(array['breaking bad - vince gilligan', 'breaking bad de vince gilligan', 'breaking bad.']) a
on conflict do nothing;

insert into public.personality_libre_alias (question_key, alias, texte) values
  ('serie', public.normaliser_reponse_portrait('friends, breaking bad et fargo'), 'friends'),
  ('serie', public.normaliser_reponse_portrait('breaking bad ou oz'), 'breaking bad')
on conflict do nothing;

insert into public.personality_libre_alias (question_key, alias, texte)
values ('film_prefere', public.normaliser_reponse_portrait('paris texas'), 'paris, texas')
on conflict do nothing;

insert into public.personality_libre_alias (question_key, alias, texte) values
  ('cinema', public.normaliser_reponse_portrait('cinema d''art et essai'), 'art et essai'),
  ('cinema', public.normaliser_reponse_portrait('cinemascope, imax ou 3d : en grand !'), 'en cinemascope'),
  ('cinema', public.normaliser_reponse_portrait('en cinemascope et de preference un slapstick...'), 'en cinemascope'),
  ('cinema', public.normaliser_reponse_portrait('en muet et en 3d'), 'en muet'),
  ('cinema', public.normaliser_reponse_portrait('salle arts et essai'), 'art et essai'),
  ('film_nationalite', public.normaliser_reponse_portrait('film de hong kong entre les annees 90 et 2000'), 'film de hong kong'),
  ('film_nationalite', public.normaliser_reponse_portrait('film de sabre ou un western a la sergio leone'), 'film de sabre'),
  ('film_nationalite', public.normaliser_reponse_portrait('indie americain ou un film danois'), 'un film independant americain'),
  ('film_prefere', public.normaliser_reponse_portrait('2001 odyssee de l''espace, ou lost highway ou dersou ouzala'), '2001 odyssee de l''espace'),
  ('film_prefere', public.normaliser_reponse_portrait('a.i., intelligence artificielle - steven spielberg (2001)'), 'a.i. intelligence artificielle'),
  ('film_prefere', public.normaliser_reponse_portrait('amant ou dirty dancing ou gosht'), 'amant'),
  ('film_prefere', public.normaliser_reponse_portrait('aviator de martin scorsese ou burning de lee chang-dong'), 'aviator'),
  ('film_prefere', public.normaliser_reponse_portrait('belle et la bete de jean cocteau'), 'belle et la bete'),
  ('film_prefere', public.normaliser_reponse_portrait('casino / underground / hairspray de john waters'), 'casino'),
  ('film_prefere', public.normaliser_reponse_portrait('city lights, charles chaplin'), 'city lights'),
  ('film_prefere', public.normaliser_reponse_portrait('cotton club de francis ford copolla (1984) ou the crowd de kink vidor (1928)'), 'cotton club'),
  ('film_prefere', public.normaliser_reponse_portrait('diamantino - gabriel abrantes et daniel schmidt'), 'diamantino'),
  ('film_prefere', public.normaliser_reponse_portrait('discours d''un roi / the guilty (de g. moller) / amanda (m. hers)'), 'discours d''un roi'),
  ('film_prefere', public.normaliser_reponse_portrait('effet papillon - eric bress, j. mackye gruber (2004)'), 'effet papillon'),
  ('film_prefere', public.normaliser_reponse_portrait('fire walk with me, lynch'), 'fire walk with me'),
  ('film_prefere', public.normaliser_reponse_portrait('game of thrones / twilight'), 'game of thrones'),
  ('film_prefere', public.normaliser_reponse_portrait('harold & maud'), 'harold et maude'),
  ('film_prefere', public.normaliser_reponse_portrait('harold et maude - hal ashby (1971)'), 'harold et maude'),
  ('film_prefere', public.normaliser_reponse_portrait('hollywood ending - woody allen / the deer hunter - michael cimino'), 'hollywood ending'),
  ('film_prefere', public.normaliser_reponse_portrait('hors jeu, de jafar panahi'), 'hors jeu'),
  ('film_prefere', public.normaliser_reponse_portrait('in the cut, jane campion'), 'in the cut'),
  ('film_prefere', public.normaliser_reponse_portrait('incompris, tootsie'), 'incompris'),
  ('film_prefere', public.normaliser_reponse_portrait('into the wild, sean penn'), 'into the wild'),
  ('film_prefere', public.normaliser_reponse_portrait('journal d''une femme de chambre, louis bunuel'), 'journal d''une femme de chambre'),
  ('film_prefere', public.normaliser_reponse_portrait('jules et jim - francois truffaut'), 'jules et jim'),
  ('film_prefere', public.normaliser_reponse_portrait('mulholland drive - david lynch / paris texas - win wanders'), 'mulholland drive'),
  ('film_prefere', public.normaliser_reponse_portrait('paris, texas - wim wenders'), 'paris, texas'),
  ('film_prefere', public.normaliser_reponse_portrait('paroles et musique - elie chouraqui (1984)'), 'paroles et musique'),
  ('film_prefere', public.normaliser_reponse_portrait('psychose et / ou fenetre sur cour d''alfred hitchcock'), 'psychose'),
  ('film_prefere', public.normaliser_reponse_portrait('rencontres du 3eme type, casablanca,les goonies, papy fait de la resistance, la chevre, dans ses yeux,'), 'rencontres du 3eme type'),
  ('film_prefere', public.normaliser_reponse_portrait('retour vers le futur, il etait une fois l''amerique'), 'retour vers le futur'),
  ('film_prefere', public.normaliser_reponse_portrait('sexe, mensonges et video - steven soderbergh'), 'sexe, mensonges et video'),
  ('film_prefere', public.normaliser_reponse_portrait('the big lebowski - joel et ethan coen'), 'the big lebowski'),
  ('film_prefere', public.normaliser_reponse_portrait('the fall - tarsem singh ou premier contact - denis villeneuve'), 'the fall'),
  ('film_prefere', public.normaliser_reponse_portrait('the great escape, john sturges (1963)'), 'the great escape'),
  ('film_prefere', public.normaliser_reponse_portrait('the mirror - andrei tarkovsky / balada triste de trompeta - alex de la iglesia / blancanieves - pablo berger'), 'the mirror'),
  ('film_prefere', public.normaliser_reponse_portrait('thelma and louise, ridley scott, 1991'), 'thelma et louise'),
  ('film_prefere', public.normaliser_reponse_portrait('va, vis et deviens de radu mihaileanu'), 'va, vis et deviens'),
  ('film_prefere', public.normaliser_reponse_portrait('will hunting, abyss, seven, erin brokovitch, into the wild, bullit, the heat, elephant man, blue velvet, sailor & lula, million dollar baby, abyss, mystic river, madisson road, retour vers l''enfer, le cercle des poetes disparus, la vie est belle, la promesse, serpico, carbone, ennemi d''etat'), 'will hunting'),
  ('serie', public.normaliser_reponse_portrait('american horror story - ryan murphy et brad falchuk'), 'american horror story'),
  ('serie', public.normaliser_reponse_portrait('baron noir - eric benzekri, jean-baptiste delafon'), 'baron noir'),
  ('serie', public.normaliser_reponse_portrait('battlestar galactica - glen.a.larson / ronald.d.moore'), 'battlestar galactica'),
  ('serie', public.normaliser_reponse_portrait('better call saul - peter gould / vince gilligan'), 'better call saul'),
  ('serie', public.normaliser_reponse_portrait('better call saul - vince gilligan & peter gould'), 'better call saul'),
  ('serie', public.normaliser_reponse_portrait('blackadder (la vipere noire) - richard curtis / rowan atkinson'), 'blackadder'),
  ('serie', public.normaliser_reponse_portrait('blackadder, spin city, seinfeld, la premiere saison des petits meurtres d''agatha christie'), 'blackadder'),
  ('serie', public.normaliser_reponse_portrait('blue eye samourai - amber noizumi / michael green'), 'blue eye samourai'),
  ('serie', public.normaliser_reponse_portrait('casa de papel et homeland'), 'casa de papel'),
  ('serie', public.normaliser_reponse_portrait('columbo / inspecteur montalbano'), 'columbo'),
  ('serie', public.normaliser_reponse_portrait('dark - jantje friese / baran bo odar'), 'dark'),
  ('serie', public.normaliser_reponse_portrait('dark crystal age of resistance / louis leterrier'), 'dark crystal age of resistance'),
  ('serie', public.normaliser_reponse_portrait('dark, ou law & order'), 'dark'),
  ('serie', public.normaliser_reponse_portrait('deuce - david simon, george pelecanos...'), 'the deuce'),
  ('serie', public.normaliser_reponse_portrait('dirk gently, holistic detective'), 'dirk gently'),
  ('serie', public.normaliser_reponse_portrait('fargo saison 1, 2, 3'), 'fargo'),
  ('serie', public.normaliser_reponse_portrait('friends - crane / kaufmann'), 'friends'),
  ('serie', public.normaliser_reponse_portrait('friends - marta kauffman / david crane'), 'friends'),
  ('serie', public.normaliser_reponse_portrait('friends - marta kauffman et david crane'), 'friends'),
  ('serie', public.normaliser_reponse_portrait('friends de marta kauffman et de david crane'), 'friends'),
  ('serie', public.normaliser_reponse_portrait('game of thrones / twilight / arcane'), 'game of thrones'),
  ('serie', public.normaliser_reponse_portrait('homeland - howard gordon et alex gansa'), 'homeland'),
  ('serie', public.normaliser_reponse_portrait('i may destroy you, michaela coel'), 'i may destroy you'),
  ('serie', public.normaliser_reponse_portrait('jeu de la dame - scott frank / allan scott'), 'jeu de la dame'),
  ('serie', public.normaliser_reponse_portrait('journal intime d''un call girl ou sex and the city'), 'journal intime d''une call girl'),
  ('serie', public.normaliser_reponse_portrait('kaamelott ou un gars une fille'), 'kaamelott'),
  ('serie', public.normaliser_reponse_portrait('law and orders - dick wolf / prod'), 'law & order'),
  ('serie', public.normaliser_reponse_portrait('leftovers-damon lindelof et tom perrotta'), 'the leftovers'),
  ('serie', public.normaliser_reponse_portrait('lost - damon lindelof / j. j. abrams / jeffrey lieber'), 'lost'),
  ('serie', public.normaliser_reponse_portrait('lost - damon lindelof et j.j. abrams'), 'lost'),
  ('serie', public.normaliser_reponse_portrait('love, death and robots - tim miller'), 'love, death and robots'),
  ('serie', public.normaliser_reponse_portrait('medium, dix pour cent'), 'medium'),
  ('serie', public.normaliser_reponse_portrait('misfits - howard overman ou anne with an e - moira walley-beckett'), 'misfits'),
  ('serie', public.normaliser_reponse_portrait('mr robot / sam esmail'), 'mr robot'),
  ('serie', public.normaliser_reponse_portrait('normal people de sally rooney et alice birch'), 'normal people'),
  ('serie', public.normaliser_reponse_portrait('nuit ou laurier gaudreault s''est reveille - xavier dolan'), 'nuit ou laurier gaudreault s''est reveille'),
  ('serie', public.normaliser_reponse_portrait('sense 8 - lana et lilly wachowski'), 'sense8'),
  ('serie', public.normaliser_reponse_portrait('sherlock de mark gatiss / steven moffat'), 'sherlock'),
  ('serie', public.normaliser_reponse_portrait('south park - trey parker et matt stone'), 'south park'),
  ('serie', public.normaliser_reponse_portrait('stranger things - matt & ross duffer'), 'stranger things'),
  ('serie', public.normaliser_reponse_portrait('stranger things - matt et ross duffer'), 'stranger things'),
  ('serie', public.normaliser_reponse_portrait('stranger things ou got'), 'stranger things'),
  ('serie', public.normaliser_reponse_portrait('the leftovers, damon lindelof (2014-2017)'), 'the leftovers'),
  ('serie', public.normaliser_reponse_portrait('the office - ricky gervais / stephen merchant'), 'the office'),
  ('serie', public.normaliser_reponse_portrait('the sopranos / the lefrovers ou bojack horseman impossible de choisir'), 'the sopranos'),
  ('serie', public.normaliser_reponse_portrait('the wire - david simon et ed burns'), 'the wire'),
  ('serie', public.normaliser_reponse_portrait('the wire / better call saul'), 'the wire'),
  ('serie', public.normaliser_reponse_portrait('the wire ou twin peaks'), 'the wire'),
  ('serie', public.normaliser_reponse_portrait('the young pope, paolo sorrentino'), 'the young pope'),
  ('serie', public.normaliser_reponse_portrait('top of the lake - jane campion / gerard lee'), 'top of the lake'),
  ('serie', public.normaliser_reponse_portrait('top of the lake, unorthodox, caliphate'), 'top of the lake'),
  ('serie', public.normaliser_reponse_portrait('treme - david simon / eric overmyer'), 'treme'),
  ('serie', public.normaliser_reponse_portrait('twin peaks de david lynch et mark frost'), 'twin peaks'),
  ('serie', public.normaliser_reponse_portrait('vikings, the recruit, last kingdom, le riche et le pauvre, the fall, le jeu de la dame, bodyguard, defense lincoln, les rues de san francisco'), 'vikings'),
  ('serie', public.normaliser_reponse_portrait('west world - jonathan nolan et lisa joy'), 'west world'),
  ('serie', public.normaliser_reponse_portrait('what we do in the shadows - jermaine clement / taika waititi'), 'what we do in the shadows'),
  ('personnage_film', public.normaliser_reponse_portrait('"martin brody -les dents de la mer" ou un gremlins ou choco dans les goonies'), 'martin brody - les dents de la mer'),
  ('personnage_film', public.normaliser_reponse_portrait('amma crellin - sharp objects (serie hbo par jean marc vallee, gillian flyn)'), 'amma crellin - sharp objects'),
  ('personnage_film', public.normaliser_reponse_portrait('barry egan / lewin davis ou prince herbert dans sacree graal'), 'barry egan'),
  ('personnage_film', public.normaliser_reponse_portrait('batman / bruce wayne'), 'batman'),
  ('personnage_film', public.normaliser_reponse_portrait('ben affleck, pearl harbor'), 'ben affleck - pearl harbor'),
  ('personnage_film', public.normaliser_reponse_portrait('blondin (le bon la brute et le truand)'), 'blondin - le bon la brute et le truand'),
  ('personnage_film', public.normaliser_reponse_portrait('catwoman / selina kyle - batman returns'), 'catwoman - batman returns'),
  ('personnage_film', public.normaliser_reponse_portrait('cobb, inception de leonardo dicaprio'), 'cobb - inception'),
  ('personnage_film', public.normaliser_reponse_portrait('erin brockovich - erin brockovich, seule contre tous'), 'erin brockovich'),
  ('personnage_film', public.normaliser_reponse_portrait('erin brockovich, seule contre tous'), 'erin brockovich'),
  ('personnage_film', public.normaliser_reponse_portrait('herve, le petit enfant dans la maison des bois de maurice pialat'), 'herve - la maison des bois'),
  ('personnage_film', public.normaliser_reponse_portrait('jack-titanic / will-will hunting'), 'jack - titanic'),
  ('personnage_film', public.normaliser_reponse_portrait('margo channing - all about eve ou carmen - blancanieves'), 'margo channing - all about eve'),
  ('personnage_film', public.normaliser_reponse_portrait('sailor de sailor et lula'), 'sailor - sailor et lula'),
  ('personnage_film', public.normaliser_reponse_portrait('saul goodman / special agent dale cooper'), 'saul goodman'),
  ('personnage_film', public.normaliser_reponse_portrait('vincent freeman, bienvenue a gattaca'), 'vincent freeman - bienvenue a gattaca'),
  ('personnage_film', public.normaliser_reponse_portrait('will dans will hunting, erin brokovitch, django, elvis, maximus, the joker'), 'will - good will hunting'),
  ('acteur', public.normaliser_reponse_portrait('"jean bouise ou jean rene milo ou rowan atkinson ou richard dreyfuss ou roy scheider ou buster keaton ou jean rochefort ou pierre richard ou marty feldman ou idris elba"'), 'jean bouise'),
  ('acteur', public.normaliser_reponse_portrait('javier bardem, heath ledger, michael fassbender, michel piccoli, jean-louis trintignan, joaquim phoenix'), 'javier bardem'),
  ('acteur', public.normaliser_reponse_portrait('jim carrey ou jean-pierre bacri'), 'jim carrey'),
  ('acteur', public.normaliser_reponse_portrait('mads mikkelsen et jharrell jerome'), 'mads mikkelsen'),
  ('acteur', public.normaliser_reponse_portrait('michael fassbender / denis menochet / joaquin phoenix / mads mikkelsen'), 'michael fassbender'),
  ('acteur', public.normaliser_reponse_portrait('steve carell ou denzel washington'), 'steve carell'),
  ('actrice', public.normaliser_reponse_portrait('elisabeth moss / toni collette / naomi watts'), 'elisabeth moss'),
  ('actrice', public.normaliser_reponse_portrait('fanny ardant / sherilyn fenn / sandra huller'), 'fanny ardant'),
  ('actrice', public.normaliser_reponse_portrait('frances mcdormand / kate winslet / noomi rapace / charlize theron / jessica chastain / '), 'frances mcdormand'),
  ('actrice', public.normaliser_reponse_portrait('isabelle huppert / meryl streep / penelope cruz'), 'isabelle huppert'),
  ('actrice', public.normaliser_reponse_portrait('jodie foster, zabou, isabelle nanty, sarah silverman, melissa mc carthy'), 'jodie foster'),
  ('actrice', public.normaliser_reponse_portrait('meryl streep et juliette binoche'), 'meryl streep'),
  ('actrice', public.normaliser_reponse_portrait('penelope cruz, romy schneider, jennifer lawrence, diane kruger'), 'penelope cruz'),
  ('actrice', public.normaliser_reponse_portrait('sally hawkins ou lupita nyong''o'), 'sally hawkins'),
  ('producteur', public.normaliser_reponse_portrait('anatole dauman, elias querejeta, sarah green'), 'anatole dauman'),
  ('producteur', public.normaliser_reponse_portrait('daniel katz, david fenkel, et john hodges'), 'daniel katz'),
  ('producteur', public.normaliser_reponse_portrait('jane campion, luc besson'), 'jane campion'),
  ('producteur', public.normaliser_reponse_portrait('ophrah winfrey et xavier dolan'), 'oprah winfrey'),
  ('producteur', public.normaliser_reponse_portrait('roger corman / scott rudin'), 'roger corman'),
  ('livre', public.normaliser_reponse_portrait('1984, le nom de la rose, barrage contre le pacifique, le parfum, l''amant.'), '1984'),
  ('livre', public.normaliser_reponse_portrait('ainsi parlait zarathoustra, nietzsche'), 'ainsi parlait zarathoustra'),
  ('livre', public.normaliser_reponse_portrait('carte et le territoire - michel houellebecq'), 'carte et le territoire'),
  ('livre', public.normaliser_reponse_portrait('chateau, franz kafka'), 'chateau'),
  ('livre', public.normaliser_reponse_portrait('crime et chatiment - dostoievski'), 'crime et chatiment'),
  ('livre', public.normaliser_reponse_portrait('crime et chatiment - fiodor dostoievski'), 'crime et chatiment'),
  ('livre', public.normaliser_reponse_portrait('crime et chatiment / dostoievski'), 'crime et chatiment'),
  ('livre', public.normaliser_reponse_portrait('crime et chatiment dostoievski'), 'crime et chatiment'),
  ('livre', public.normaliser_reponse_portrait('crime et chatiments'), 'crime et chatiment'),
  ('livre', public.normaliser_reponse_portrait('crime et chatiments - dostoievski'), 'crime et chatiment'),
  ('livre', public.normaliser_reponse_portrait('de bons presages - terry pratchett et neil gaiman'), 'de bons presages'),
  ('livre', public.normaliser_reponse_portrait('demons & merveilles - howard phillips lovecraft'), 'demons & merveilles'),
  ('livre', public.normaliser_reponse_portrait('europeana, une breve histoire du xxe siecle'), 'europeana'),
  ('livre', public.normaliser_reponse_portrait('flash ( ou le grand voyage)- charles duchaussois'), 'flash'),
  ('livre', public.normaliser_reponse_portrait('fondation d''asimov / l''idiot dostoievski'), 'fondation'),
  ('livre', public.normaliser_reponse_portrait('franny et zooey - j.d salinger'), 'franny et zooey'),
  ('livre', public.normaliser_reponse_portrait('ile, robert merle'), 'ile'),
  ('livre', public.normaliser_reponse_portrait('marche ou creve - stephen king'), 'marche ou creve'),
  ('livre', public.normaliser_reponse_portrait('meilleur des mondes, haldous huxley'), 'meilleur des mondes'),
  ('livre', public.normaliser_reponse_portrait('moi, ce que j''aime, c''est les monstres - emil ferris'), 'moi, ce que j''aime, c''est les monstres'),
  ('livre', public.normaliser_reponse_portrait('napoleon et talleyrand de emile dard'), 'napoleon et talleyrand'),
  ('livre', public.normaliser_reponse_portrait('oeuvre de dieu, la part du diable - john irving'), 'oeuvre de dieu, la part du diable'),
  ('livre', public.normaliser_reponse_portrait('orgueil et prejuges - jane austen'), 'orgueil et prejuges'),
  ('livre', public.normaliser_reponse_portrait('rouge et le noir - stendahl'), 'rouge et le noir'),
  ('livre', public.normaliser_reponse_portrait('seigneur des porcheries - le temps venu de tuer le veau gras et d''armer les justes'), 'seigneur des porcheries'),
  ('livre', public.normaliser_reponse_portrait('sexe, drogue & alcool - cindy.c'), 'sexe, drogue & alcool'),
  ('livre', public.normaliser_reponse_portrait('stupeurs et tremblements - amelie nothomb'), 'stupeur et tremblements'),
  ('livre', public.normaliser_reponse_portrait('the force of nonviolence (the ethical in the political) - judith butler / casimir mene la grande vie - jean d''ormesson'), 'the force of nonviolence'),
  ('livre', public.normaliser_reponse_portrait('the secret scripture, sebastian barry'), 'the secret scripture'),
  ('livre', public.normaliser_reponse_portrait('tueries et un film - fanny garin'), 'tueries et un film'),
  ('livre', public.normaliser_reponse_portrait('va ou il est impossible d''aller - costa gravras'), 'va ou il est impossible d''aller'),
  ('livre', public.normaliser_reponse_portrait('vendredi ou la vie sauvage - michel tournier'), 'vendredi ou la vie sauvage'),
  ('piece_theatre', public.normaliser_reponse_portrait('air de famille - agnes jaoui & jean-pierre bacri'), 'air de famille'),
  ('piece_theatre', public.normaliser_reponse_portrait('arsene lupin - francis de croisset et maurice leblanc'), 'arsene lupin'),
  ('piece_theatre', public.normaliser_reponse_portrait('beaucoup de bruit pour rien, w.shakespeare'), 'beaucoup de bruit pour rien'),
  ('piece_theatre', public.normaliser_reponse_portrait('dernier caravanserail, ariane mnouchkine'), 'dernier caravanserail'),
  ('piece_theatre', public.normaliser_reponse_portrait('jeu de l''amour et du hasard - marivaux'), 'jeu de l''amour et du hasard'),
  ('piece_theatre', public.normaliser_reponse_portrait('love & money - dennis kelly'), 'love & money'),
  ('piece_theatre', public.normaliser_reponse_portrait('lucile - amour et piano'), 'amour et piano'),
  ('piece_theatre', public.normaliser_reponse_portrait('misanthrope, moliere'), 'misanthrope'),
  ('piece_theatre', public.normaliser_reponse_portrait('mort d''un commis voyageur, la menagerie de verre, un tramway nomme desir, buenos aires 1920, amor corazon, hamlet'), 'mort d''un commis voyageur'),
  ('piece_theatre', public.normaliser_reponse_portrait('ouest, le vrai - sam shepard'), 'ouest, le vrai'),
  ('piece_theatre', public.normaliser_reponse_portrait('place, de tamara al saadi'), 'place'),
  ('piece_theatre', public.normaliser_reponse_portrait('promises, promises - (musical adapte de "the apartment")'), 'promises, promises'),
  ('piece_theatre', public.normaliser_reponse_portrait('rhinoceros, onesco'), 'rhinoceros'),
  ('piece_theatre', public.normaliser_reponse_portrait('roi lear et tchekhov'), 'roi lear'),
  ('piece_theatre', public.normaliser_reponse_portrait('romeo & juliette- shakespeare'), 'romeo et juliette'),
  ('piece_theatre', public.normaliser_reponse_portrait('romeo et juliette - shakespeare'), 'romeo et juliette'),
  ('piece_theatre', public.normaliser_reponse_portrait('romeo et juliette - william shakespeare'), 'romeo et juliette'),
  ('piece_theatre', public.normaliser_reponse_portrait('romeo et juliette shakespeare'), 'romeo et juliette'),
  ('piece_theatre', public.normaliser_reponse_portrait('souris et des hommes - steinbeck'), 'souris et des hommes'),
  ('piece_theatre', public.normaliser_reponse_portrait('the play that goes wrong - henry lewis, jonathan sayer, henry shields'), 'the play that goes wrong'),
  ('musique', public.normaliser_reponse_portrait('abstract trip hop ou jazz ou opera'), 'trip hop'),
  ('musique', public.normaliser_reponse_portrait('bon la brute et le truand de sergio leone'), 'bon la brute et le truand'),
  ('musique', public.normaliser_reponse_portrait('electro / pop / rock / bo'), 'electro'),
  ('musique', public.normaliser_reponse_portrait('musique classique ou experimentale'), 'musique classique'),
  ('musique', public.normaliser_reponse_portrait('musique classique, musique du monde, musique de film'), 'musique classique'),
  ('musique', public.normaliser_reponse_portrait('musique de film... et tout le reste aussi.'), 'musique de film'),
  ('musique', public.normaliser_reponse_portrait('new wave / post-punk'), 'new wave'),
  ('musique', public.normaliser_reponse_portrait('new-wave / post-punk'), 'new wave'),
  ('musique', public.normaliser_reponse_portrait('rock progressif / hip hop / jazz / art pop'), 'rock progressif'),
  ('musique', public.normaliser_reponse_portrait('zimmer / guonadottir / morricone'), 'zimmer'),
  ('instrument', public.normaliser_reponse_portrait('guitare electrique ou synthetiseur'), 'guitare electrique'),
  ('instrument', public.normaliser_reponse_portrait('piano, sans le synthetiseur'), 'piano'),
  ('instrument', public.normaliser_reponse_portrait('piano, violon, guitare'), 'piano'),
  ('instrument', public.normaliser_reponse_portrait('violoncelle et la voix.'), 'violoncelle'),
  ('peintre', public.normaliser_reponse_portrait('caravage ou francis bacon'), 'caravage'),
  ('peintre', public.normaliser_reponse_portrait('courbet / soulage'), 'courbet'),
  ('peintre', public.normaliser_reponse_portrait('salvador dali ou francis bacon'), 'salvador dali'),
  ('peintre', public.normaliser_reponse_portrait('van gogh, klimt, dali'), 'van gogh'),
  ('evenement_historique', public.normaliser_reponse_portrait('11 avril 1954, the day nothing happened'), '11 avril 1954'),
  ('evenement_historique', public.normaliser_reponse_portrait('1905 - la separation de l''eglise et de l''etat'), 'separation de l''eglise et de l''etat'),
  ('evenement_historique', public.normaliser_reponse_portrait('4 juillet , la fin du genocide au rwanda'), 'fin du genocide au rwanda'),
  ('evenement_historique', public.normaliser_reponse_portrait('bataille d''austerlitz, 1805'), 'bataille d''austerlitz'),
  ('evenement_historique', public.normaliser_reponse_portrait('chute du mur de berlin, le premier vol sur la lune'), 'chute du mur de berlin'),
  ('evenement_historique', public.normaliser_reponse_portrait('commune 1870 / 1871'), 'commune de paris'),
  ('evenement_historique', public.normaliser_reponse_portrait('declatation des droits de l''homme et du citoyen'), 'declaration des droits de l''homme et du citoyen'),
  ('evenement_historique', public.normaliser_reponse_portrait('droit de vote des femmes ou la fin de l''esclavagisme'), 'droit de vote des femmes'),
  ('evenement_historique', public.normaliser_reponse_portrait('jour ou l''homme a marche sur la lune'), 'premier pas sur la lune'),
  ('evenement_historique', public.normaliser_reponse_portrait('ma naissance, celle du christ'), 'ma naissance'),
  ('evenement_historique', public.normaliser_reponse_portrait('me too et black lives matter'), 'me too'),
  ('evenement_historique', public.normaliser_reponse_portrait('separation des eglises et de l''etat de 1905'), 'separation de l''eglise et de l''etat'),
  ('ville', public.normaliser_reponse_portrait('"clermont ferrand sachant que sidney, new yorrk ou bangkok vont disparaitre a cause du rechauffement climatique donc venez il reste de la place'), 'clermont ferrand'),
  ('ville', public.normaliser_reponse_portrait('athenes / genova'), 'athenes'),
  ('ville', public.normaliser_reponse_portrait('beyrouth ou malacca'), 'beyrouth'),
  ('ville', public.normaliser_reponse_portrait('casablanca / los angeles'), 'casablanca'),
  ('ville', public.normaliser_reponse_portrait('grane, drome'), 'grane'),
  ('ville', public.normaliser_reponse_portrait('los angeles et plus particulierement hollywood ;)'), 'los angeles'),
  ('ville', public.normaliser_reponse_portrait('montreal, ma ville d''universite.'), 'montreal'),
  ('ville', public.normaliser_reponse_portrait('new york, rome, madrid'), 'new york'),
  ('ville', public.normaliser_reponse_portrait('rome ou le village d''asterix :)'), 'rome'),
  ('sport', public.normaliser_reponse_portrait('arts martiaux, equitation'), 'arts martiaux'),
  ('sport', public.normaliser_reponse_portrait('boxe et self-defense.'), 'boxe'),
  ('sport', public.normaliser_reponse_portrait('natation, billard americain'), 'natation'),
  ('sens', public.normaliser_reponse_portrait('gout, toucher, odorat, vue, ouie'), 'gout'),
  ('sens', public.normaliser_reponse_portrait('tous, impossible de choisir'), 'tous'),
  ('sens', public.normaliser_reponse_portrait('vue et l''ouie, comme au cinoche'), 'vue'),
  ('alcool', public.normaliser_reponse_portrait('morgon, vin de mon mari vigneron !'), 'morgon'),
  ('alcool', public.normaliser_reponse_portrait('rhum, champagne, sake'), 'rhum'),
  ('alcool', public.normaliser_reponse_portrait('rien du tout, je ne bois pas'), 'aucun'),
  ('plat', public.normaliser_reponse_portrait('canard laque, poulet tandoori, sushi'), 'canard laque'),
  ('plat', public.normaliser_reponse_portrait('tajine-parce que comme mon ecriture, il est fait de feu doux, de patience, de profondeur et d''epices qui piquent la ou ca brule le vrai.'), 'tajine'),
  ('plat', public.normaliser_reponse_portrait('tostones et turron de jijona'), 'tostones'),
  ('plat', public.normaliser_reponse_portrait('vegan, raw & sweet'), 'vegan')
on conflict (question_key, alias) do nothing;

insert into public.personality_libre_alias (question_key, alias, texte)
with r as (
  select k.key, substr(k.value, 7) as t, count(*) as n
  from public.profiles p, jsonb_each_text(p.personality_answers) k
  where k.value like 'autre:%'
  group by 1, 2
),
long as (
  select key, t, n, trim(split_part(t, ' - ', 1)) as base
  from r
  where t like '% - %'
)
select l.key, public.normaliser_reponse_portrait(l.t), b.t
from long l
join r b on b.key = l.key and b.t = l.base
where l.n >= 2
  and l.base <> ''
on conflict (question_key, alias) do nothing;

-- 4. Les libellés.
delete from public.personality_libre_libelles where libelle = texte and texte !~ '^[A-Z]';

insert into public.personality_libre_libelles (question_key, texte, libelle)
select l.question_key, public.normaliser_reponse_portrait(l.libelle), l.libelle
from public.personality_libre_libelles l
where public.normaliser_reponse_portrait(l.libelle) <> l.texte
  and replace(public.normaliser_reponse_portrait(l.libelle), ' - ', '-') = replace(l.texte, ' - ', '-')
on conflict (question_key, texte) do nothing;

insert into public.personality_libre_libelles (question_key, texte, libelle) values

  ('acteur', 'jean-paul belmondo', 'Jean-Paul Belmondo'),
  ('acteur', 'daniel day-lewis', 'Daniel Day-Lewis'),
  ('acteur', 'jean-pierre bacri', 'Jean-Pierre Bacri'),
  ('diner_ideal', 'jean-claude carriere', 'Jean-Claude Carrière'),
  ('diner_ideal', 'jean-luc godard', 'Jean-Luc Godard'),
  ('evenement_historique', '11 septembre 2001', '11 septembre 2001'),
  ('musique', 'post-rock', 'Post-rock'),
  ('piece_theatre', 'juste la fin du monde - jean-luc lagarce', 'Juste la fin du monde - Jean-Luc Lagarce'),
  ('producteur', 'marie-ange luciani', 'Marie-Ange Luciani'),
  ('sens', '6e sens', '6e sens'),
  ('serie', 'top of the lake - jane campion', 'Top of the Lake - Jane Campion'),
  ('sport', 'plongee sous-marine', 'Plongée sous-marine'),
  ('sport', 'volley-ball', 'Volley-ball')
on conflict (question_key, texte) do update set libelle = excluded.libelle;

-- Tout le monde repasse dans le déclencheur (idempotent).
update public.profiles set personality_answers = personality_answers
 where exists (select 1 from jsonb_each_text(personality_answers) e where e.value like 'autre:%');
