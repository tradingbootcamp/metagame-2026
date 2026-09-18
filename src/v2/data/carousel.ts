import jigsaw from "../../../public/images/carousel/1_jigsaw.jpg";
import election from "../../../public/images/carousel/2_election.jpg";
import cards from "../../../public/images/carousel/3_cards.jpg";
import crossword from "../../../public/images/carousel/4_crossword.jpg";
import jigsawSudoku from "../../../public/images/carousel/5_jigsaw_sudoku.jpg";
import fairyLights from "../../../public/images/carousel/6_fairy_lights.jpg";
import codex from "../../../public/images/carousel/7_codex.jpg";
import { HATS } from "@/v2/hat-trick/hats";

// Home-page photo strip, in order. Sources live in pictures/carousel (not
// committed); these are 1600px JPEG exports.
// TODO(team): real alt text for each photo.
export const CAROUSEL = [
  { src: jigsaw, alt: "Attendees working on a giant jigsaw puzzle" },
  {
    src: election,
    alt: "The election game at Metagame 2025",
    hats: [HATS.crown],
  },
  { src: cards, alt: "A card game in progress" },
  { src: crossword, alt: "A group solving a crossword" },
  { src: jigsawSudoku, alt: "A jigsaw sudoku puzzle" },
  { src: fairyLights, alt: "Evening games under fairy lights" },
  { src: codex, alt: "Two players studying their cards over a game of Codex" },
];
