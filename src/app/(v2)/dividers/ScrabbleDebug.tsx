"use client";

import { RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import ScrabbleDivider, {
  rerollRack,
  type ScrabbleHandle,
} from "@/v2/components/dividers/scrabble";
import WordEntry from "@/v2/components/dividers/scrabble/WordEntry";

// The rack is meant to be slow to spell on (until someone spells TYPE). Here,
// clicking the label opens the same entry from the start, plus a reset that brings back a
// rack FALL, RISE or ZOOM has ended.
export default function ScrabbleDebug() {
  const rack = useRef<ScrabbleHandle>(null);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [generation, setGeneration] = useState(0);

  const type = (next: string) => {
    setWord(next);
    rack.current?.spell(next);
  };

  const reset = () => {
    setWord("");
    rerollRack();
    setGeneration((n) => n + 1);
  };

  return (
    <>
      <div className="absolute top-1/2 left-0 z-10 -translate-y-1/2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-xs text-ink/50 underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          scrabble
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-2 flex items-center gap-2">
            <WordEntry word={word} onChange={type} />
            <button
              type="button"
              onClick={reset}
              aria-label="Reset the rack"
              className="rounded p-1.5 text-ink/50 hover:text-ink"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        )}
      </div>
      <ScrabbleDivider key={generation} ref={rack} />
    </>
  );
}
