import amy from "../../../public/images/speakers/amy_schneider.jpg";
import andrew from "../../../public/images/speakers/andrew_nathenson.jpg";
import caro from "../../../public/images/speakers/caro_murphy.jpg";
import chris from "../../../public/images/speakers/chris_grace.jpg";
import david from "../../../public/images/speakers/david_turner.jpg";
import elli from "../../../public/images/speakers/elli_furedy.jpg";
import lexi from "../../../public/images/speakers/lexi_kohanski.jpg";
import peihGee from "../../../public/images/speakers/peih_gee_law.jpg";
import randy from "../../../public/images/speakers/randy_lubin.jpg";
import raph from "../../../public/images/speakers/raph_damico.jpg";
import ricki from "../../../public/images/speakers/ricki_heicklen.jpg";
import tommy from "../../../public/images/team/tommy.jpg";
import { HATS } from "@/v2/hat-trick/hats";
import type { Person } from "./team";

// Featured speakers, in display order on the home page.
export const SPEAKERS: Person[] = [
  {
    name: "Chris Grace",
    title: "Dropout",
    titleUrl: "https://dropout.fandom.com/wiki/Chris_Grace",
    photo: chris,
  },
  {
    name: "Caro Murphy",
    title: "Cosmic Egg",
    titleUrl: "https://cosmice.gg/",
    photo: caro,
  },
  {
    name: "Peih-Gee Law",
    title: "REPOD",
    titleUrl: "https://roomescapeartist.com/reality-escape-pod/",
    photo: peihGee,
    hats: [HATS.peihGee],
  },
  {
    name: "Tommy Honton",
    title: "tommyhonton.com",
    titleUrl: "https://tommyhonton.com/",
    photo: tommy,
  },
  {
    name: "Lexi Kohanski",
    title: "Worlds to Come",
    titleUrl:
      "https://www.kickstarter.com/projects/kohanski/worlds-to-come?tab=prelaunch-story",
    photo: lexi,
  },
  {
    name: "Amy Schneider",
    title: "Jeopardy!",
    titleUrl: "https://en.wikipedia.org/wiki/Amy_Schneider",
    photo: amy,
  },
  {
    name: "Andrew Nathenson",
    title: "Cult of the Clocktower",
    titleUrl:
      "https://podcasts.apple.com/us/podcast/cult-of-the-clocktower/id1478486574",
    photo: andrew,
  },
  {
    name: "David Turner",
    title: "Semantle",
    titleUrl: "https://semantle.com/",
    photo: david,
  },
  {
    name: "Elli Furedy",
    title: "Alleycat Asset Acquisitions",
    titleUrl: "https://www.alleycat.agency/",
    photo: elli,
    hats: [HATS.elli],
  },
  {
    name: "Raph D’Amico",
    title: "Laughing Kaiju",
    titleUrl: "https://laughingkaiju.com/about/",
    photo: raph,
    hats: [HATS.raph],
  },
  {
    name: "Randy Lubin",
    title: "Leveraged Play",
    titleUrl: "https://leveragedplay.com/",
    photo: randy,
  },
  {
    name: "Ricki Heicklen",
    title: "Metagame",
    titleUrl: "#speakers",
    photo: ricki,
  },
];
