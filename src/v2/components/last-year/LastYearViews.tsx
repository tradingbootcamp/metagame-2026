"use client";

import { useState } from "react";
import LastYearSchedule from "../schedule/LastYearSchedule";
import { DISPLAY } from "../styles";
import WhatWasOn from "./WhatWasOn";

const VIEWS = [
  { id: "moment", label: "Moments" },
  { id: "schedule", label: "Full schedule" },
] as const;
type View = (typeof VIEWS)[number]["id"];

// The 2025 program two ways: what was on at any moment of the weekend (the
// default), or the full schedule grid.
export default function LastYearViews() {
  const [view, setView] = useState<View>("moment");
  return (
    <div>
      <div
        role="group"
        aria-label="View"
        className="inline-flex overflow-hidden rounded-xl border-2 border-navy"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
            className={`${DISPLAY} px-4 py-2 text-[20px] leading-none tracking-[0.04em] transition-colors sm:px-5 ${
              view === v.id ? "bg-navy text-cream" : "text-navy hover:bg-sky"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {view === "moment" ? <WhatWasOn /> : <LastYearSchedule />}
      </div>
    </div>
  );
}
