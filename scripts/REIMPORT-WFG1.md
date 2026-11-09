# Réimportation finale de WFG 1 dans WFG 2 — mode d'emploi

Ce document explique comment rejouer la dernière copie de WFG 1 sur WFG 2
le jour de la bascule. Deux scripts font le travail :

- `scripts/charger-dump-wfg1.mjs` : lit le fichier de sauvegarde MySQL de WFG 1
  et le recopie dans la base de WFG 2, dans un tiroir à part (le schéma
  `wfg1_final`). Rien de WFG 2 n'est touché.
- `scripts/reimporter-wfg1.mjs` : compare ce tiroir avec la copie de septembre
  (schéma `wfg1`) et avec WFG 2, puis ajoute ce qui est nouveau. Il a un
  mode **essai** qui ne fait qu'un rapport, sans rien écrire.

## La règle, en une phrase

On ajoute ce qui est apparu sur WFG 1 depuis la copie de septembre ; on ne
touche jamais à ce qui existe déjà sur WFG 2. Pour un profil ou une fiche
déjà repris, seuls les champs **vides** sur WFG 2 sont complétés, et
seulement si WFG 1 a changé entre les deux copies. Rien n'est écrasé, rien
n'est supprimé. Ce qui a été écarté, supprimé ou fusionné exprès sur WFG 2
depuis septembre (doublons, comptes de test, faux comptes de juin 2026,
clés Finder…) ne revient pas : la copie de septembre sert de témoin.

## Ce que Sarah doit fournir mardi 10 novembre 2026

1. **Le fichier de sauvegarde de la base WFG 1** (le « dump » MySQL, fait par
   l'ami hébergeur comme en septembre, depuis phpMyAdmin). Le déposer dans le
   dossier `~/imports/` du serveur, par exemple sous le nom
   `~/imports/wfg1-final.sql`. Jamais dans le dossier du code (il contient
   des données personnelles).
2. **Les fichiers**, par le FTP o2switch (le web ne sert pas les archives du
   jour) :
   - les images : le dossier `img` (avatars, vignettes des projets,
     portraits des personnages), à dézipper dans `~/imports/extrait/img/` ;
   - les documents des projets : le dossier `data/projects` (scénarios, PDF
     annexes, photos de moodboard), dans `~/imports/docs/`.
3. **L'heure du gel de WFG 1** : à partir de cette heure, plus aucune
   modification faite sur WFG 1 ne sera reprise.

Avant de lancer quoi que ce soit : vérifier qu'une sauvegarde de WFG 2 de la
nuit existe (`~/sauvegarde-prete`), et que personne ne travaille dans
l'administration pendant la dizaine de minutes de l'application.

## Sans l'ami hébergeur : tout faire depuis cPanel

En septembre, l'ami hébergeur a fait trois choses, toutes depuis cPanel
(l'espace de gestion de l'hébergement o2switch) : la sauvegarde de la base
depuis phpMyAdmin, la création des comptes FTP, et la remise des accès.
Sarah peut les faire elle-même si elle a l'identifiant et le mot de passe
de cPanel (ou de l'espace client o2switch, qui y mène). Rien ne presse :
chaque étape se fait à son rythme, et aucune n'abîme WFG 1.

Les noms des menus ci-dessous sont ceux du cPanel standard en français ;
ils peuvent différer d'un mot chez o2switch. En cas de doute, une capture
d'écran suffit pour s'y retrouver.

### Le chemin le plus simple : une sauvegarde complète en un clic

1. Dans cPanel, ouvrir **Sauvegarde** (section « Fichiers »).
2. Sous **Télécharger une sauvegarde complète du site Web**, choisir
   « Destination de sauvegarde : Répertoire d'accueil », laisser l'adresse
   e-mail pour être prévenue, puis **Générer la sauvegarde**. cPanel fabrique
   un fichier `backup-<date>_<identifiant>.tar.gz` à la racine de
   l'hébergement (pas dans `public_html`). Il contient la base MySQL
   (dossier `mysql/`), les images (`homedir/public_html/assets/img/`) et les
   documents (`homedir/data/projects/`) : les trois choses dont on a besoin,
   figées au même instant. Compter de quelques minutes à une heure (une
   vingtaine de Go). L'e-mail dit quand c'est fini.
3. Ouvrir **Comptes FTP**, créer un compte (par exemple
   `bascule@wefilmgood.com`) avec le **répertoire `/`** (la racine, et non
   `public_html`), un mot de passe généré, et me le transmettre avec le nom
   du serveur (`ftp.wefilmgood.com`). Le mot de passe ne va nulle part dans
   le code ; le compte est à **supprimer** une fois le transfert fini.
4. Je rapatrie le fichier sur le serveur de WFG 2 par FTP, comme en
   septembre, je l'ouvre dans `~/imports/final/`, puis j'en tire :
   - la base : `mysql/ouifeelm_good.sql` → c'est le fichier de l'étape 1
     ci-dessous (le chargeur lit ce format aussi) ;
   - les images et documents nouveaux : copiés **sans rien remplacer** dans
     `~/imports/extrait/img/` et `~/imports/docs/`, où les scripts
     d'images et de documents les trouvent (ils ne redéposent jamais ce qui
     est déjà sur WFG 2).

La sauvegarde complète double un moment l'espace occupé chez o2switch ;
le fichier se supprime depuis le **Gestionnaire de fichiers** quand tout
est rapatrié. Sur le serveur de WFG 2, il y a la place (78 Go libres au
08/11).

### Sinon, pièce par pièce

- **La base seule** : dans **Sauvegarde**, sous « Télécharger une
  sauvegarde de base de données MySQL », cliquer sur `ouifeelm_good` :
  le fichier `ouifeelm_good.sql.gz` arrive sur l'ordinateur de Sarah. Le
  chargeur lit ce fichier compressé tel quel. Pour le mettre sur le serveur
  de WFG 2 sans le décompresser : le déposer dans un dossier `sauvegardes/`
  créé à la racine de l'hébergement avec le **Gestionnaire de fichiers**
  (bouton « Charger »), et je le prends par FTP ; ou bien phpMyAdmin →
  onglet **Exporter** → « Rapide » → Exécuter, qui donne le même fichier
  qu'en septembre, non compressé (3 Go, long à télécharger : préférer la
  sauvegarde cPanel).
- **Les images et les documents** : avec le compte FTP à la racine,
  je ne télécharge que ce qui manque dans `public_html/assets/img/` et
  `data/projects/` par rapport à septembre.

### Ce qu'il faut savoir avant de commencer

- L'**heure de la sauvegarde** devient l'heure du gel : tout ce qui est
  fait sur WFG 1 après n'est pas repris. Le mieux est de prévenir les
  membres avant, ou de fermer les inscriptions et dépôts sur WFG 1.
- Si Sarah n'a **pas** les accès cPanel, la seule chose à demander à l'ami
  hébergeur est de les lui donner (ou de créer un utilisateur cPanel pour
  elle) : cinq minutes de son temps, et le reste se fait sans lui.

## Les étapes, dans l'ordre

Toutes les commandes se lancent depuis le dossier du code
(`cd ~/projects/wefilmgood`).

### 1. Charger la copie finale dans la base (10 à 20 minutes)

```bash
node scripts/charger-dump-wfg1.mjs --dump ~/imports/wfg1-final.sql --schema wfg1_final
```

Le fichier peut être celui d'un export phpMyAdmin (comme en septembre),
celui d'une sauvegarde cPanel (`ouifeelm_good.sql.gz`, compressé : le
script le lit tel quel) ou le `mysql/ouifeelm_good.sql` tiré d'une
sauvegarde complète. Le script affiche, table par table, le nombre de
lignes chargées à côté de celui de la copie de septembre : les nombres doivent être égaux ou plus
grands (il y a eu des inscriptions et des dépôts depuis). S'il refuse parce
que le schéma existe déjà (un essai précédent), ajouter `--remplacer`.

### 2. L'essai à blanc (une dizaine de secondes)

```bash
node scripts/reimporter-wfg1.mjs --essai
```

Rien n'est écrit : tout est joué dans la base puis annulé. Le rapport est
écrit dans `~/imports/reimport-wfg1-essai-<date>.md` (et `.json` pour le
détail complet). Il dit, en tête, combien de comptes, de projets, de
personnages, de mots-clés, de sélections, de liens d'équipe, de fiches de
lecture et de messages seraient ajoutés, et lesquels. Il liste aussi :

- les comptes et projets **écartés**, avec le motif ;
- les **profils, fiches et personnages modifiés sur WFG 1 depuis
  septembre** alors que WFG 2 a déjà sa valeur : ils ne sont **pas** repris
  (WFG 2 gagne), c'est à décider ensemble au cas par cas ;
- les adresses e-mail en double entre un nouveau compte WFG 1 et un compte
  WFG 2 : à regarder avant d'appliquer (un même talent ne doit jamais
  figurer deux fois).

Relire ce rapport avec Sarah. Si quelque chose cloche, on corrige le script
et on relance l'essai : il est répétable à volonté.

### 3. Appliquer (pour de vrai)

```bash
node scripts/reimporter-wfg1.mjs --appliquer
```

Même travail, en une seule transaction : si une étape échoue, rien n'est
écrit. Avant d'écrire, le script enregistre telles quelles les lignes de WFG 2
qu'il va compléter dans `~/imports/reimport-wfg1-applique-<date>-sauvegarde.json`
(pour pouvoir revenir en arrière à la main), puis écrit le rapport
`~/imports/reimport-wfg1-applique-<date>.md`.

Les nouveaux comptes reçoivent un compte de connexion à l'adresse confirmée,
sans aucun e-mail envoyé : chacun recevra son lien magique le jour où il se
connectera, comme les 13 000 autres.

### 4. Les fichiers, puis les finitions

Dans cet ordre, chacun ne dépose que ce qui manque et ne remplace rien :

```bash
node scripts/importer-images-wfg1.mjs
```

```bash
node scripts/importer-docs-wfg1.mjs
```

```bash
node scripts/creer-profils-equipes-wfg1.mjs --a-blanc
```

(puis sans `--a-blanc` : crée un profil en attente pour les équipiers sans
compte, comme le 19/10)

```bash
node scripts/corriger-accents.mjs essai
```

(puis `appliquer` : rend leurs accents aux textes arrivés avec « e? »)

Les nouvelles fiches reçoivent leurs vecteurs par le rattrapage horaire ;
leur tagline et leurs mots-clés IA se font ensuite comme pour les autres.

### 5. Après coup : remplacer la copie de septembre (facultatif)

Les écrans d'administration qui lisent l'ancienne base (anciennes fiches de
lecture d'un lecteur, métiers de WFG 1, dates de dépôt) lisent le schéma
`wfg1`. Une fois la réimportation vérifiée, on peut y verser la copie finale,
table par table, sans casser ces écrans :

```bash
docker exec supabase-db psql -U postgres -c "do \$\$ declare t text; begin for t in select table_name from information_schema.tables where table_schema = 'wfg1_final' loop execute format('truncate wfg1.%I', t); execute format('insert into wfg1.%I select * from wfg1_final.%I', t, t); end loop; end \$\$;"
```

Puis, quand tout est bon, `drop schema wfg1_final cascade`. Tant que ce n'est
pas fait, la copie de septembre reste intacte et sert de témoin.

## Ce que le script reprend, et comment

| Quoi | D'où (WFG 1) | Vers (WFG 2) | Règle |
|---|---|---|---|
| Comptes | `accounts` | compte de connexion + `profiles` | nouveaux numéros seulement ; jamais les lecteurs, l'admin, les 762 faux comptes, `membres_supprimes`, les exclus (3866, 8144, 10560, 10563, 10576, 4627, 1009), les adresses de garage, une adresse déjà prise sur WFG 2 |
| Profils | `accounts`, `user_data`, `testimonials` | prénom, nom, ville, pays, biographie (fr sinon en), catégorie, validation (« Validé » sur WFG 1), témoignage, portrait chinois, langues, métiers | champ vide sur WFG 2 + changé sur WFG 1 depuis septembre |
| Projets | `projects` | fiche, format, genre et sous-genres, pays, langue, budget et public (pas pour un court métrage), bandeau, statut (9 → labellisé, sinon déposé), date de dépôt | nouveaux numéros ; compléments des champs vides |
| Personnages | `characters_sheet` | nom, description (fr sinon en), principal/secondaire, genre, âge | nouveaux numéros, sauf homonyme déjà sur la fiche |
| Mots-clés | jetons `famille-numéro` de la fiche et des personnages, codes abîmés compris | familles 2-6 → mots-clés (source `wfg1`), 7 → sélections (les clés Finder sont refusées), 8 → comédiens envisagés | fiches nouvelles ou dont les mots-clés ont changé ; jamais « Royaume-Uni » (5-0) |
| Équipes | `people_linked`, `co_authors` | `project_co_authors`, acceptés, métier d'après le code WFG 1 | nouveaux liens ; jamais l'auteur lui-même ni une adresse invalide |
| Fiches de lecture | `projects_review` | `legacy_reading_reports` | nouvelles fiches ; une fiche validée par Sarah depuis septembre monte de statut |
| Messages | `chat` | `project_messages`, lus, hors projet | nouveaux messages entre deux profils (comme la migration 0169) |
| Videopitchs | `projects.videopitchs` | `project_videopitchs` | numéros Vimeo des fiches qui n'en ont pas |

Non repris, comme au premier import : les pseudonymes, le site web, l'agent
et IMDb des profils, les mots-clés des fiches de personnages, les pages
« Finder », les lecteurs de WFG 1.

## Si quelque chose se passe mal

- L'essai ou l'application s'arrête avec un message d'erreur : rien n'a été
  écrit (transaction annulée). Me transmettre le message.
- Une erreur découverte après l'application : les lignes modifiées sont dans
  le fichier `-sauvegarde.json` ; les lignes ajoutées se reconnaissent à leur
  `legacy_id` (numéro WFG 1) et à la date d'ajout.
- Le script peut être relancé : il ne crée jamais deux fois la même chose.

## Test à blanc du 8 novembre 2026

Le chargeur accepte depuis le 08/11 le format des sauvegardes cPanel
(mysqldump : plusieurs enregistrements par ligne, sans liste de colonnes)
et les fichiers compressés `.gz` ; testé sur un fichier fabriqué dans ce
format à partir de la copie de septembre (4 comptes identiques à l'octet
près, table `coupons` complète). Le script de réimportation a été testé
sur la copie de septembre prise à la fois comme
source et comme référence : **0 ajout, 0 complément**, comme attendu
(tout est déjà repris). Le chargeur a été testé sur le dump de septembre
(12 tables rechargées dans un schéma d'essai, mêmes nombres de lignes,
contenu identique à l'octet près sauf 185 textes où la nouvelle lecture
rend mieux les accents que celle de septembre), puis le schéma d'essai a
été supprimé. Sans la copie de septembre comme témoin, le même essai
voudrait ramener 1 compte et 6 projets supprimés exprès sur WFG 2 : c'est
ce que la référence empêche.
