/**
 * « Les Cinéastes parlent de nous » : les huit messages de soutien de
 * l'accueil de WFG 1 (citations, noms, métiers et films repris tels quels,
 * photos dans public/soutiens). Depuis le 13/11/2026 (Sarah), ils sont
 * dans la sphère des témoignages de l'accueil, signés — à la différence
 * des témoignages des membres, qui y restent anonymes.
 */
export type Soutien = { id: string; nom: string; credits: string; citation: string; image: string };

export const SOUTIENS_CINEASTES: Soutien[] = [
  {
    id: "soutien-terry_jones",
    nom: "Terry Jones",
    credits: "Scénariste, Réalisateur, Comédien — (Monty Python, Personal Services, Absolutely Anything...)",
    citation: "Without a script a feature film cannot exist. Screenwriters create feature films. It's as simple as that. I wish the best of luck to the support team at the Maison des Scénaristes.",
    image: "/soutiens/terry_jones.png",
  },
  {
    id: "soutien-jon_amiel",
    nom: "Jon Amiel",
    credits: "Scénariste, Réalisateur — (Haute voltige, Copycat, Sommersby...)",
    citation: "If Hollywood ensured that the filmaker and the script are given the thorough attention and inspired engineering they absolutely demand and deserve, there'd be far fewer plane wrecks. Good luck with your new venture!",
    image: "/soutiens/jon_amiel.png",
  },
  {
    id: "soutien-yves_amoureux",
    nom: "Yves Amoureux",
    credits: "Scénariste, Réalisateur — (Le Beauf, le Double de ma moitié...)",
    citation: "Enfin ! Ce n'est pas trop tôt ! La création d'une plateforme du rêve, car avant tout le scénario doit faire rêver, visionnaire tragique, comique ou tout simplement témoin de son temps. Longue vie à WeFilmGood !",
    image: "/soutiens/yves_amoureux.png",
  },
  {
    id: "soutien-emilie_deleuze",
    nom: "Emilie Deleuze",
    credits: "Scénariste, Réalisatrice — (Peau neuve, Tout est permis, Jamais contente...)",
    citation: "Bravo à la Maison des Scénaristes ! Plus on s'occupe des scénaristes, plus on a de chances de voir de bons films!",
    image: "/soutiens/emilie_deleuze.png",
  },
  {
    id: "soutien-jean_louis_milesi",
    nom: "Jean-Louis Milesi",
    credits: "Scénariste — (Les Neiges du Kilimandjaro, Marius et Jeannette...) Réalisateur — (Fragile, Lino...)",
    citation: "Faut-il appeler ça « maison » ? Est-ce que refuge ne serait pas plus approprié ?... Va pour maison. C'est dans la cuisine que se concoctent les meilleurs scénars. Alors, cette maison, notre maison, pensez-la cuisine avant tout.",
    image: "/soutiens/jean_louis_milesi.png",
  },
  {
    id: "soutien-bob_swaim",
    nom: "Bob Swaim",
    credits: "Scénariste, Réalisateur, Comédien — (la Balance, Escort girl, le Défi...)",
    citation: "With La Maison Des Scénaristes, the writer is no longer alone; he is collectively recognized and supported. One should remember, as Joseph L. Mankiewicz wrote, “every directed movie is a screenplay.",
    image: "/soutiens/bob_swaim.png",
  },
  {
    id: "soutien-patrice_leconte",
    nom: "Patrice Leconte",
    credits: "Scénariste, Réalisateur — (Tandem, Monsieur Hire, Ridicule...)",
    citation: "Les scénaristes sont des écrivains souvent bien solitaires, en plus d'être rarement bien payés. Si la Maison des Scénaristes permet de renverser la tendance (réunions, convivialité, échange d'idées, discussions de projets, coups de main, et surtout cachets en hausse), alors vous n'aurez pas fait tout cela pour rien.",
    image: "/soutiens/patrice_leconte.png",
  },
  {
    id: "soutien-agnes_soral",
    nom: "Agnès Soral",
    credits: "Comédienne, Scénariste — (Tchao Pantin, Bleu comme l'enfer...)",
    citation: "Le scénario c'est la pierre qui donne le diamant, si elle est mal taillée, on aura beau la lustrer, elle ne brillera jamais. Longue vie à la Maison des Scénaristes, pour que les diamants soient éternels.",
    image: "/soutiens/agnes_soral.png",
  },
];
