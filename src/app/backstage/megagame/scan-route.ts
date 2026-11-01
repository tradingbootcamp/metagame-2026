import { parseScannedCode } from "@/lib/megagame-rules";

export type ScanRoute =
  | { kind: "quest" | "player"; code: string }
  | { message: string };

/** A bare code counts as `bareKind`; a /q/ or /p/ link says what it is. */
export function routeScan(
  payload: string,
  bareKind: "quest" | "player",
  handles: { quest: boolean; player: boolean },
): ScanRoute {
  const scanned = parseScannedCode(payload);
  if (!scanned)
    return { message: "That QR code is not a quest label or a badge." };
  const kind = scanned.kind ?? bareKind;
  if (kind === "quest" && !handles.quest) {
    return { message: "That is a quest label. Scan a player's badge." };
  }
  if (kind === "player" && !handles.player) {
    return { message: "That is a player's badge. Scan a quest label." };
  }
  return { kind, code: scanned.code };
}
