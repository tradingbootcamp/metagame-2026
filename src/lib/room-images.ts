// Swapping a room's thumbnail and large image. Upload first, write the row,
// then delete what was replaced, so a failed save never leaves the room
// pointing at a deleted file.
import {
  LARGE_IMAGE_MAX_BYTES,
  THUMBNAIL_MAX_BYTES,
  deleteImage,
  uploadImage,
} from "./blob";
import type { RoomImages } from "./schedule-store";

/** The upload itself failed: wrong type, too large, or Blob unreachable. */
export class ImageUploadError extends Error {}

/** A new file replaces the image, null removes it, undefined keeps it. */
export type ImageChange = File | null | undefined;

export async function replaceRoomImages(
  current: RoomImages,
  change: { thumbnail: ImageChange; image: ImageChange },
  save: (next: RoomImages) => Promise<void>,
): Promise<RoomImages> {
  const uploaded: string[] = [];
  const next = async (
    url: string | null,
    file: ImageChange,
    maxBytes: number,
  ) => {
    if (file === undefined) return url;
    if (file === null) return null;
    let stored: string;
    try {
      stored = await uploadImage("rooms", file, maxBytes);
    } catch (err) {
      throw new ImageUploadError(
        err instanceof Error ? err.message : "Upload failed.",
      );
    }
    uploaded.push(stored);
    return stored;
  };
  let images: RoomImages;
  try {
    images = {
      thumbnailUrl: await next(
        current.thumbnailUrl,
        change.thumbnail,
        THUMBNAIL_MAX_BYTES,
      ),
      imageUrl: await next(
        current.imageUrl,
        change.image,
        LARGE_IMAGE_MAX_BYTES,
      ),
    };
    await save(images);
  } catch (err) {
    await Promise.all(uploaded.map(deleteImage));
    throw err;
  }
  await Promise.all(
    (["thumbnailUrl", "imageUrl"] as const)
      .filter((k) => current[k] !== images[k])
      .map((k) => deleteImage(current[k])),
  );
  return images;
}
