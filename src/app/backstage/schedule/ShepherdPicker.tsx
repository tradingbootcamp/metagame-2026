"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import AccountAdder from "./AccountAdder";
import type { ScheduleAccount } from "@/lib/schedule";

export default function ShepherdPicker({
  initial,
  error,
}: {
  initial: ScheduleAccount | null;
  error?: string | null;
}) {
  const [shepherd, setShepherd] = useState(initial);

  return (
    <div className="text-sm sm:col-span-2">
      <span className="mb-1 block font-medium text-ink/80">Shepherd</span>
      <input
        type="hidden"
        name="shepherdUserId"
        value={shepherd?.userId ?? ""}
      />
      {shepherd ? (
        <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="font-medium text-ink">{shepherd.name}</span>
            {shepherd.name !== shepherd.email && (
              <span className="block truncate text-xs text-ink/50">
                {shepherd.email}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShepherd(null)}
            aria-label={`Remove ${shepherd.name} as shepherd`}
            title="Remove"
            className="rounded p-1 text-ink/40 hover:text-meeple"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : (
        <AccountAdder label="Set shepherd" exclude={[]} onPick={setShepherd} />
      )}
      {error && <span className="mt-1 block text-xs text-meeple">{error}</span>}
    </div>
  );
}
