// Marches 3 et 4 du genre (04/11, Sarah) : Fiction OU Documentaire (un seul) ;
// pour la technique, au moins une case, plusieurs possibles. « Contenu IA » = images ou voix faites par l'IA.
export const POSTURES = [
  { value: "fiction", label: "Fiction" },
  { value: "documentaire", label: "Documentaire" },
];
export const TECHNIQUES = [
  { value: "prises_de_vues_reelles", label: "Prise de vues réelles" },
  { value: "animation", label: "Animation" },
  { value: "contenu_ia", label: "Contenu IA" },
  // 07/11, Sarah : pour les projets qui mêlent les techniques.
  { value: "medias_mixtes", label: "Contenus hybrides" },
  // 09/11, Sarah : « Dans la dernière marche, rajouter formats immersifs (360/VR) ».
  { value: "formats_immersifs", label: "Formats immersifs (360/VR)" },
];
