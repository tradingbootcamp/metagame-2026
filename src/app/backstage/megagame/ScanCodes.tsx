"use client";

import { useCallback, useState } from "react";
import { smallButtonClass } from "../ui";
import { lookupPlayer, type PlayerHit } from "./actions";
import QrScanner from "./QrScanner";
import { parseScannedCode } from "@/lib/megagame-rules";
import { formatTicketCode } from "@/lib/ticket-code-format";

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
}: {
  label: string;
  bareKind: "quest" | "player";
  onPlayer?: (player: PlayerHit) => void;
  onQuest?: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const onDecode = useCallback(
    async (payload: string): Promise<string> => {
      const scanned = parseScannedCode(payload);
      if (!scanned) return "That QR code is not a quest label or a badge.";
      const kind = scanned.kind ?? bareKind;
      if (kind === "quest") {
        if (!onQuest) return "That is a quest label. Scan a player's badge.";
        onQuest(scanned.code);
        return `Opening quest ${formatTicketCode(scanned.code)}…`;
      }
      if (!onPlayer) return "That is a player's badge. Scan a quest label.";
      const res = await lookupPlayer(scanned.code);
      if (!res.player) return res.error ?? "Lookup failed.";
      onPlayer(res.player);
      return `Added ${res.player.name}. Scan the next badge.`;
    },
    [bareKind, onPlayer, onQuest],
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
