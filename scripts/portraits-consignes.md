# Consignes — un portrait pour les personnages sans photo

Tu donnes un visage à des personnages de scénarios (films, séries) déposés sur
WeFilmGood. Les auteurs découvriront le portrait choisi pour leur personnage :
il doit leur faire dire « oui, c'est lui / c'est elle ». Un portrait raté fait
plus de mal que pas de portrait du tout.

Tu travailles sur UNE part : `<dossier>/part-<N>.json`. Chaque personnage a un
numéro `k`, un nom, un genre (homme, femme, autre ou vide), un âge (enfant,
adolescent, adulte, senior ou vide), une description en français, le titre et
le genre du film.

## Étape 1 — les recherches

Écris `<dossier>/requetes-<N>.json` : un objet `{ "k": "recherche", … }`, une
entrée par personnage de la part.

- La recherche est en **anglais**, 3 à 6 mots, pour la banque de photos
  Pixabay. Elle décrit **ce qu'on voit sur une photo de visage** : sexe, âge
  approximatif, origine si le texte la donne, un ou deux traits marquants
  (barbe, lunettes, cheveux courts, corpulence), un métier ou une époque
  seulement s'ils se voient (pompier, médecin, médiéval).
  Exemples : `old fisherman beard portrait`, `woman fifty short hair portrait`,
  `african man ranger portrait`, `medieval woman portrait`.
- Les traits de caractère ne se photographient pas (« résigné », « loyal ») :
  ne les mets pas, sauf une expression simple (smiling, serious, tired).
- L'âge : s'il est écrit dans la description (« 45 ans », « la cinquantaine »),
  il prime sur le menu. Pour une femme de 40 à 60 ans, écris `mature woman` ou
  `middle aged woman` — sinon la banque ne renvoie que de jeunes modèles.
- Description vide ou sans rien de visuel : fais avec le genre et l'âge
  (`man portrait face`, `teenage girl portrait`).
- **Personne réelle** (personnage historique, célébrité, le texte dit « a
  réellement existé ») : écris `WIKI:Prénom Nom`. La recherche se fera sur
  Wikipédia.
- Animal, créature, robot, voix, groupe, lieu, objet : écris `""` (chaîne
  vide). Ces personnages n'auront pas de portrait.

## Étape 2 — chercher (ce n'est pas toi)

La recherche des photos est lancée par la séance principale, une part à la
fois (`node scripts/portraits-personnages.mjs chercher <dossier> <N>`) : en
parallèle, la banque refuse une vignette sur deux. Elle fabrique
`<dossier>/feuilles-<N>-1.jpg`, `-2.jpg`… : six personnages par feuille, et
pour chacun jusqu'à douze photos numérotées de 0 à 11.

On te confie soit l'étape 1, soit l'étape 3 : ne fais que celle demandée.

## Étape 3 — choisir

Regarde **chaque feuille** (outil Read sur le fichier image), en relisant la
description du personnage dans la part. Écris `<dossier>/choix-<N>.json` :

    { "k": { "n": 3, "avis": "bon", "note": "" }, … }

- `n` : le numéro de la photo retenue, ou `null` si aucune ne convient.
- `avis` :
  - `bon` : sexe, âge et allure collent à la description ; l'auteur y
    reconnaîtrait son personnage.
  - `moyen` : acceptable mais un point cloche (un peu trop jeune ou trop âgé,
    origine différente, allure éloignée). Sarah les reverra un par un.
  - `rien` : aucune photo convenable (`n` vaut `null`).
- `note` : pour `moyen` et `rien`, une phrase courte **en français**, sans
  jargon, qui dit ce qui cloche (« Trop jeune pour 45 ans », « Que des
  photos de groupe »). Vide pour `bon`.

Règles de choix, sans exception :

- Une seule personne, le visage bien visible. Pas de photo de groupe, de dos,
  de silhouette dans le noir, de visage masqué ou caché par des lunettes de
  soleil si un autre choix existe.
- Jamais de nudité, de torse nu, de pose suggestive ou de lingerie. Pour un
  enfant ou un adolescent : habillé, pose ordinaire, rien d'ambigu.
- Une vraie photo : pas de dessin, de tableau, de statue, de jouet, d'image
  manifestement retouchée ou générée.
- Le sexe et la tranche d'âge doivent correspondre. Un adulte de 30 ans ne
  devient pas un senior ; une femme de 50 ans n'est pas une jeune modèle.
- Dans le doute entre `moyen` et `rien`, choisis `rien`.
- Si la recherche était vide (`""`), mets `n: null`, `avis: "rien"`,
  `note: "Pas un personnage humain"` (ou la raison exacte).

Tu ne fais rien d'autre : tu ne lances pas « poser », tu n'écris pas dans la
base, tu ne modifies aucun fichier du projet. À la fin, réponds seulement par
le compte des bons, des moyens et des riens, et le chemin de `choix-<N>.json`.
