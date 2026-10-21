import { describe, expect, it } from "vitest";
import { cropOutputSize } from "./crop-image";

const area = (width: number) => ({ x: 0, y: 0, width, height: width });

describe("cropOutputSize", () => {
  it("caps a large crop at the max", () => {
    expect(cropOutputSize(area(2000), 512)).toBe(512);
  });

  it("keeps a small crop at its own size instead of upscaling", () => {
    expect(cropOutputSize(area(300), 512)).toBe(300);
  });

  it("rounds fractional crop sizes", () => {
    expect(cropOutputSize(area(299.6), 512)).toBe(300);
  });

  it("never returns zero", () => {
    expect(cropOutputSize(area(0.2), 512)).toBe(1);
  });
});
