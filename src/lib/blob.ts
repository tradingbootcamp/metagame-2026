import { del, put } from "@vercel/blob";

// Uploads arrive already downscaled in the browser; this is the backstop.
const MAX_BYTES = 512 * 1024;
const TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Stores an image under `folder/` in Vercel Blob and returns its public URL. */
export async function uploadImage(folder: string, file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Use a WebP, JPEG or PNG image.");
  if (file.size > MAX_BYTES) throw new Error("That image is too large.");
  const { url } = await put(`${folder}/${crypto.randomUUID()}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  });
  return url;
}

export function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Best effort: a leftover file costs pennies, a failed save costs the edit. */
export async function deleteImage(url: string | null): Promise<void> {
  if (!url || !isBlobUrl(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.error("[blob] delete failed", url, err);
  }
}
