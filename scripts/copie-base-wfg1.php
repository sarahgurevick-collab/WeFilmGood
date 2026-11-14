<?php
// Copie de la base de WFG 1 dans ~/wfg-backups/wfg1-final.sql.gz (lecture seule, rien n'est modifié).
// Les identifiants sont lus dans la configuration du site et ne sont jamais affichés.
define('BASEPATH', 'x'); define('ENVIRONMENT', 'production');
$base = getenv('HOME') . '/wefilmgood.com/application/config/';
$fichier = is_file($base . 'production/database.php') ? $base . 'production/database.php' : $base . 'database.php';
include $fichier;
$g = isset($active_group) ? $active_group : 'default';
$d = $db[$g];
putenv('MYSQL_PWD=' . $d['password']);
$hote = $d['hostname'] ?: 'localhost';
$sortie = getenv('HOME') . '/wfg-backups/wfg1-final.sql.gz';
$cmd = 'mysqldump --single-transaction --quick --skip-lock-tables --default-character-set=utf8mb4 -h ' . escapeshellarg($hote)
     . ' -u ' . escapeshellarg($d['username']) . ' ' . escapeshellarg($d['database'])
     . ' 2> ' . escapeshellarg($sortie . '.erreurs') . ' | gzip > ' . escapeshellarg($sortie);
echo "Base : {$d['database']} — copie en cours, patientez...\n";
passthru($cmd, $code);
clearstatcache();
echo "Fini. Taille : " . round(filesize($sortie) / 1048576) . " Mo. Erreurs : " . (trim((string) @file_get_contents($sortie . '.erreurs')) ?: 'aucune') . "\n";
