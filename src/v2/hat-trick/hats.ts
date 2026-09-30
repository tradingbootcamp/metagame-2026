import type { StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import election from "../../../public/images/carousel/2_election.jpg";
import crossword from "../../../public/images/carousel/4_crossword.jpg";
import topHat from "../../../public/images/hats/monopoly-top-hat.svg";
import megagameChess from "../../../public/images/megagame-chess.jpg";
import megachess from "../../../public/images/megachess.jpg";
import roundRobin from "../../../public/images/misc_photos/board_game_round_robin_2.jpg";
import elli from "../../../public/images/speakers/elli_furedy.jpg";
import peihGee from "../../../public/images/speakers/peih_gee_law.jpg";
import raph from "../../../public/images/speakers/raph_damico.jpg";
import brendan from "../../../public/images/team/brendan.jpg";
import jisk from "../../../public/images/team/jisk.jpg";

// Hat Trick: hats hidden in photos around the site. Click one and it leaves
// its photo for the head of the "You?" silhouette in the speaker lineup.
// The three faction hats earn the coupon code.

export type HatId =
  | "wizard"
  | "crown"
  | "pirate"
  | "sequin"
  | "peihGee"
  | "elli"
  | "raph"
  | "bishop"
  | "topHat"
  | "skyCap"
  | "navyCap"
  | "redHat";

export type Hat = {
  id: HatId;
  name: string;
  image: StaticImageData;
  // Outline of the hat in its photo, as [x, y] percentages of the image.
  points: [number, number][];
  // The same hat in other photos, each with its own outline. Taking it from
  // any one of them takes it from all.
  elsewhere?: { image: StaticImageData; points: [number, number][] }[];
  // Hats that must already be worn before this one can be taken.
  requires?: HatId[];
  // How it sits on the silhouette: width as a percentage of the card square,
  // where its bottom edge lands (percent from the top) as the first hat worn,
  // an optional tilt, and `sink`: when worn on another hat, the percent of
  // this hat's own height that drops down over that hat's top (more for a
  // brim that wraps around a head). Unset means a quarter.
  wear: {
    width: number;
    bottom: number;
    rotate?: number;
    shiftX?: number;
    sink?: number;
  };
};

export const FACTION_HATS: HatId[] = ["wizard", "pirate", "sequin"];
export const HAT_TRICK_CODE = "HATTRICK";

export const HATS: Record<HatId, Hat> = {
  wizard: {
    id: "wizard",
    name: "Wizard hat",
    image: roundRobin,
    points: [
      [68.9, 15.1],
      [70.3, 12.8],
      [72.1, 16.4],
      [74.1, 18.1],
      [75.7, 20.3],
      [77.6, 22.4],
      [79.3, 22.8],
      [81.2, 23.3],
      [83.3, 23.0],
      [84.2, 24.6],
      [82.9, 27.2],
      [80.6, 28.7],
      [78.7, 25.8],
      [75.3, 24.4],
      [72.5, 24.4],
      [69.6, 25.7],
      [67.0, 29.6],
      [67.3, 34.5],
      [70.0, 39.8],
      [68.8, 41.2],
      [66.8, 41.5],
      [64.0, 40.7],
      [62.5, 38.9],
      [65.3, 31.9],
      [64.4, 27.6],
      [64.4, 23.4],
      [64.2, 21.3],
      [66.3, 18.6],
    ],
    wear: { width: 75.5, bottom: 63.1, rotate: 38.5, shiftX: 5.9 },
  },
  crown: {
    id: "crown",
    name: "Crown",
    image: election,
    requires: FACTION_HATS,
    points: [
      [60.2, 23.8],
      [60.4, 24.2],
      [59.7, 26.4],
      [59.9, 26.5],
      [59.7, 27.3],
      [59.1, 29.0],
      [59.5, 28.8],
      [59.8, 29.0],
      [60.0, 28.8],
      [60.1, 28.4],
      [60.1, 28.0],
      [60.1, 27.7],
      [61.3, 26.1],
      [61.3, 28.1],
      [60.8, 28.9],
      [60.7, 29.6],
      [60.7, 30.2],
      [60.9, 30.8],
      [61.0, 31.3],
      [61.5, 31.1],
      [62.4, 30.6],
      [63.0, 30.0],
      [63.7, 28.7],
      [63.9, 28.8],
      [63.8, 30.0],
      [63.8, 31.6],
      [64.1, 33.0],
      [64.8, 32.9],
      [65.2, 32.3],
      [65.5, 31.5],
      [65.5, 30.8],
      [66.4, 29.0],
      [66.5, 29.2],
      [66.4, 31.3],
      [66.0, 32.1],
      [65.8, 33.4],
      [65.9, 34.4],
      [67.4, 31.8],
      [67.6, 32.2],
      [66.9, 34.2],
      [66.9, 35.1],
      [65.9, 37.5],
      [65.3, 36.8],
      [63.5, 35.5],
      [61.2, 34.3],
      [59.9, 33.7],
      [57.2, 32.7],
      [58.5, 28.6],
      [59.9, 24.5],
    ],
    wear: { width: 55, bottom: 33.3, rotate: 2, shiftX: 7.7, sink: 15 },
  },
  pirate: {
    id: "pirate",
    name: "Pirate hat",
    image: jisk,
    points: [
      [59.9, 17.6],
      [62.7, 18.3],
      [65.5, 15.8],
      [69.0, 14.6],
      [72.3, 14.5],
      [76.0, 14.5],
      [81.8, 16.3],
      [84.5, 18.3],
      [86.5, 20.7],
      [93.0, 23.5],
      [96.6, 26.8],
      [98.4, 30.5],
      [98.2, 32.7],
      [90.7, 33.1],
      [87.2, 31.7],
      [84.2, 30.8],
      [80.9, 30.3],
      [76.1, 30.0],
      [71.8, 30.1],
      [68.3, 30.1],
      [65.7, 29.8],
      [62.1, 30.0],
      [59.6, 29.2],
      [56.6, 27.2],
      [55.4, 25.1],
      [55.1, 23.7],
      [55.2, 21.4],
      [57.1, 18.8],
    ],
    wear: { width: 81.5, bottom: 28.7, rotate: -4, shiftX: -2.9 },
  },
  sequin: {
    id: "sequin",
    name: "Spacefarer hat",
    image: brendan,
    points: [
      [53.0, 8.5],
      [44.7, 9.3],
      [38.0, 11.8],
      [32.9, 14.6],
      [29.2, 17.8],
      [25.1, 23.6],
      [23.3, 30.6],
      [23.7, 35.3],
      [25.8, 41.2],
      [30.6, 46.5],
      [33.6, 39.0],
      [31.6, 36.2],
      [33.8, 34.2],
      [37.9, 32.4],
      [42.8, 31.2],
      [46.9, 30.3],
      [51.3, 29.8],
      [58.8, 29.6],
      [65.2, 30.1],
      [69.1, 30.7],
      [72.8, 31.6],
      [75.4, 32.8],
      [76.2, 35.0],
      [77.2, 41.9],
      [77.9, 43.6],
      [79.3, 43.2],
      [81.5, 39.3],
      [83.0, 33.8],
      [82.7, 27.1],
      [79.6, 20.8],
      [76.5, 16.9],
      [71.3, 13.3],
      [66.1, 10.8],
      [59.8, 9.0],
    ],
    wear: { width: 58.5, bottom: 37.3, shiftX: -0.7, sink: 30 },
  },
  peihGee: {
    id: "peihGee",
    name: "Safari hat",
    image: peihGee,
    points: [
      [54.0, 15.6],
      [54.5, 12.5],
      [57.0, 10.3],
      [60.5, 9.5],
      [65.0, 9.5],
      [69.0, 10.0],
      [71.8, 11.5],
      [73.0, 13.5],
      [73.3, 16.5],
      [74.0, 19.6],
      [75.0, 20.2],
      [79.5, 24.0],
      [82.8, 28.5],
      [84.5, 34.0],
      [85.0, 39.0],
      [84.5, 44.0],
      [83.0, 48.0],
      [81.0, 50.0],
      [79.0, 49.5],
      [78.3, 47.0],
      [77.5, 42.0],
      [76.0, 36.0],
      [74.5, 30.0],
      [72.0, 25.0],
      [68.0, 22.0],
      [63.0, 20.5],
      [58.0, 20.5],
      [53.0, 22.0],
      [50.5, 24.0],
      [50.0, 27.0],
      [49.0, 31.0],
      [47.5, 35.0],
      [46.5, 37.5],
      [45.5, 37.0],
      [44.5, 33.0],
      [44.5, 29.0],
      [45.0, 25.0],
      [45.5, 22.0],
      [47.0, 19.0],
      [49.5, 17.0],
      [52.0, 15.8],
    ],
    wear: { width: 70, bottom: 62, shiftX: 4, sink: 45 },
  },
  elli: {
    id: "elli",
    name: "Neon wide-brim hat",
    image: elli,
    points: [
      [44.5, 7.5],
      [45.5, 4.5],
      [48.0, 3.5],
      [51.0, 4.0],
      [53.5, 5.5],
      [58.0, 5.0],
      [63.0, 4.8],
      [68.0, 5.3],
      [72.0, 6.5],
      [75.0, 9.0],
      [77.5, 11.5],
      [79.0, 14.5],
      [79.5, 18.0],
      [79.0, 22.0],
      [78.0, 27.0],
      [76.0, 31.0],
      [73.5, 33.5],
      [72.0, 34.0],
      [71.5, 30.0],
      [71.5, 25.0],
      [70.0, 21.0],
      [66.0, 19.5],
      [62.0, 17.5],
      [55.0, 17.0],
      [47.0, 17.0],
      [41.0, 18.0],
      [38.0, 19.5],
      [36.5, 22.0],
      [37.0, 27.0],
      [37.5, 33.0],
      [36.0, 35.0],
      [33.0, 33.5],
      [30.0, 31.0],
      [27.5, 27.5],
      [26.5, 23.5],
      [27.5, 20.0],
      [30.0, 17.0],
      [33.5, 14.0],
      [37.5, 11.5],
      [41.5, 9.0],
    ],
    wear: { width: 72, bottom: 42, sink: 35 },
  },
  raph: {
    id: "raph",
    name: "Bush hat",
    image: raph,
    points: [
      [32.0, 23.0],
      [37.0, 17.5],
      [42.0, 14.0],
      [48.0, 11.3],
      [52.0, 10.3],
      [55.0, 11.5],
      [59.0, 15.5],
      [63.0, 20.0],
      [66.0, 22.5],
      [72.0, 22.2],
      [80.0, 21.3],
      [86.5, 21.5],
      [86.0, 24.0],
      [83.5, 27.5],
      [81.5, 32.0],
      [80.5, 37.0],
      [79.0, 42.0],
      [76.5, 46.0],
      [76.0, 43.0],
      [75.0, 38.0],
      [73.5, 33.0],
      [70.0, 30.0],
      [64.0, 28.5],
      [55.0, 27.5],
      [45.0, 28.0],
      [38.0, 30.0],
      [33.0, 33.0],
      [30.0, 36.5],
      [28.5, 41.0],
      [27.0, 46.0],
      [26.0, 50.0],
      [26.5, 55.0],
      [28.0, 59.0],
      [30.5, 63.0],
      [32.0, 67.5],
      [27.0, 66.5],
      [21.0, 63.0],
      [17.0, 59.0],
      [14.5, 53.0],
      [13.3, 46.0],
      [13.5, 39.0],
      [15.0, 33.5],
      [18.5, 28.5],
      [23.0, 25.5],
      [28.0, 24.0],
    ],
    wear: { width: 68, bottom: 51, rotate: 8, shiftX: -2, sink: 40 },
  },
  bishop: {
    id: "bishop",
    name: "Bishop's mitre",
    image: megachess,
    points: [
      [63.1, 34.3],
      [63.5, 33.0],
      [64.3, 32.3],
      [65.3, 32.1],
      [66.3, 32.5],
      [67.0, 33.5],
      [67.2, 34.6],
      [66.5, 35.3],
      [66.2, 36.2],
      [67.4, 37.2],
      [68.5, 38.4],
      [69.3, 40.0],
      [69.9, 42.0],
      [70.3, 44.5],
      [70.4, 46.5],
      [70.2, 48.5],
      [69.6, 50.3],
      [68.6, 51.7],
      [67.3, 52.6],
      [65.5, 52.8],
      [63.5, 52.8],
      [61.5, 52.3],
      [60.5, 51.5],
      [59.8, 50.0],
      [59.3, 48.0],
      [59.2, 46.0],
      [59.4, 44.0],
      [59.8, 42.5],
      [60.3, 41.6],
      [61.2, 42.2],
      [62.2, 43.5],
      [62.8, 42.5],
      [62.6, 40.5],
      [62.2, 38.3],
      [63.0, 37.5],
      [64.3, 36.8],
      [64.6, 35.6],
      [63.5, 35.0],
    ],
    // Also on the home page, where the knight hides part of it.
    elsewhere: [
      {
        image: megagameChess,
        points: [
          [25.3, 24.0],
          [25.8, 22.0],
          [27.5, 20.7],
          [29.5, 20.3],
          [31.5, 20.7],
          [33.0, 22.2],
          [33.4, 24.0],
          [32.8, 26.0],
          [31.5, 27.3],
          [31.3, 28.8],
          [33.0, 30.0],
          [35.0, 32.0],
          [37.0, 35.0],
          [38.7, 38.0],
          [39.8, 40.5],
          [36.5, 41.3],
          [35.5, 43.5],
          [34.5, 45.8],
          [32.0, 47.0],
          [30.5, 48.0],
          [30.5, 54.5],
          [32.5, 57.0],
          [33.5, 58.5],
          [33.3, 62.0],
          [28.0, 62.5],
          [23.5, 62.3],
          [22.0, 60.0],
          [20.5, 57.0],
          [19.5, 54.0],
          [19.0, 50.0],
          [19.0, 46.0],
          [19.5, 42.0],
          [20.5, 38.5],
          [22.0, 35.0],
          [24.0, 32.0],
          [26.0, 30.0],
          [27.6, 28.8],
          [27.5, 27.3],
          [26.0, 26.0],
        ],
      },
    ],
    wear: { width: 38, bottom: 33, sink: 15 },
  },
  topHat: {
    id: "topHat",
    name: "Top hat",
    image: topHat,
    points: [
      [0.0, 0.0],
      [100.0, 0.0],
      [100.0, 100.0],
      [0.0, 100.0],
    ],
    wear: { width: 60, bottom: 33 },
  },
  skyCap: {
    id: "skyCap",
    name: "Sky-blue cap",
    image: crossword,
    points: [
      [36.3, 23.0],
      [37.5, 21.3],
      [39.5, 20.5],
      [42.0, 20.2],
      [44.0, 20.8],
      [45.2, 21.8],
      [45.0, 23.2],
      [43.0, 23.5],
      [41.0, 24.5],
      [40.2, 26.0],
      [39.8, 27.5],
      [39.5, 29.5],
      [38.0, 30.8],
      [36.3, 31.3],
      [36.0, 29.5],
      [35.8, 27.0],
      [35.9, 25.0],
    ],
    wear: { width: 45, bottom: 31, rotate: -15, shiftX: 4 },
  },
  navyCap: {
    id: "navyCap",
    name: "Navy cap",
    image: crossword,
    points: [
      [41.0, 24.5],
      [43.0, 23.5],
      [45.0, 23.2],
      [47.0, 23.8],
      [49.0, 25.0],
      [50.5, 26.5],
      [51.0, 28.0],
      [51.5, 30.0],
      [51.0, 31.0],
      [49.0, 30.5],
      [47.0, 30.5],
      [45.0, 30.7],
      [43.0, 31.0],
      [41.0, 32.0],
      [40.5, 33.2],
      [38.0, 33.5],
      [35.2, 33.0],
      [36.0, 31.8],
      [38.0, 30.8],
      [39.5, 29.5],
      [39.8, 27.5],
      [40.2, 26.0],
    ],
    wear: { width: 58, bottom: 33, shiftX: -4, sink: 30 },
  },
  redHat: {
    id: "redHat",
    name: "Red fedora",
    image: crossword,
    points: [
      [49.3, 23.8],
      [51.0, 24.0],
      [53.3, 24.6],
      [53.8, 23.0],
      [54.5, 22.0],
      [55.5, 21.4],
      [57.0, 21.4],
      [58.5, 22.2],
      [60.0, 23.3],
      [61.2, 24.7],
      [61.8, 26.5],
      [61.7, 28.5],
      [61.5, 30.3],
      [62.3, 31.5],
      [62.7, 33.5],
      [61.8, 33.8],
      [60.0, 32.4],
      [58.0, 30.9],
      [56.0, 29.3],
      [54.0, 27.6],
      [52.0, 26.0],
      [50.0, 24.8],
    ],
    wear: { width: 60, bottom: 34, rotate: -25, sink: 30 },
  },
};

export const isHatId = (v: unknown): v is HatId =>
  typeof v === "string" && v in HATS;

// The hat as it appears in `image`: its own outline there, or the matching
// `elsewhere` one.
export function hatIn(hat: Hat, image: StaticImageData): Hat {
  if (image.src === hat.image.src) return hat;
  const spot = hat.elsewhere?.find((e) => e.image.src === image.src);
  return spot ? { ...hat, points: spot.points } : hat;
}

export const polygon = (pts: [number, number][]) =>
  `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;

// Bounding box of a hat's outline, in image percentages.
export function hatBox(hat: Hat) {
  const xs = hat.points.map((p) => p[0]);
  const ys = hat.points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// Pixel aspect ratio (width / height) of the hat's bounding box.
export function hatAspect(hat: Hat) {
  const b = hatBox(hat);
  return ((b.w / 100) * hat.image.width) / ((b.h / 100) * hat.image.height);
}

// Inline style that paints just the hat, cut from its photo, filling the
// element's box (size the element by width; the aspect ratio is set here).
export function hatCutoutStyle(hat: Hat): CSSProperties {
  const b = hatBox(hat);
  const pos = (v: number, size: number) =>
    size >= 100 ? 0 : (v / (100 - size)) * 100;
  return {
    backgroundImage: `url(${hat.image.src})`,
    backgroundSize: `${(100 / b.w) * 100}% ${(100 / b.h) * 100}%`,
    backgroundPosition: `${pos(b.x, b.w)}% ${pos(b.y, b.h)}%`,
    backgroundRepeat: "no-repeat",
    clipPath: polygon(
      hat.points.map(([x, y]) => [
        ((x - b.x) / b.w) * 100,
        ((y - b.y) / b.h) * 100,
      ]),
    ),
    aspectRatio: `${hatAspect(hat)}`,
  };
}
