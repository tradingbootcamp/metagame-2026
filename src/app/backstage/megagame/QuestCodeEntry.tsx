"use client";

import { useRouter } from "next/navigation";
import CodeEntry from "./CodeEntry";
import { listHref } from "./player-list";
import ScanCodes from "./ScanCodes";

export default function QuestCodeEntry({ players }: { players: string[] }) {
  const router = useRouter();
  const open = (code: string) =>
    router.push(listHref(`/backstage/megagame/q/${code}`, players));
  return (
    <div className="flex flex-col gap-3">
      <CodeEntry
        label="Quest code"
        autoFocus
        onCode={(code) => {
          open(code);
          return false;
        }}
      />
      <ScanCodes label="Scan a quest label" bareKind="quest" onQuest={open} />
    </div>
  );
}
