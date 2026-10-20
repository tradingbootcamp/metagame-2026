/**
 * Shrinks an image so its longer side is at most `maxPx`, re-encoded as WebP
 * (JPEG where the browser can't encode WebP). Browser-only.
 */
export async function downscaleImage(file: File, maxPx: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) =>
    new Promise<Blob | null>((done) => canvas.toBlob(done, type, 0.8));
  // Browsers that can't encode WebP hand back a PNG instead.
  let blob = await encode("image/webp");
  if (blob?.type !== "image/webp") blob = await encode("image/jpeg");
  if (!blob) throw new Error("Couldn't encode the image.");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `image.${ext}`, { type: blob.type });
}
