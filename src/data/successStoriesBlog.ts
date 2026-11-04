// Les success stories du blog de la Maison (maisondesscenaristes.org/blog/success-stories,
// reprises le 28/10/2026 dans la table _ss), dans l'ordre du blog : longs puis courts.
// Vignettes allégées (480 × 270) dans public/success-stories, tirées des fiches WFG 2
// le 04/11/2026. Sans fiche ou sans vignette : image nulle, le carrousel dessine le titre.
export type SuccessStoryBlog = {
  titre: string;
  format: "CM" | "LM";
  statut: "signe" | "tourne" | null;
  projetId: string | null;
  image: string | null;
  /** L'affiche du film (portrait), pour les films tournés : à trouver (04/11). */
  affiche: string | null;
  auteur: string | null;
};

export const SUCCESS_STORIES_BLOG: SuccessStoryBlog[] = [
  {
    "titre": "You will die at 20",
    "auteur": "Amjad Abu Alala",
    "format": "LM",
    "statut": "tourne",
    "projetId": "11b4d384-3038-4a8e-8ed3-d948d59eb294",
    "image": "/success-stories/1.jpg",
    "affiche": null
  },
  {
    "titre": "L'autre Maison",
    "auteur": "Mathieu Roy",
    "format": "LM",
    "statut": "tourne",
    "projetId": "ffdd36b0-d372-4ef0-8d3c-c2fce8a68c3b",
    "image": null,
    "affiche": null
  },
  {
    "titre": "New Territories",
    "auteur": "Fabianny Deschamps",
    "format": "LM",
    "statut": "tourne",
    "projetId": "70a545d2-2396-4b1f-ba58-af46e965787a",
    "image": "/success-stories/3.jpg",
    "affiche": null
  },
  {
    "titre": "Les bienheureux",
    "auteur": "Sofia Djama",
    "format": "LM",
    "statut": "tourne",
    "projetId": "775cdb98-0712-47fe-a5f2-e179785c2788",
    "image": "/success-stories/4.jpg",
    "affiche": null
  },
  {
    "titre": "Ava",
    "auteur": "Sadaf Foroughi",
    "format": "LM",
    "statut": "tourne",
    "projetId": "68d261e2-9125-4905-95ad-017df4c0079f",
    "image": "/success-stories/5.jpg",
    "affiche": null
  },
  {
    "titre": "Walter",
    "auteur": "Frédéric Laurent",
    "format": "LM",
    "statut": "signe",
    "projetId": "d3f7200f-e6ff-4028-8a4f-a16fc22738d6",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Séance spéciale",
    "auteur": "Estelle Dumas",
    "format": "LM",
    "statut": "signe",
    "projetId": "cbc13d71-ca9b-4329-b3df-5006ed5ab01d",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Lola et moi",
    "auteur": "Yanie Dupont-Hebert",
    "format": "LM",
    "statut": "signe",
    "projetId": "8c81defb-db87-4144-952a-3aecbc1f27e3",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Hei's",
    "auteur": "Anaïs Volpe",
    "format": "LM",
    "statut": "tourne",
    "projetId": "79f52711-cc61-47b2-b690-7fce9b72905a",
    "image": null,
    "affiche": null
  },
  {
    "titre": "African Arvest",
    "auteur": "Marise Samitier",
    "format": "LM",
    "statut": "signe",
    "projetId": "f40c2c20-879e-448a-996e-19fbc1d8d719",
    "image": "/success-stories/10.jpg",
    "affiche": null
  },
  {
    "titre": "When I'm done dying",
    "auteur": "Nisan Dag",
    "format": "LM",
    "statut": "tourne",
    "projetId": "caedfde2-eebb-4314-b41a-f2e498e8b226",
    "image": "/success-stories/11.jpg",
    "affiche": null
  },
  {
    "titre": "Little bullet",
    "auteur": "Daniele Esposito",
    "format": "LM",
    "statut": "signe",
    "projetId": "5ec4ffe0-b12a-45f0-92cc-b2bcf484acd2",
    "image": "/success-stories/12.jpg",
    "affiche": null
  },
  {
    "titre": "Doha",
    "auteur": "Eimi Imanishi",
    "format": "LM",
    "statut": "signe",
    "projetId": "855f9468-76c3-46de-aa7a-90c5c5dfe1a1",
    "image": "/success-stories/13.jpg",
    "affiche": null
  },
  {
    "titre": "Les Héroïques",
    "auteur": "Maxime Roy",
    "format": "LM",
    "statut": "tourne",
    "projetId": "66bba31a-39a8-4c3d-89aa-ebc2e6586f19",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Satan Soldiers",
    "auteur": "Mpaki Molapo",
    "format": "LM",
    "statut": "signe",
    "projetId": "de7839b1-3f3c-4279-a666-fff2f43659ed",
    "image": "/success-stories/15.jpg",
    "affiche": null
  },
  {
    "titre": "B for boy",
    "auteur": "Chika Anadu",
    "format": "LM",
    "statut": "tourne",
    "projetId": "46d99677-00f6-481b-8e3c-7de607836bf9",
    "image": "/success-stories/16.jpg",
    "affiche": null
  },
  {
    "titre": "Presque heureuse",
    "auteur": "David Ergas",
    "format": "LM",
    "statut": "tourne",
    "projetId": "72770f98-4491-4f23-b3eb-d9acf44f5a1e",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Suprême authority",
    "auteur": "Mohamed Hammad",
    "format": "LM",
    "statut": "signe",
    "projetId": "ce279355-3d17-436d-9b86-e044ebbceaba",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Louise, le jour et la nuit",
    "auteur": "Guillaume Kozakiewiez",
    "format": "LM",
    "statut": "signe",
    "projetId": "47e54716-a60e-48cc-b7bb-810ad7c399e3",
    "image": "/success-stories/19.jpg",
    "affiche": null
  },
  {
    "titre": "Tue moi papa",
    "auteur": "Marc Koenig",
    "format": "LM",
    "statut": "signe",
    "projetId": "0ece08d5-c613-4857-a9fa-43463df278f9",
    "image": "/success-stories/20.jpg",
    "affiche": null
  },
  {
    "titre": "Snow and the bear",
    "auteur": "Selcen Ergun",
    "format": "LM",
    "statut": "signe",
    "projetId": "74893285-98c0-46f7-b75b-e08ce937d9fd",
    "image": "/success-stories/21.jpg",
    "affiche": null
  },
  {
    "titre": "C'est qui le Patron",
    "auteur": "Quentin Lestienne",
    "format": "LM",
    "statut": "signe",
    "projetId": "89da565f-27a3-44d6-8594-74e266e760ee",
    "image": "/success-stories/22.jpg",
    "affiche": null
  },
  {
    "titre": "Le passage",
    "auteur": "Capucine de Lavigne",
    "format": "LM",
    "statut": "signe",
    "projetId": "92dd0c92-2091-4e68-95e6-e77bbb967b45",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Sur la peau",
    "auteur": "Srinath",
    "format": "LM",
    "statut": "tourne",
    "projetId": "d2c1ade0-48bf-4ba1-ac54-c7e210de94a8",
    "image": "/success-stories/24.jpg",
    "affiche": null
  },
  {
    "titre": "My little one",
    "auteur": "Frédéric Choffat",
    "format": "LM",
    "statut": "tourne",
    "projetId": "cde33390-a2d3-449a-a4a6-f4ce9af581b2",
    "image": "/success-stories/25.jpg",
    "affiche": null
  },
  {
    "titre": "Le géant dans l'oursin",
    "auteur": "Jean Philippe Rozec",
    "format": "LM",
    "statut": "signe",
    "projetId": "5c9e6b0b-5b7a-4e32-999c-16e589a7de64",
    "image": "/success-stories/26.jpg",
    "affiche": null
  },
  {
    "titre": "Le dernier client",
    "auteur": "Emmanuel Dehaene",
    "format": "CM",
    "statut": "tourne",
    "projetId": "2ff9f477-e23d-4744-bc2e-85383356571f",
    "image": "/success-stories/27.jpg",
    "affiche": null
  },
  {
    "titre": "Les défaillants",
    "auteur": "Nicolas Barbey",
    "format": "CM",
    "statut": "tourne",
    "projetId": "3a108ba5-5815-457e-b048-128512340265",
    "image": "/success-stories/28.jpg",
    "affiche": null
  },
  {
    "titre": "Haut les cœurs",
    "auteur": "Adrian Moyse Dullin",
    "format": "CM",
    "statut": "tourne",
    "projetId": "1c315ba0-8063-498a-9927-a683307ebd25",
    "image": "/success-stories/29.jpg",
    "affiche": null
  },
  {
    "titre": "Negative Space",
    "auteur": "Ru Kuwahata",
    "format": "CM",
    "statut": "tourne",
    "projetId": "2a0afedd-3f12-4ed7-a930-f7581153bba7",
    "image": "/success-stories/30.jpg",
    "affiche": null
  },
  {
    "titre": "Echo",
    "auteur": "Kamil Olejnik",
    "format": "CM",
    "statut": "tourne",
    "projetId": "3cfb3d51-a993-4881-bb04-e4ff3eb68437",
    "image": "/success-stories/31.jpg",
    "affiche": null
  },
  {
    "titre": "Johnny Johnny",
    "auteur": "Angelique Muller",
    "format": "CM",
    "statut": "tourne",
    "projetId": "61f04c51-860d-4036-9ac4-c1babd26be1c",
    "image": "/success-stories/32.jpg",
    "affiche": null
  },
  {
    "titre": "L'entre-deux",
    "auteur": "Céleste Dela",
    "format": "CM",
    "statut": "tourne",
    "projetId": "7f7c41ac-2602-4294-8f0a-ec6c85bd14d4",
    "image": "/success-stories/33.jpg",
    "affiche": null
  },
  {
    "titre": "It's not a love story",
    "auteur": "Cecile Ragot",
    "format": "CM",
    "statut": "tourne",
    "projetId": "111ea04c-0a4e-4d7c-a9bd-a246b19dfb96",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Homme à tout faire",
    "auteur": "Gabriel Guerra Taveira",
    "format": "CM",
    "statut": "tourne",
    "projetId": "aeb91797-5c69-4603-8616-2356d8ecb29a",
    "image": "/success-stories/35.jpg",
    "affiche": null
  },
  {
    "titre": "La danse des mariés",
    "auteur": "Marc Gurung",
    "format": "CM",
    "statut": "tourne",
    "projetId": "a0284e5d-9012-405e-9022-23def9b7ec03",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Contumace",
    "auteur": "Nelson Rodrigo",
    "format": "CM",
    "statut": "tourne",
    "projetId": "697c215c-870a-4763-bb28-056bf91805e4",
    "image": "/success-stories/37.jpg",
    "affiche": null
  },
  {
    "titre": "Nos univers",
    "auteur": "Sofia Gutman",
    "format": "CM",
    "statut": "tourne",
    "projetId": "e94db1f0-6694-4a19-ae24-8463cc508f39",
    "image": "/success-stories/38.jpg",
    "affiche": null
  },
  {
    "titre": "Fondations",
    "auteur": "Capucine de Lavigne",
    "format": "CM",
    "statut": "signe",
    "projetId": "902ca394-1f4b-474b-be32-a89842817f87",
    "image": "/success-stories/39.jpg",
    "affiche": null
  },
  {
    "titre": "Machine",
    "auteur": "Gregory Merlin",
    "format": "CM",
    "statut": "signe",
    "projetId": "c161dd2b-b13b-43ed-97d4-66cba3e90970",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Un vrai mec",
    "auteur": "Dominique Preusse",
    "format": "CM",
    "statut": "tourne",
    "projetId": "316fa766-2c14-48c3-841f-3f6794040dee",
    "image": null,
    "affiche": null
  },
  {
    "titre": "L'anamorphose des souvenirs",
    "auteur": "Victor Halfen",
    "format": "CM",
    "statut": "signe",
    "projetId": "9fcf570c-9760-4e9e-96e9-29483de9b142",
    "image": "/success-stories/42.jpg",
    "affiche": null
  },
  {
    "titre": "Warsha",
    "auteur": "Dania Bdeir",
    "format": "CM",
    "statut": "tourne",
    "projetId": "57fceb92-de03-4f31-b5aa-17788e2af5bf",
    "image": null,
    "affiche": null
  },
  {
    "titre": "À manger pour les pauvres",
    "auteur": "Corneliu Dragomirescu",
    "format": "CM",
    "statut": "signe",
    "projetId": "5e293656-0f60-49b5-bcd4-534d5a87b88d",
    "image": "/success-stories/44.jpg",
    "affiche": null
  },
  {
    "titre": "Entretien avec un hirakiste",
    "auteur": "Fethi Benmokhtar",
    "format": "CM",
    "statut": "signe",
    "projetId": "6a1983f9-981d-4d1b-bbe4-32e24321cad4",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Vore",
    "auteur": "Stephanie Sant",
    "format": "CM",
    "statut": "tourne",
    "projetId": "8230f88a-7d3c-4b09-8f12-bc20759b9ae0",
    "image": "/success-stories/46.jpg",
    "affiche": null
  },
  {
    "titre": "La Symphonie des Marteaux",
    "auteur": "Marc Gurung",
    "format": "CM",
    "statut": "tourne",
    "projetId": "566540e9-d090-459f-84dd-4fc45acb431f",
    "image": "/success-stories/47.jpg",
    "affiche": null
  },
  {
    "titre": "3 pissenlits dans un verre d'eau",
    "auteur": "Isabelle Lukacie",
    "format": "CM",
    "statut": "tourne",
    "projetId": "77f7d269-f81c-4be9-8860-72d8c606c5fd",
    "image": null,
    "affiche": null
  },
  {
    "titre": "The place to be",
    "auteur": "Isabelle Lukacie",
    "format": "CM",
    "statut": "tourne",
    "projetId": "a4e3a24a-b21a-488e-b551-9b8b6986fd50",
    "image": "/success-stories/49.jpg",
    "affiche": null
  },
  {
    "titre": "L'essence",
    "auteur": "Sofia Gutman",
    "format": "CM",
    "statut": "tourne",
    "projetId": "8c0dd400-16b7-4e44-b21b-64f959236494",
    "image": "/success-stories/50.jpg",
    "affiche": null
  },
  {
    "titre": "10 ans ferme",
    "auteur": "David Lavier",
    "format": "CM",
    "statut": "signe",
    "projetId": "80488ff7-e93a-4cd4-90cc-29ab817bc589",
    "image": "/success-stories/51.jpg",
    "affiche": null
  },
  {
    "titre": "Nuit verte",
    "auteur": "Maria Léa Regales",
    "format": "CM",
    "statut": "tourne",
    "projetId": "1d498d62-ef88-417b-966a-9065bfdf0934",
    "image": "/success-stories/52.jpg",
    "affiche": null
  },
  {
    "titre": "Trois petits hommes et Nine",
    "auteur": "Constance Lefèvre",
    "format": "CM",
    "statut": "signe",
    "projetId": "87af7c17-c3a8-451c-80b0-2d67f56ea2ff",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Handgun",
    "auteur": "Martijn Winkler",
    "format": "CM",
    "statut": "signe",
    "projetId": "23093b31-bff0-4320-a690-cb28a4d0fe58",
    "image": "/success-stories/54.jpg",
    "affiche": null
  },
  {
    "titre": "Murmure des cimes",
    "auteur": "Adama Grevoz",
    "format": "CM",
    "statut": "signe",
    "projetId": "e1a7d1c6-e8b4-4499-bc81-09bfb5bf3304",
    "image": "/success-stories/55.jpg",
    "affiche": null
  },
  {
    "titre": "Levée d'écrou",
    "auteur": "Olivier Martin",
    "format": "CM",
    "statut": "signe",
    "projetId": "35674356-c6db-4b76-bb74-775b27eed308",
    "image": "/success-stories/56.jpg",
    "affiche": null
  },
  {
    "titre": "Adieu Fantômes",
    "auteur": "Yohann Benedetti",
    "format": "CM",
    "statut": "signe",
    "projetId": "536b9bac-e3cd-4a4a-b4c3-12ef0bd20697",
    "image": "/success-stories/57.jpg",
    "affiche": null
  },
  {
    "titre": "Mélimélo",
    "auteur": "Alexia Fernandes",
    "format": "CM",
    "statut": "signe",
    "projetId": "afac076e-022f-4a2b-b273-a327f1a1dd35",
    "image": "/success-stories/58.jpg",
    "affiche": null
  },
  {
    "titre": "The Accordeon Music Wars",
    "auteur": "Mpaki Molapo",
    "format": "CM",
    "statut": "signe",
    "projetId": "961a197e-8114-48f8-b112-20d6b084d38b",
    "image": "/success-stories/59.jpg",
    "affiche": null
  },
  {
    "titre": "Du vent dans les cornes",
    "auteur": "Jonathan Becker",
    "format": "CM",
    "statut": "signe",
    "projetId": "f26fb689-e240-456b-8fea-006a6229345a",
    "image": "/success-stories/60.jpg",
    "affiche": null
  },
  {
    "titre": "Ce soir ou jamais",
    "auteur": "Joseph Lantigny",
    "format": "CM",
    "statut": "tourne",
    "projetId": "e0cea667-ae27-4ce1-a971-af190a675f81",
    "image": "/success-stories/61.jpg",
    "affiche": null
  },
  {
    "titre": "L'allée des siffleurs",
    "auteur": "Julien Herichon",
    "format": "CM",
    "statut": "tourne",
    "projetId": "425f1cb1-65e0-497f-a2f7-f236fb94dad9",
    "image": "/success-stories/62.jpg",
    "affiche": null
  },
  {
    "titre": "Bad people",
    "auteur": "Giorgi Tavartkiladze",
    "format": "CM",
    "statut": "tourne",
    "projetId": "0ea3469e-d6d8-43e7-9511-19b618c1ed74",
    "image": "/success-stories/63.jpg",
    "affiche": null
  },
  {
    "titre": "Résonance",
    "auteur": "Maxime-Claude L'Écuyer",
    "format": "CM",
    "statut": "tourne",
    "projetId": "dbc7dce7-2cd2-4fe7-87d0-5cd9130376e0",
    "image": "/success-stories/64.jpg",
    "affiche": null
  },
  {
    "titre": "Le sillon",
    "auteur": "Romain Gautier",
    "format": "CM",
    "statut": "signe",
    "projetId": "8cf4ac10-8830-4912-a286-2f51c65626cb",
    "image": "/success-stories/65.jpg",
    "affiche": null
  },
  {
    "titre": "Au nom de la fraise et du chocolat et du St Esprit",
    "auteur": "Karla Lulic",
    "format": "CM",
    "statut": "tourne",
    "projetId": "0a23cb03-ab41-4601-b6fd-067efbc04611",
    "image": "/success-stories/66.jpg",
    "affiche": null
  },
  {
    "titre": "Qui vive",
    "auteur": "Anaïs Debus",
    "format": "CM",
    "statut": "tourne",
    "projetId": "491ce2f6-b245-4d5e-b16d-02ff4a3dadbe",
    "image": "/success-stories/67.jpg",
    "affiche": null
  },
  {
    "titre": "Inshallah Khair",
    "auteur": "Stephan Regoli",
    "format": "CM",
    "statut": "tourne",
    "projetId": "664aac84-dfbd-4cd0-b61c-d7de109090b5",
    "image": "/success-stories/68.jpg",
    "affiche": null
  },
  {
    "titre": "The New lake",
    "auteur": "Stephanie Sant",
    "format": "CM",
    "statut": "signe",
    "projetId": "1d99a6f3-0adc-4e93-9a77-6d2db25a945b",
    "image": "/success-stories/69.jpg",
    "affiche": null
  },
  {
    "titre": "Robert the Robot",
    "auteur": "Aaron Lucas",
    "format": "CM",
    "statut": "signe",
    "projetId": "886adab8-b18e-4f33-9dfa-5922221432f4",
    "image": "/success-stories/70.jpg",
    "affiche": null
  },
  {
    "titre": "Aïcha",
    "auteur": "Coralie Lavergne",
    "format": "CM",
    "statut": "signe",
    "projetId": "6dcaeb96-62d7-47e0-bff2-1d20701110be",
    "image": "/success-stories/71.jpg",
    "affiche": null
  },
  {
    "titre": "Charogne",
    "auteur": "Eva Munoz",
    "format": "CM",
    "statut": "signe",
    "projetId": "97242767-08d9-42eb-959f-e19907e09003",
    "image": "/success-stories/72.jpg",
    "affiche": null
  },
  {
    "titre": "Déluge",
    "auteur": "Ephrem Koering",
    "format": "CM",
    "statut": "signe",
    "projetId": "dae2fdf2-be45-4422-b536-a87f6ba5bca2",
    "image": "/success-stories/73.jpg",
    "affiche": null
  },
  {
    "titre": "Emma",
    "auteur": "Vera Cupic-Vojnovic",
    "format": "CM",
    "statut": "signe",
    "projetId": "de571744-3462-4bf2-b8a4-afdecc79ac20",
    "image": "/success-stories/74.jpg",
    "affiche": null
  },
  {
    "titre": "Florentin",
    "auteur": "Michele Robin",
    "format": "CM",
    "statut": "signe",
    "projetId": "20fd2576-cb02-445c-a48c-297553abc24b",
    "image": "/success-stories/75.jpg",
    "affiche": null
  },
  {
    "titre": "Rêves d'assassins",
    "auteur": "Bruno Pieretti",
    "format": "CM",
    "statut": "signe",
    "projetId": "0de07e44-e832-4c6a-9f5b-0cd4d0c2a48b",
    "image": "/success-stories/76.jpg",
    "affiche": null
  },
  {
    "titre": "Vivarium",
    "auteur": "Charlotte Juniere",
    "format": "CM",
    "statut": "signe",
    "projetId": "eee3a40f-7a11-40c6-b27e-5f27e4c894f7",
    "image": null,
    "affiche": null
  },
  {
    "titre": "La mue",
    "auteur": "Charlotte Juniere",
    "format": "CM",
    "statut": "signe",
    "projetId": "1081a99a-d47c-4a60-88c1-307236f9caea",
    "image": "/success-stories/78.jpg",
    "affiche": null
  },
  {
    "titre": "Portrait de famille",
    "auteur": "Emanuele Ricci",
    "format": "CM",
    "statut": "tourne",
    "projetId": "a2547f4d-c19e-4b89-b3af-03ad20829ffc",
    "image": "/success-stories/79.jpg",
    "affiche": null
  },
  {
    "titre": "L'aveugle et la cardinale",
    "auteur": "Frédéric Laurent",
    "format": "CM",
    "statut": "tourne",
    "projetId": "dda8471d-0664-4cfe-8b97-bf256be37a30",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Luciole",
    "auteur": "Lucie Pages",
    "format": "CM",
    "statut": "tourne",
    "projetId": "063ccd05-6f09-433e-8337-b72b20e9fd74",
    "image": "/success-stories/81.jpg",
    "affiche": null
  },
  {
    "titre": "Black Hole",
    "auteur": "Lucie Kazarjian",
    "format": "CM",
    "statut": "signe",
    "projetId": "25f05fe6-20b0-4438-aa73-f323b9f60b4c",
    "image": "/success-stories/82.jpg",
    "affiche": null
  },
  {
    "titre": "Mon capitaine",
    "auteur": "Juliette Marrécau",
    "format": "CM",
    "statut": "signe",
    "projetId": "829b6ed4-dcbe-46a3-9eb2-e9160deac93a",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Crossing",
    "auteur": "Richard Hajdú",
    "format": "CM",
    "statut": "signe",
    "projetId": "d81bdb66-70ca-473d-8b02-0b34cebdb059",
    "image": null,
    "affiche": null
  },
  {
    "titre": "3 punks",
    "auteur": "Hedi Boudlaoun",
    "format": "CM",
    "statut": "tourne",
    "projetId": "387c836e-72db-4188-92c5-5ea6417cd7b6",
    "image": "/success-stories/85.jpg",
    "affiche": null
  },
  {
    "titre": "En piste",
    "auteur": "Emilie de Montsabert",
    "format": "CM",
    "statut": "tourne",
    "projetId": "b83b2383-d3fc-459d-92cb-9167ea470eef",
    "image": "/success-stories/86.jpg",
    "affiche": null
  },
  {
    "titre": "The Ghost",
    "auteur": "Rudresh Ved",
    "format": "CM",
    "statut": "signe",
    "projetId": "e8a38fc6-af6e-4137-ae20-3bc805d8af4d",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Un matin un lapin",
    "auteur": "Anne-Sophie Diego",
    "format": "CM",
    "statut": "tourne",
    "projetId": "3d5115b6-c12a-4616-92e3-03b086d220c4",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Un monde sans crise",
    "auteur": "Ted Hardy-Carnac",
    "format": "CM",
    "statut": "tourne",
    "projetId": "ecce2e29-7290-4cee-b5e0-2b74b499f944",
    "image": "/success-stories/89.jpg",
    "affiche": null
  },
  {
    "titre": "Ouvre l'oeil",
    "auteur": "Remy Galvain",
    "format": "CM",
    "statut": "signe",
    "projetId": "28ad0990-afa8-406b-8f3f-f0acf3a2381c",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Entends tu le tonnerre",
    "auteur": "Xavier Dumoulin",
    "format": "CM",
    "statut": "signe",
    "projetId": "4cafd5a9-6c89-410f-a29b-d201446dcfaf",
    "image": null,
    "affiche": null
  },
  {
    "titre": "Sauver la fleur",
    "auteur": "Beraat Gokkus",
    "format": "CM",
    "statut": "signe",
    "projetId": "6e9f23a2-a044-45cf-b613-c14599552e15",
    "image": "/success-stories/92.jpg",
    "affiche": null
  },
  {
    "titre": "Le ventre vide",
    "auteur": "Sandy Lobry",
    "format": "CM",
    "statut": "signe",
    "projetId": "073910e2-b1e5-4083-8e51-d4e375157429",
    "image": "/success-stories/93.jpg",
    "affiche": null
  }
];
