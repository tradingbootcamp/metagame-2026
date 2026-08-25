// The METAGAME dice glyphs as 512×512 SVG path data (evenodd), shared by the
// LogoDice wordmark and the 3D dice face textures so both render the same
// shapes. Derived from public/dice-letters/*.svg; `slot` is the M/G/E cutout
// width (originals used 26, which reads thin at wordmark size) and `r` the
// exterior corner radius (originals 22). The A and T cutouts are fixed.
export type GlyphOptions = { slot: number; r: number };

export function letterPaths({ slot, r }: GlyphOptions): Record<string, string> {
  const sq = `M0 ${r}Q0 0 ${r} 0L${512 - r} 0Q512 0 512 ${r}L512 ${512 - r}Q512 512 ${512 - r} 512L${r} 512Q0 512 0 ${512 - r}Z`;
  const h = slot / 2;
  return {
    m: `${sq} M${165 - h} 154H${165 + h}V512H${165 - h}Z M${347 - h} 154H${347 + h}V512H${347 - h}Z`,
    g: `${sq} M${164 - h} ${165 - h}H512V${165 + h}H${164 + h}V${345 - h}H357V${345 + h}H${164 - h}Z`,
    e: `${sq} M154 ${165 - h}H512V${165 + h}H154Z M154 ${347 - h}H512V${347 + h}H154Z`,
    t: `M${r} 0H${512 - r}A${r} ${r} 0 0 1 512 ${r}V153H333V512H177V153H0V${r}A${r} ${r} 0 0 1 ${r} 0Z`,
    a: `${sq} M154 155H359V237H154Z M154 276H359V512H154Z`,
  };
}

// A standalone SVG document for one glyph, e.g. for rasterizing via <img>.
export function letterSvg(
  letter: string,
  opts: GlyphOptions,
  fill = "#000",
): string {
  const d = letterPaths(opts)[letter.toLowerCase()];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="${d}" fill="${fill}" fill-rule="evenodd"/></svg>`;
}
