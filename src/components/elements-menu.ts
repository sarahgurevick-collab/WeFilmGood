/** La liste du « Menu » : la même sur la bande blanche (EnTeteAnime) et sur
    la barre noire (MenuBarre, 24/11). */
export const ELEMENTS_MENU: { label: string; href: string; special?: boolean }[] = [
  // En tête, les deux éléments vivants du site (Sarah, 24/10 : « tout le
  // reste sont des informations dormantes »). « Ciné » reste fixe en rouge
  // WeFilmGood, la suite du mot suit la même horloge que le logo — les
  // trois couleurs des engagements, Planet, Humanity, Education. Un
  // battement sur quatre, les deux mots sont au rouge : la fusion.
  { label: "CinéCrush", href: "/cinecrush", special: true },
  { label: "CinéMatch", href: "/cinematch", special: true },
  { label: "Adhésion", href: "/adhesion" },
  { label: "Nos appels à projets", href: "/appels-a-projets" },
  { label: "ScenarioLabs", href: "/ateliers" },
  { label: "Maison des Scénaristes", href: "/association" },
  { label: "Masterclass", href: "/masterclass" },
  { label: "Ils parlent de nous", href: "/presse" },
  { label: "Notre histoire", href: "/notre-histoire" },
  { label: "Témoignages", href: "/temoignages" },
  { label: "Tutoriels", href: "/tutoriels" },
];
