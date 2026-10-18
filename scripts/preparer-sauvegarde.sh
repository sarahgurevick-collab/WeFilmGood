#!/bin/bash
# Prépare chaque matin le fichier de sauvegarde à télécharger (18/10/2026) :
# la sauvegarde de la nuit + les réglages du site + un LISEZMOI, en un seul
# .tar rangé dans ~/sauvegarde-prete/. Le site le sert ensuite avec reprise
# possible (un téléchargement coupé repart d'où il s'était arrêté).
# Un seul fichier gardé à la fois (7,6 Go).
set -euo pipefail
SRC=/srv/backups/supabase
DEST=/home/wfg/sauvegarde-prete
DERNIERE=$(ls "$SRC" | grep -E '^[0-9]{8}T[0-9]{6}Z$' | sort | tail -1)
[ -n "$DERNIERE" ] || { echo "aucune sauvegarde"; exit 1; }
NOM="wefilmgood-sauvegarde-${DERNIERE:0:8}.tar"
mkdir -p "$DEST"
[ -f "$DEST/$NOM" ] && { echo "déjà prêt : $NOM"; exit 0; }

DATE_FR=$(TZ=Europe/Paris date -d "${DERNIERE:0:4}-${DERNIERE:4:2}-${DERNIERE:6:2} ${DERNIERE:9:2}:${DERNIERE:11:2} UTC" '+%d/%m/%Y à %H:%M')
LISEZMOI=/home/wfg/.sauvegarde-LISEZMOI.txt
cat > "$LISEZMOI" <<TXT
Sauvegarde complète de WeFilmGood (app.wefilmgood.com), prise le $DATE_FR.

postgres.sql.gz : toute la base de données (membres, projets, fiches de lecture, messages, ancienne base WFG 1).
storage.tar.gz : tous les fichiers déposés (scénarios, images, photos, documents).
config.tar.gz : la configuration de Supabase.
SHA256SUMS : les empreintes pour vérifier que rien n'est abîmé.
.env.local, wefilmgood-tampons.conf, supabase-backup, supabase-backup.timer : les réglages du site.

CE FICHIER CONTIENT LES DONNÉES PERSONNELLES DES MEMBRES ET LES CLÉS SECRÈTES DU SITE.
À garder sur un disque chiffré, chez vous. Pour restaurer le site : demander à Claude.
TXT

ARGS=(-cf "$DEST/.$NOM.en-cours" -C "$SRC/$DERNIERE" postgres.sql.gz storage.tar.gz config.tar.gz SHA256SUMS -C /home/wfg .sauvegarde-LISEZMOI.txt)
for f in /home/wfg/projects/wefilmgood/.env.local /etc/nginx/conf.d/wefilmgood-tampons.conf /usr/local/sbin/supabase-backup /etc/systemd/system/supabase-backup.timer; do
  [ -r "$f" ] && ARGS+=(-C "$(dirname "$f")" "$(basename "$f")")
done
tar "${ARGS[@]}"
chmod 600 "$DEST/.$NOM.en-cours"
mv "$DEST/.$NOM.en-cours" "$DEST/$NOM"
find "$DEST" -maxdepth 1 -name 'wefilmgood-sauvegarde-*.tar' ! -name "$NOM" -delete
echo "prêt : $NOM"
