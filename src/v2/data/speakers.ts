import amy from "../../../public/images/speakers/amy_schneider.jpg";
import andrew from "../../../public/images/speakers/andrew_nathenson.jpg";
import caro from "../../../public/images/speakers/caro_murphy.jpg";
import chris from "../../../public/images/speakers/chris_grace.jpg";
import lexi from "../../../public/images/speakers/lexi_kohanski.jpg";
import peihGee from "../../../public/images/speakers/peih_gee_law.jpg";
import tommy from "../../../public/images/team/tommy.jpg";
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
];
