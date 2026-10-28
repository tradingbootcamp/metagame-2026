"use client";

import { useEffect, useState } from "react";

export type AccountStatus = { signedIn: boolean; admin: boolean };

// Asked from the client so the layout around the nav stays static; null
// until the answer arrives, so the nav needn't guess which link to show.
export function useAccountStatus(): AccountStatus | null {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/admin-status")
      .then((res) => (res.ok ? res.json() : {}))
      .then((body: Partial<AccountStatus>) => {
        if (live)
          setStatus({
            signedIn: body.signedIn === true,
            admin: body.admin === true,
          });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return status;
}
