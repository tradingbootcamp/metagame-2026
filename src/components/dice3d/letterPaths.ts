// Runtime path data for the dice glyphs, mirroring the colorless originals in
// ./letters/*.svg. Each is a single evenodd path on a 512x512 viewBox: the solid
// region is the letter tile, the cutouts are its counters. We rasterize these at
// the die color (see letterTexture) instead of shipping pre-colored PNGs, so the
// letters scale to any texture resolution and recolor for free.
//
// If you redraw a glyph in the vector source, update the matching string here too.
export const LETTER_VIEWBOX = 512;

export const LETTER_PATHS: Record<string, string> = {
  a: "M0 22Q0 0 22 0L490 0Q512 0 512 22L512 490Q512 512 490 512L22 512Q0 512 0 490Z M154 155H359V237H154Z M154 276H359V512H154Z",
  a_canted:
    "M38.2865 21.9332Q40 0 62 0L450 0Q472 0 473.714 21.9332L510.286 490.067Q512 512 490 512L22 512Q0 512 1.71353 490.067Z M181.9 155L331.1 155L337.5 237L175.5 237Z M172.4 276L340.6 276L359 512L154 512Z",
  e: "M0 22Q0 0 22 0L490 0Q512 0 512 22L512 490Q512 512 490 512L22 512Q0 512 0 490Z M154 152H512V178H154Z M154 334H512V360H154Z",
  g: "M0 22Q0 0 22 0L490 0Q512 0 512 22L512 490Q512 512 490 512L22 512Q0 512 0 490Z M151 152H512V178H177V332H357V358H151Z",
  m: "M0 22Q0 0 22 0L490 0Q512 0 512 22L512 490Q512 512 490 512L22 512Q0 512 0 490Z M154 153H177V512H154Z M333 153H358V512H333Z",
  t: "M22 0H490A22 22 0 0 1 512 22V153H333V512H177V153H0V22A22 22 0 0 1 22 0Z",
};
