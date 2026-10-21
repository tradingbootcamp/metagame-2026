"use client";

import { useEffect, useState } from "react";

// Asked from the client so the layout around the nav stays static.
export function useIsAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/admin-status")
      .then((res) => (res.ok ? res.json() : { admin: false }))
      .then((body: { admin?: boolean }) => {
        if (live) setAdmin(body.admin === true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return admin;
}
