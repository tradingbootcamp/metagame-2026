import type { StaticImageData } from "next/image";
import { HATS, type Hat } from "@/v2/hat-trick/hats";
import games from "../../../public/images/misc_photos/board_game_round_robin_2.jpg";
import talks from "../../../public/images/misc_photos/jay_dragon.jpg";
import workshops from "../../../public/images/misc_photos/david_turner.jpg";

export type HighlightSession = {
  title: string;
  /** Hosts as shown; omitted for events that had no single host. */
  hosts?: string;
};

export type HighlightGroup = {
  label: string;
  photo: StaticImageData;
  alt: string;
  // Hat Trick: hats hidden in this photo (see src/v2/hat-trick).
  hats?: Hat[];
  sessions: HighlightSession[];
};

// Hand-picked from the 2025 schedule (src/v2/data/last-year-schedule.json).
// The email's "Highlights from 2025" block lists the same sessions; keep in sync.
export const HIGHLIGHTS_2025: HighlightGroup[] = [
  {
    label: "Talks",
    photo: talks,
    alt: "Jay Dragon speaking into a microphone on an outdoor panel at Metagame 2025",
    sessions: [
      { title: "Games and the World", hosts: "Frank Lantz" },
      {
        title: "PG's Playhouse: The Evolution of Escape Rooms",
        hosts: "Peih-Gee Law & Tommy Honton",
      },
      { title: "The Interface Is The Game", hosts: "David Sirlin" },
      {
        title:
          "So You Wanna Make a Tabletop Game: Designing for Mass Production and Working with Manufacturers",
        hosts: "Rita Orlov & Spencer Beebe",
      },
      {
        title: "Bleed at the Table: A Panel",
        hosts: "Sylvan Lawrence, Jay Dragon & Jonaya Kemper",
      },
      { title: "Will Shortz Q&A", hosts: "Will Shortz" },
    ],
  },
  {
    label: "Workshops",
    photo: workshops,
    alt: "David Turner presenting from a lectern in the Lighthaven garden",
    sessions: [
      {
        title: "Build Your Own Escape Room",
        hosts: "Bansini & Ursula Collins-Laine",
      },
      {
        title: "How to Construct a Crossword",
        hosts: "Adrienne Raphel & Natan Last",
      },
      {
        title: "Playtesting and Game Design at Cards Against Humanity",
        hosts: "Josh Dillon",
      },
      { title: "Video Games as Alignment Benchmarks", hosts: "Emmett Shear" },
      { title: "Design a Board Game: Zo", hosts: "Paul “Lorxus” Rapoport" },
      { title: "TASK Party", hosts: "Ursula Collins-Laine" },
      {
        title: "Open HDMI Cable",
        hosts: "lightning talks, hosted by Brendan Hurst",
      },
    ],
  },
  {
    label: "Games & More",
    photo: games,
    alt: "A crowd leaning over a long table of abstract games during the board game round robin",
    hats: [HATS.wizard],
    sessions: [
      { title: "Escape the Sudoku", hosts: "Thomas Snyder" },
      { title: "Two Rooms and a Boom", hosts: "Alan Gerding" },
      { title: "Utility Monster", hosts: "Nick Ross" },
      { title: "Jubensha: Tree Rings Murder Mystery", hosts: "Scott Lininger" },
      { title: "Mystery Manor", hosts: "Marlee Honton" },
      { title: "Sorcerority: A LARP", hosts: "Alicorn" },
      { title: "Board Game Round Robin", hosts: "Sparr Risher" },
      { title: "Night Market + Career Fair" },
    ],
  },
];
