"use client";

import { useRouter } from "next/navigation";
import PlayerAdder from "./PlayerAdder";
import { listHref, withPlayer } from "./player-list";

/** Adds to the list kept in the URL. */
export default function ListAdder({
  path,
  ids,
}: {
  path: string;
  ids: string[];
}) {
  const router = useRouter();
  return (
    <PlayerAdder
      onAdd={(p) =>
        router.replace(listHref(path, withPlayer(ids, p.id)), {
          scroll: false,
        })
      }
    />
  );
}
