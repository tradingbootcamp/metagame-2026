"use client";

import { useRef, useState, useTransition } from "react";
import { removeAvatar, saveAvatar, type AvatarResult } from "./actions";
import { downscaleImage } from "@/lib/downscale-image";
import { Button } from "@/v2/components/ui/button";

const AVATAR_PX = 512;

const GREY_LINK =
  "text-sm text-ink/55 underline-offset-2 hover:text-ink hover:underline disabled:opacity-60";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default function AvatarForm({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<AvatarResult>) =>
    start(async () => {
      try {
        setError((await action()).error ?? null);
      } catch {
        setError("Couldn’t save that. Try again.");
      }
    });

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That isn’t an image.");
      return;
    }
    run(async () => {
      let small: File;
      try {
        small = await downscaleImage(file, AVATAR_PX);
      } catch {
        return { error: "Couldn’t read that image." };
      }
      const data = new FormData();
      data.set("image", small);
      return saveAvatar(data);
    });
  };

  return (
    <div className="flex items-center gap-5">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy/10 font-grotesk text-2xl font-bold text-navy">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- already avatar-sized
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden>{initials(name)}</span>
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            size="sm"
            variant="navy"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
          >
            {pending ? "Saving…" : imageUrl ? "Change photo" : "Add a photo"}
          </Button>
          {imageUrl && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(removeAvatar)}
              className={GREY_LINK}
            >
              Remove
            </button>
          )}
        </div>
        <p aria-live="polite" className="min-h-5 text-sm text-meeple">
          {error}
        </p>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
