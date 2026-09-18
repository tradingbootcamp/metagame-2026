import type { StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import election from "../../../public/images/carousel/2_election.jpg";
import roundRobin from "../../../public/images/misc_photos/board_game_round_robin_2.jpg";
import brendan from "../../../public/images/team/brendan.jpg";
import jisk from "../../../public/images/team/jisk.jpg";

// Hat Trick: hats hidden in photos around the site. Click one and it leaves
// its photo for the head of the "You?" silhouette in the speaker lineup.
// Three hats earns the coupon code.

export type HatId = "wizard" | "crown" | "pirate" | "sequin";

export type Hat = {
  id: HatId;
  name: string;
  image: StaticImageData;
  // Outline of the hat in its photo, as [x, y] percentages of the image.
  points: [number, number][];
  // Hats that must already be worn before this one can be taken.
  requires?: HatId[];
  // How it sits on the silhouette: width as a percentage of the card square,
  // where its bottom edge lands (percent from the top) as the first hat worn,
  // an optional tilt, and `lift`: when worn on another hat, how far its bottom
  // edge sits above that hat's vertical center (same units; negative sinks
  // it). Unset means a modest default that scales with the hat below.
  wear: {
    width: number;
    bottom: number;
    rotate?: number;
    shiftX?: number;
    lift?: number;
  };
};

export const HAT_TRICK_TARGET = 3;
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
    wear: { width: 75.5, bottom: 63.1, rotate: 38.5, shiftX: 5.9, lift: -27 },
  },
  crown: {
    id: "crown",
    name: "Crown",
    image: election,
    requires: ["wizard", "pirate", "sequin"],
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
    wear: { width: 55, bottom: 33.3, rotate: 2, shiftX: 7.7, lift: 3.5 },
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
    wear: { width: 58.5, bottom: 37.3, shiftX: -0.7, lift: -6 },
  },
};

export const isHatId = (v: unknown): v is HatId =>
  typeof v === "string" && v in HATS;

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
