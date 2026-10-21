"use client";

import { useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

const MAX_ZOOM = 4;

export type PickedImage = { file: File; url: string };

export default function AvatarCropDialog({
  picked,
  onCancel,
  onSave,
}: {
  picked: PickedImage | null;
  onCancel: () => void;
  onSave: (file: File, area: Area) => void;
}) {
  return (
    <Dialog open={picked !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="flex max-w-[440px] flex-col gap-5 px-5 py-6 sm:px-8 sm:py-7">
        <DialogTitle className="font-bebas text-2xl tracking-wide text-cream">
          Crop your photo
        </DialogTitle>
        <DialogDescription className="-mt-3 text-sm text-cream/70">
          Drag to move it. Pinch, scroll or use the slider to zoom.
        </DialogDescription>
        {picked && (
          <CropControls
            key={picked.url}
            picked={picked}
            onCancel={onCancel}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CropControls({
  picked,
  onCancel,
  onSave,
}: {
  picked: PickedImage;
  onCancel: () => void;
  onSave: (file: File, area: Area) => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-ink">
        <Cropper
          image={picked.url}
          crop={crop}
          zoom={zoom}
          maxZoom={MAX_ZOOM}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
        />
      </div>
      <input
        type="range"
        aria-label="Zoom"
        min={1}
        max={MAX_ZOOM}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="w-full accent-salmon"
      />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!area}
          onClick={() => area && onSave(picked.file, area)}
        >
          Save
        </Button>
      </div>
    </>
  );
}
