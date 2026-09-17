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
// tiles and re-rolls; random starts are re-rolled past these too. The 4-letter
// entries of the LDNOOBW English list (github.com/LDNOOBW), plus a few slurs
// and swears it misses.
const BLACKLIST = new Set([
  "ANAL",
  "ANUS",
  "BDSM",
  "BOOB",
  "BUTT",
  "CLIT",
  "COCK",
  "COON",
  "CUNT",
  "DICK",
  "DVDA",
  "FUCK",
  "GURO",
  "JIZZ",
  "KIKE",
  "MILF",
  "MONG",
  "NSFW",
  "NUDE",
  "ORGY",
  "PAKI",
  "POOF",
  "POON",
  "PORN",
  "PTHC",
  "QUIM",
  "RAPE",
  "SCAT",
  "SEXO",
  "SEXY",
  "SHIT",
  "SLUT",
  "SMUT",
  "SPIC",
  "SUCK",
  "TITS",
  "TWAT",
  "WANK",
  "YAOI",
  "ARSE",
  "CRAP",
  "CUMS",
  "DAGO",
  "DYKE",
  "FAGS",
  "GOOK",
  "HOES",
  "HOMO",
  "NAZI",
  "PISS",
]);

// A tile on the rack. `blank` marks a blank played as a letter: it shows the
// letter but, as in the game, no score.
export type Tile = { letter: string; blank?: boolean };

export const isBlocked = (rack: Tile[]) =>
  BLACKLIST.has(rack.map((t) => t.letter).join(""));

export function randomRack(): Tile[] {
  const letters = CYCLE.slice(0, 26);
  let rack: Tile[];
  do {
    rack = Array.from({ length: RACK_SIZE }, () => ({
      letter: letters[Math.floor(Math.random() * letters.length)],
    }));
  } while (isBlocked(rack));
  return rack;
}
