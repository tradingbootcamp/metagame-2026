// Standard English Scrabble letter values. "" is the blank tile.
export const SCRABBLE_SCORES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
  "": 0,
};

// Click order: A…Z then the blank, then round again.
export const CYCLE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", ""];

export const RACK_SIZE = 4;

// Four-letter words the rack refuses to spell — landing on one flashes the
// tiles and re-rolls. Random starts are re-rolled past these too.
const BLACKLIST = new Set([
  "FUCK",
  "SHIT",
  "CUNT",
  "COCK",
  "DICK",
  "TWAT",
  "TITS",
  "PISS",
  "CUMS",
  "JIZZ",
  "SLUT",
  "KIKE",
  "SPIC",
  "GOOK",
  "COON",
  "DAGO",
  "FAGS",
  "RAPE",
  "NAZI",
  "ANAL",
  "ARSE",
  "HOMO",
  "DYKE",
  "WANK",
  "CRAP",
  "HOES",
]);

export const isBlocked = (rack: string[]) => BLACKLIST.has(rack.join(""));

export function randomRack(): string[] {
  const letters = CYCLE.slice(0, 26);
  let rack: string[];
  do {
    rack = Array.from(
      { length: RACK_SIZE },
      () => letters[Math.floor(Math.random() * letters.length)],
    );
  } while (isBlocked(rack));
  return rack;
}
