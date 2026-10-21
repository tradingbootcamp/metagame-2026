import { canvasToImageFile } from "./downscale-image";

export type CropArea = { x: number; y: number; width: number; height: number };

/** Side of the square output: the crop's own size, capped at `maxPx`. */
export function cropOutputSize(area: CropArea, maxPx: number): number {
  return Math.max(1, Math.min(maxPx, Math.round(area.width)));
}

/**
 * Cuts the square `area` (in the image's pixels) out of `file` and encodes it
 * at most `maxPx` square. Browser-only.
 */
export async function cropImage(
  file: File,
  area: CropArea,
  maxPx: number,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = cropOutputSize(area, maxPx);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    side,
    side,
  );
  bitmap.close();
  return canvasToImageFile(canvas);
}
