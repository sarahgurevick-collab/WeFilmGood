/**
 * Les modèles d'OpenRouter qui font parler Mira et qui relisent les avis
 * CinéCrush. Sarah, 09/11/2026 : « je ne veux pas mettre de crédit […] je
 * voudrais essayer avec une gratuite » — des modèles gratuits donc, tant
 * que WFG 2 est fermé. À revoir avant l'ouverture : le gratuit a un nombre
 * de réponses par jour limité pour tout le site, et ses fournisseurs
 * peuvent conserver les conversations.
 *
 * Dans l'ordre : OpenRouter essaie le premier, et passe au suivant s'il
 * est saturé ou retiré. Avant le 09/11 : "minimax/minimax-m3" (payant).
 */
export const MODELES_OPENROUTER = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
];
