"use client";

import { useCallback, useState } from "react";
import { smallButtonClass } from "../ui";
import { lookupPlayer, type PlayerHit } from "./actions";
import QrScanner from "./QrScanner";
import { routeScan } from "./scan-route";
import { formatTicketCode } from "@/lib/ticket-code-format";

const addedNext = (name: string) => `Added ${name}. Scan the next badge.`;

/**
 * A Scan button that opens the camera. A bare code counts as `bareKind`;
 * a /q/ or /p/ link says what it is. Without a handler for a kind, that
 * kind is reported instead of acted on.
 */
export default function ScanCodes({
  label,
  bareKind,
  onPlayer,
  onQuest,
  addedMessage = addedNext,
}: {
  label: string;
  bareKind: "quest" | "player";
  onPlayer?: (player: PlayerHit) => void;
  onQuest?: (code: string) => void;
  addedMessage?: (name: string) => string;
}) {
  const [open, setOpen] = useState(false);

  const onDecode = useCallback(
    async (payload: string): Promise<string> => {
      const route = routeScan(payload, bareKind, {
        quest: !!onQuest,
        player: !!onPlayer,
      });
      if ("message" in route) return route.message;
      if (route.kind === "quest") {
        onQuest!(route.code);
        return `Opening quest ${formatTicketCode(route.code)}…`;
      }
      const res = await lookupPlayer(route.code);
      if (!res.player) return res.error ?? "Lookup failed.";
      onPlayer!(res.player);
      return addedMessage(res.player.name);
    },
    [bareKind, onPlayer, onQuest, addedMessage],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${smallButtonClass} self-start`}
      >
        {label}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <QrScanner onDecode={onDecode} />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className={`${smallButtonClass} self-start`}
      >
        Stop scanning
      </button>
    </div>
  );
}
