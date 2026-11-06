"use client";

import {
  useActionState,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { buttonClass, fieldClass, smallButtonClass } from "../ui";
import { claimFor, findAccounts } from "./actions";
import { latestRequest } from "../megagame/latest";
import { CHECKIN_MIN_CHARS, type CheckinAccount } from "@/lib/checkin";

/** Claims the ticket for an account: the purchaser's when we know it, else one searched for. */
export default function ClaimPicker({
  paymentId,
  suggested,
}: {
  paymentId: string;
  suggested: CheckinAccount | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CheckinAccount[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searching, start] = useTransition();
  const [search] = useState(latestRequest);
  const [state, run, pending] = useActionState(claimFor, {});
  const searchId = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < CHECKIN_MIN_CHARS) return;
    const timer = setTimeout(() => {
      const isCurrent = search.begin();
      start(async () => {
        const res = await findAccounts(q);
        if (!isCurrent()) return;
        setLookupError(res.error ?? null);
        setHits(res.accounts ?? []);
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      search.cancel();
    };
  }, [query, search]);

  const claim = (account: CheckinAccount) => (
    <form action={run} className="flex items-center gap-3">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="forUserId" value={account.id} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-navy">
          {account.name}
        </span>
        <span className="block truncate font-mono text-xs text-ink/60">
          {account.email}
        </span>
      </span>
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass} w-auto py-2`}
      >
        {pending ? "Claiming…" : "Claim for them"}
      </button>
    </form>
  );

  const error = state.error ?? lookupError;

  return (
    <div className="flex flex-col gap-3">
      {suggested && claim(suggested)}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${smallButtonClass} self-start py-2`}
        >
          {suggested ? "Claim for someone else…" : "Claim for…"}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={searchId} className="text-sm font-medium text-ink/80">
            Their account, by name or email
          </label>
          <input
            id={searchId}
            type="search"
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < CHECKIN_MIN_CHARS) setHits([]);
            }}
            placeholder="At least two letters"
            className={fieldClass}
          />
          {searching && <p className="text-sm text-ink/60">Searching…</p>}
          {!searching &&
            query.trim().length >= CHECKIN_MIN_CHARS &&
            hits.length === 0 && (
              <p className="text-sm text-ink/60">
                No account matches. They need to sign in at metagame.games/login
                first, then search again.
              </p>
            )}
          {hits.length > 0 && (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-white">
              {hits.map((a) => (
                <li key={a.id} className="px-3 py-2.5">
                  {claim(a)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-meeple">
          {error}
        </p>
      )}
    </div>
  );
}
