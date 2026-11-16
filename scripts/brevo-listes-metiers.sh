#!/bin/bash
# Chaque nuit : les listes par métier de Brevo reflètent les membres de WFG 2.
cd /home/wfg/projects/wefilmgood && /usr/bin/node scripts/brevo-listes-metiers.mjs
