#!/usr/bin/env bash
# Rattrapage horaire des vecteurs de sens (crontab de l'utilisateur wfg) :
# les mots-clés apparus depuis reçoivent leur vecteur. Même jeton que le
# rattrapage HelloAsso, lu dans .env.local.
set -euo pipefail
JETON=$(grep '^HELLOASSO_RATTRAPAGE_JETON=' "$(dirname "$0")/../.env.local" | cut -d= -f2-)
curl -s -m 300 -X POST -H "Authorization: Bearer $JETON" https://app.wefilmgood.com/api/vecteurs/rattrapage
echo
