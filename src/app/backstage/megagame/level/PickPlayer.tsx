"use client";

import { useRouter } from "next/navigation";
import PlayerAdder from "../PlayerAdder";

export default function PickPlayer() {
  const router = useRouter();
  return (
    <PlayerAdder
      onAdd={(p) =>
        router.push(`/backstage/megagame/level?u=${encodeURIComponent(p.id)}`)
      }
    />
  );
}
