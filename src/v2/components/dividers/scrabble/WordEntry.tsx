"use client";

import { useState } from "react";
import { RACK_SIZE } from "./tiles";

// PIN-style entry for a rack's worth of letters: one invisible input over
// RACK_SIZE boxes. Typing past a full word starts the next one.
export default function WordEntry({
  word,
  onChange,
  disabled = false,
}: {
  word: string;
  onChange: (word: string) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const type = (raw: string) => {
    const letters = raw.toUpperCase().replace(/[^A-Z]/g, "");
    onChange(
      (letters.length > RACK_SIZE ? letters.slice(RACK_SIZE) : letters).slice(
        0,
        RACK_SIZE,
      ),
    );
  };

  return (
    <label
      className={`relative flex gap-1 transition-opacity duration-300 ${disabled ? "opacity-40" : ""}`}
    >
      {Array.from({ length: RACK_SIZE }, (_, i) => (
        <span
          key={i}
          className={`flex h-8 w-7 items-center justify-center rounded border font-mono text-sm ${
            focused && i === Math.min(word.length, RACK_SIZE - 1)
              ? "border-ink"
              : "border-ink/30"
          }`}
        >
          {word[i]}
        </span>
      ))}
      <input
        autoFocus
        disabled={disabled}
        value={word}
        onChange={(e) => type(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Spell a word on the rack"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="absolute inset-0 cursor-text opacity-0 disabled:cursor-default"
      />
    </label>
  );
}
