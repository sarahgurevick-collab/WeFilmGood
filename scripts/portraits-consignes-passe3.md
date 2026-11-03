# Consignes — troisième passe des portraits (03/11/2026)

Les personnages de cette part sont restés **sans portrait** après deux
passes. Les deux fois, la recherche partait du **sexe et de l'âge**
(« woman 40 smiling outdoors ») : Pixabay ne rendait que des poses de mode,
des gens de loin ou allongés. Cette fois on part de **ce que fait le
personnage** : son métier, son activité, son milieu, son époque. Une
infirmière se cherche avec `nurse`, une femme qui fait du yoga avec `yoga`,
un paysan avec `farmer`, un pêcheur avec `fisherman`, un lycéen avec
`student classroom`. Les banques de photos sont pleines de gens au travail
ou dans une activité : c'est là que se trouvent les visages ordinaires.

Un portrait raté fait toujours plus de mal que pas de portrait du tout : les
règles de décence et de vraie photo ne changent pas.

Tu travailles sur UNE part : `<dossier>/part-<N>.json`. Chaque personnage a
un numéro `k`, un nom, un genre, un âge, une description, le titre et le
genre du film, et `ancienne_recherche` / `ancienne_note` (la recherche de la
passe précédente et pourquoi rien n'a convenu).

On te confie soit l'étape 1, soit l'étape 3 : ne fais que celle demandée.

## Étape 1 — les recherches

Écris `<dossier>/requetes-<N>.json` :

    { "k": { "p1": "première recherche", "p2": "seconde recherche" }, … }

Deux recherches Pixabay par personnage, en anglais, **3 ou 4 mots** chacune.

- `p1` : **le métier ou l'activité principale** + le sexe (+ `portrait` ou
  un lieu). Exemples : `nurse woman portrait`, `farmer man field`,
  `woman yoga meditation`, `chef kitchen man`, `teacher woman classroom`,
  `boxer man gym`, `violinist woman`, `old fisherman boat`.
- `p2` : **un autre angle** de la même personne : une seconde activité, le
  milieu, l'époque, ou un trait fort (uniforme, barbe, voile, béret, tatouage).
  Exemples : `woman 40 hospital`, `man 1950s suit`, `woman veil market`,
  `man beard workshop`. Si la description ne donne rien d'autre, `p2` reprend
  `p1` avec un mot de la vie ordinaire : `candid`, `street`, `headshot`.
- **Ne recopie pas** `ancienne_recherche`. Si la description ne dit **ni
  métier ni activité ni milieu** (« un homme de 50 ans, taciturne »), cherche
  une **allure** plutôt qu'un âge : `man grey hair glasses`, `woman curly hair
  street`, `man cap outdoors`.
- L'âge en chiffres seulement s'il compte vraiment (enfant, adolescent,
  vieillard) : `boy 10 school`, `old woman garden`.
- Évite les recherches nues comme `young woman portrait` ou `man suit
  portrait` : ce sont celles qui ont échoué deux fois.
- Personnage non humain ou personne réelle (cela ne devrait plus arriver ici) :
  `{ "p1": "", "p2": "" }`.

## Étape 2 — chercher (ce n'est pas toi)

La séance principale lance la recherche. Chaque personnage a jusqu'à douze
photos numérotées de 0 à 11 : en général 0 à 5 viennent de `p1` et 6 à 11
de `p2`.

## Étape 3 — choisir

Regarde **chaque feuille** (outil Read), en relisant la description du
personnage. Écris `<dossier>/choix-<N>.json` :

    { "k": { "n": 3, "avis": "bon", "note": "" }, … }

**La fidélité, comme à la seconde passe : plausible suffit.**

- `bon` : le sexe et la tranche d'âge correspondent, l'allure ne contredit pas
  la description, et l'auteur pourrait y voir son personnage. L'origine, un
  détail (couleur des cheveux, barbe) n'ont pas besoin de coller exactement.
  Une personne **dans son activité** (infirmière en blouse, femme en posture de
  yoga, homme à l'établi) convient très bien **si le visage est net et
  reconnaissable** : c'est même le but de cette passe.
- `moyen` : plausible mais un point cloche nettement (âge visiblement à côté,
  origine très différente quand la description y insiste, visage un peu petit
  dans l'image). Sarah les reverra.
- `rien` : aucune photo acceptable.
- `note` : pour `moyen` et `rien`, une phrase courte en français qui dit ce qui
  cloche, et qui décrit bien la photo choisie. Vide pour `bon`.

**Ce qui ne change pas, sans exception :**

- Une seule personne, le visage bien visible (pas de dos, pas de silhouette au
  soleil couchant, pas de visage caché par les mains ou un masque).
- Un **portrait photographique** : pas de tableau, de gravure, de dessin, de
  statue, de mannequin de vitrine. Une vieille photographie en noir et blanc
  convient pour un personnage d'époque.
- **Images fabriquées par ordinateur (décision de Sarah, 22/10/2026)** : elles
  sont acceptées. Pixabay les signale lui-même, le script les marque dans le
  suivi et Sarah les trie à part. Ne refuse donc pas une image seulement parce
  qu'elle a l'air fabriquée : juge-la comme les autres (sexe, âge, allure,
  décence). Refuse-la seulement si un défaut se voit (mains déformées, visage
  déformé, texte illisible ou absurde).
- Jamais de nudité, de torse nu, de décolleté, d'épaules nues, de tenue
  moulante avec pose de magazine, ni de pose glamour ou suggestive. Pour le
  yoga ou le sport : tenue couvrante, posture ordinaire, visage net ; sinon
  `rien`. Pour un enfant ou un adolescent : habillé, pose ordinaire, rien
  d'ambigu.
- Pas de personne allongée ou endormie.
- Jamais une personnalité connue pour un personnage de fiction.
- L'âge écrit dans la description prime sur le menu.
- **Deux personnages d'un même projet ne doivent pas avoir le même visage** :
  si deux feuilles d'un même film montrent la même personne, ne la garde que
  pour l'un des deux.
- Dans le doute entre `moyen` et `rien`, choisis `rien`.

Tu ne fais rien d'autre : tu ne lances aucune commande, tu n'écris pas dans la
base, tu ne modifies aucun fichier du projet. À la fin, réponds seulement par
le compte des bons, des moyens et des riens, et le chemin de `choix-<N>.json`.
