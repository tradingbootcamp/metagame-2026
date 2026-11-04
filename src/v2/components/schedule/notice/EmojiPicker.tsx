"use client";

import Picker, { EmojiStyle, Theme } from "emoji-picker-react";

// Native glyphs, so the picker draws the same emoji the board will and never
// fetches images from a CDN.
export default function EmojiPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  return (
    <Picker
      onEmojiClick={(e) => onPick(e.emoji)}
      emojiStyle={EmojiStyle.NATIVE}
      theme={Theme.LIGHT}
      lazyLoadEmojis
      previewConfig={{ showPreview: false }}
      width={300}
      height={360}
    />
  );
}
