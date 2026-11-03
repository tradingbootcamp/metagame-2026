"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { sessionDetails } from "@/app/(v2)/schedule/details";
import { sessionHref } from "@/lib/schedule";
import {
  closeSessionHref,
  openSessionHref,
  SESSION_PARAM,
  sessionPageSlug,
} from "@/lib/session-link";
import SessionModal, { SESSION_TITLE_ID } from "./SessionModal";

const HostContext = createContext(false);

/**
 * Where a session link should point from the current page: over it as
 * ?session=<slug> under a host, or to the session's own page without one
 * (the backstage tools).
 */
export function useSessionHref(): (slug: string) => string {
  const pathname = usePathname();
  const hosted = useContext(HostContext);
  return (slug) =>
    hosted ? openSessionHref(pathname, slug) : sessionHref({ slug });
}

/**
 * Opens the session named by the page's ?session= param over it. Under a
 * Suspense boundary so the prerendered pages (the home page) stay static.
 */
export default function SessionModalHost({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <HostContext value>
      {children}
      <Suspense fallback={null}>
        <ParamModal />
      </Suspense>
    </HostContext>
  );
}

function ParamModal() {
  const pathname = usePathname();
  const params = useSearchParams();
  const slug = params.get(SESSION_PARAM);
  // A session's own page renders its modal itself.
  if (!slug || sessionPageSlug(pathname)) return null;
  return (
    <SessionModal
      key={slug}
      closeHref={closeSessionHref(pathname, params.toString())}
      labelledBy={SESSION_TITLE_ID}
    >
      <LoadedSession slug={slug} />
    </SessionModal>
  );
}

const NOTE = "text-sm text-[#1b1530]/60";

/** The session's details, rendered on the server once the modal opens. */
function LoadedSession({ slug }: { slug: string }) {
  const [body, setBody] = useState<ReactNode>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    sessionDetails(slug)
      .then((node) => {
        if (!live) return;
        setBody(
          node ?? (
            <p id={SESSION_TITLE_ID} className={NOTE}>
              This session isn&rsquo;t on the schedule.
            </p>
          ),
        );
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [slug]);

  if (failed) {
    return (
      <p id={SESSION_TITLE_ID} className={NOTE}>
        Couldn&rsquo;t load this session. Try again.
      </p>
    );
  }
  return (
    body ?? (
      <p id={SESSION_TITLE_ID} className={NOTE}>
        Loading&hellip;
      </p>
    )
  );
}
