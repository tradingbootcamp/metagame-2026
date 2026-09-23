// Airtable's select-option palette, so an option reads here in the colour it
// already has in the base. Airtable sends a token per choice ("greenBright");
// these are the hexes it paints them with.
//
// Only the background is taken from Airtable — the foreground is chosen for
// contrast, since Airtable's own text colour isn't in the API response.

const LIGHT2: Record<string, string> = {
  blue: "#cfdfff",
  cyan: "#d0f0fd",
  teal: "#c2f5e9",
  green: "#d1f7c4",
  yellow: "#ffeab6",
  orange: "#fee2d5",
  red: "#ffdce5",
  pink: "#ffdaf6",
  purple: "#ede2fe",
  gray: "#eeeeee",
};

const LIGHT1: Record<string, string> = {
  blue: "#9cc7ff",
  cyan: "#77d1f3",
  teal: "#72ddc3",
  green: "#93e088",
  yellow: "#ffd66e",
  orange: "#ffa981",
  red: "#ff9eb7",
  pink: "#f99de2",
  purple: "#cdb0ff",
  gray: "#cccccc",
};

const BRIGHT: Record<string, string> = {
  blue: "#2d7ff9",
  cyan: "#18bfff",
  teal: "#20d9d2",
  green: "#20c933",
  yellow: "#fcb400",
  orange: "#ff6f2c",
  red: "#f82b60",
  pink: "#ff08c2",
  purple: "#8b46ff",
  gray: "#666666",
};

const DARK1: Record<string, string> = {
  blue: "#2750ae",
  cyan: "#0b76b7",
  teal: "#06a09b",
  green: "#338a17",
  yellow: "#b87503",
  orange: "#d74d26",
  red: "#ba1e45",
  pink: "#b2158b",
  purple: "#6b1cb0",
  gray: "#444444",
};

const SHADES: Record<string, Record<string, string>> = {
  Light2: LIGHT2,
  Light1: LIGHT1,
  Bright: BRIGHT,
  Dark1: DARK1,
};

export type Swatch = { background: string; color: string };

/**
 * Turn an Airtable colour token into inline styles. Unknown tokens (and a
 * missing one) come back null so the caller can render plain text instead.
 */
export function swatch(token: string | undefined): Swatch | null {
  if (!token) return null;

  const match = token.match(/^([a-z]+)(Light1|Light2|Bright|Dark1)$/);
  if (!match) return null;

  const [, hue, shade] = match;
  const background = SHADES[shade]?.[hue];
  if (!background) return null;

  // Bright and Dark1 are saturated enough to need light text; the pale shades
  // keep the site's ink so they don't wash out.
  const color = shade === "Bright" || shade === "Dark1" ? "#ffffff" : "#1b1b1b";
  return { background, color };
}
