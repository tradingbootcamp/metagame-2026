"use client";

import { useRouter } from "next/navigation";
import CodeEntry from "./CodeEntry";
import { listHref } from "./player-list";

export default function QuestCodeEntry({ players }: { players: string[] }) {
  const router = useRouter();
  return (
    <CodeEntry
      label="Quest code"
      autoFocus
      onCode={(code) => {
        router.push(listHref(`/backstage/megagame/q/${code}`, players));
        return false;
      }}
    />
  );
}
