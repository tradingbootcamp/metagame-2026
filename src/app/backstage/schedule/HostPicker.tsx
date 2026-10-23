"use client";

import { useState } from "react";
import { ArrowUpIcon, XIcon } from "lucide-react";
import AccountAdder from "./AccountAdder";
import type { ScheduleAccount } from "@/lib/schedule";

export default function HostPicker({
  initial,
  error,
}: {
  initial: ScheduleAccount[];
  error?: string | null;
}) {
  const [hosts, setHosts] = useState(initial);
  const add = (host: ScheduleAccount) =>
    setHosts((hs) =>
      hs.some((h) => h.userId === host.userId) ? hs : [...hs, host],
    );

  const moveUp = (i: number) =>
    setHosts((hs) => {
      const next = [...hs];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });

  return (
    <div className="text-sm sm:col-span-2">
      <span className="mb-1 block font-medium text-ink/80">Hosts</span>
      {hosts.map((h) => (
        <input key={h.userId} type="hidden" name="hostId" value={h.userId} />
      ))}

      {hosts.length > 0 && (
        <ul className="mb-2 divide-y divide-line rounded-lg border border-line">
          {hosts.map((h, i) => (
            <li key={h.userId} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-ink">{h.name}</span>
                {i === 0 && hosts.length > 1 && (
                  <span className="ml-2 rounded bg-navy/10 px-1.5 py-0.5 text-xs text-navy">
                    Lead
                  </span>
                )}
                {h.name !== h.email && (
                  <span className="block truncate text-xs text-ink/50">
                    {h.email}
                  </span>
                )}
              </div>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  aria-label={`Move ${h.name} up`}
                  title="Move up"
                  className="rounded p-1 text-ink/40 hover:text-navy"
                >
                  <ArrowUpIcon className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setHosts((hs) => hs.filter((x) => x.userId !== h.userId))
                }
                aria-label={`Remove ${h.name}`}
                title="Remove"
                className="rounded p-1 text-ink/40 hover:text-meeple"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AccountAdder
        label="Add host"
        exclude={hosts.map((h) => h.userId)}
        onPick={add}
      />
      {error && <span className="mt-1 block text-xs text-meeple">{error}</span>}
    </div>
  );
}
