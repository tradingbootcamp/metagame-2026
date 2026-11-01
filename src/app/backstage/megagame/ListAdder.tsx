"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import PlayerAdder from "./PlayerAdder";
import { listHref, listQueue } from "./player-list";

/** Adds to the list kept in the URL. A scanned quest label opens that quest with the list. */
export default function ListAdder({
  path,
  ids,
}: {
  path: string;
  ids: string[];
}) {
  const router = useRouter();
  const [queue] = useState(listQueue);
  const [navigating, start] = useTransition();

  useEffect(() => {
    if (!navigating) queue.settle();
  }, [navigating, queue]);

  return (
    <PlayerAdder
      onAdd={(p) => {
        const next = queue.add(ids, p.id);
        start(() => router.replace(listHref(path, next), { scroll: false }));
      }}
      onQuest={(code) =>
        router.push(
          listHref(`/backstage/megagame/q/${code}`, queue.current(ids)),
        )
      }
    />
  );
}
