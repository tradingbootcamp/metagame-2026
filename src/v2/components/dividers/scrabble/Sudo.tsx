"use client";

import { X } from "lucide-react";

// SUDO: a page can't open the real DevTools, so this is a fake docked along
// the bottom of the viewport. It says outright that there's nothing to find,
// so nobody goes digging through the real console for a puzzle.
const LINES: [text: string, at: number][] = [
  ["$ this is not a puzzle. :(", 300],
];

export const SUDO_MS = 6000;

export default function Sudo({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="presentation"
      className="fixed inset-x-0 bottom-0 z-50 h-56 animate-[scrabble-dock_350ms_ease-out] border-t border-[#3c4043] bg-[#202124] font-mono text-xs text-[#e8eaed] shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-center gap-5 border-b border-[#3c4043] px-3 py-1.5 text-[#9aa0a6]">
        <span>Elements</span>
        <span className="border-b-2 border-[#8ab4f8] pb-0.5 text-[#e8eaed]">
          Console
        </span>
        <span>Sources</span>
        <span>Network</span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ml-auto hover:text-[#e8eaed]"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="space-y-1 p-3">
        {LINES.map(([text, at], i) => (
          <p
            key={i}
            className="animate-[scrabble-entry_1ms_both]"
            style={{ animationDelay: `${at}ms` }}
          >
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
