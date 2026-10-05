Lis les consignes /home/wfg/projects/wefilmgood/scripts/mots-cles-consignes-projets.md et applique-les à la lettre.

Ton lot est `lot-N.json` dans le dossier D indiqué par la commande qui te l'a confié (40 projets : id, empreinte, texte, courte).
Écris `resultat-N.json` dans le même dossier : un tableau JSON valide, exactement une entrée par projet du lot, `id` et `empreinte` recopiés tels quels, `"genre": "projet"`, `tagline` (ou null) et `mots`.
Tu ne lances aucune commande de pose, tu n'écris pas dans la base, tu ne modifies aucun fichier du projet. Vérifie avant de finir : JSON valide, 40 entrées, chaque tagline de 160 caractères au plus, aucune tagline qui commence par un pronom (il, elle, ils, elles).
Réponds seulement par : le nombre d'entrées et le nombre de taglines null.
