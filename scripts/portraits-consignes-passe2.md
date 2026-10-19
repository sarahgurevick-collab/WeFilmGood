# Consignes — seconde passe des portraits (17/10/2026)

Les personnages de cette part sont restés **sans portrait** au premier tour :
la banque Pixabay, interrogée avec une recherche précise, n'avait rien donné
de convenable. Cette fois on cherche **plus simple**, dans **deux banques**
(Pixabay et Openverse), et on accepte un portrait **plausible** plutôt que
parfaitement fidèle. Un portrait raté fait toujours plus de mal que pas de
portrait du tout : les règles de décence et de vraie photo ne changent pas.

Tu travailles sur UNE part : `<dossier>/part-<N>.json`. Chaque personnage a
un numéro `k`, un nom, un genre, un âge, une description, le titre et le
genre du film, et deux champs nouveaux : `ancienne_recherche` (ce qui a été
cherché au premier tour) et `ancienne_note` (pourquoi rien n'a convenu).

On te confie soit l'étape 1, soit l'étape 3 : ne fais que celle demandée.

## Étape 1 — les recherches

Écris `<dossier>/requetes-<N>.json` :

    { "k": { "p": "recherche Pixabay", "o": "recherche Openverse" }, … }

- `p` (Pixabay), en anglais, **3 ou 4 mots** : le sexe, l'âge, **un seul**
  trait visible au plus (barbe, lunettes, uniforme, époque), et `portrait`.
  Exemples : `old man beard portrait`, `mature woman portrait`,
  `young soldier portrait`. **Ne recopie pas** `ancienne_recherche` : enlève
  ce qui l'a fait échouer (souvent l'origine, le métier ou trop de détails,
  voir `ancienne_note`).
- `o` (Openverse), en anglais, **2 ou 3 mots** seulement (Openverse exige que
  tous les mots correspondent) : `elderly woman`, `man portrait`,
  `soldier portrait`. Pour un personnage d'une autre époque (avant 1960),
  Openverse a beaucoup de vieilles photographies : `victorian woman`,
  `1920s man`, `ww1 soldier`.
- Pour une femme de 40 à 60 ans : `mature woman` ou `middle aged woman`.
- **Évite les recherches nues comme `young woman portrait` ou `man suit portrait`** :
  Pixabay ne renvoie alors que des photos de mode (poses de magazine, épaules
  nues, personnes allongées), toutes refusées au tri (constaté le 20/10 : 1 seul
  portrait sur 50). Ajoute un mot qui tire vers une **photo de la vie
  ordinaire** : `candid`, `casual`, `street`, `smiling`, `headshot`, ou un
  lieu ou une activité simple (`office`, `kitchen`, `outdoors`). Exemples :
  `young woman casual smiling`, `man 45 office headshot`,
  `mature woman candid street`.
- Donne l'âge en chiffres quand la description le précise et qu'il compte :
  `man 45 portrait`, `woman 40 headshot`.
- Personnage non humain ou personne réelle (cela ne devrait plus arriver ici) :
  `{ "p": "", "o": "" }`.

## Étape 2 — chercher (ce n'est pas toi)

La séance principale lance la recherche. Chaque personnage a jusqu'à douze
photos numérotées de 0 à 11 : en général 0 à 5 viennent de Pixabay et 6 à 11
d'Openverse.

## Étape 3 — choisir

Regarde **chaque feuille** (outil Read), en relisant la description du
personnage. Écris `<dossier>/choix-<N>.json` :

    { "k": { "n": 3, "avis": "bon", "note": "" }, … }

**Ce qui change par rapport au premier tour : la fidélité.**

- `bon` : le sexe et la tranche d'âge correspondent, l'allure ne contredit pas
  la description, et l'auteur pourrait y voir son personnage. L'origine, le
  métier ou un détail (couleur des cheveux, barbe) n'ont plus besoin de
  coller exactement.
- `moyen` : plausible mais un point cloche nettement (origine visiblement
  différente quand la description y insiste, allure à l'opposé du
  personnage). Sarah les reverra.
- `rien` : aucune photo acceptable.
- `note` : pour `moyen` et `rien`, une phrase courte en français qui dit ce qui
  cloche, et qui décrit bien la photo choisie. Vide pour `bon`.

**Ce qui ne change pas, sans exception :**

- Une seule personne, le visage bien visible.
- Une **vraie photographie** : pas de tableau, de gravure, de dessin, de statue
  (Openverse en propose beaucoup, venus des musées : « Portrait Seated… » est
  presque toujours une peinture), ni d'image générée par ordinateur (peau
  trop lisse ou parfaite, regard vitreux, lumière irréelle, mains déformées,
  tout-petits « parfaits »). Une vieille photographie en noir et blanc
  convient, surtout pour un personnage d'époque.
- Jamais de nudité, de torse nu, de décolleté, d'épaules nues, de tenue
  moulante avec pose de magazine, ni de pose glamour ou suggestive. Pour un
  enfant ou un adolescent : habillé, pose ordinaire, rien d'ambigu.
- Pas de personne allongée ou endormie.
- Jamais une personnalité connue pour un personnage de fiction (chef d'État,
  général célèbre, vedette).
- L'âge écrit dans la description prime sur le menu.
- Dans le doute entre `moyen` et `rien`, choisis `rien`.

Tu ne fais rien d'autre : tu ne lances aucune commande, tu n'écris pas dans la
base, tu ne modifies aucun fichier du projet. À la fin, réponds seulement par
le compte des bons, des moyens et des riens, et le chemin de `choix-<N>.json`.
