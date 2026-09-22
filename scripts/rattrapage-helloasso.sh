#!/usr/bin/env bash
# Rattrapage horaire des paiements HelloAsso (crontab de l'utilisateur
# wfg, à chaque heure pile) : au cas où une notification se serait
# perdue, le site revérifie les adhésions en attente. Le jeton est lu
# dans .env.local, jamais écrit dans la crontab.
set -euo pipefail
JETON=$(grep '^HELLOASSO_RATTRAPAGE_JETON=' "$(dirname "$0")/../.env.local" | cut -d= -f2-)
curl -s -m 60 -X POST -H "Authorization: Bearer $JETON" https://app.wefilmgood.com/api/helloasso/rattrapage
echo
