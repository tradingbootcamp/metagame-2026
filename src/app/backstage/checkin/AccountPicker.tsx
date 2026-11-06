"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { fieldClass, smallButtonClass } from "../ui";
import { findAccounts } from "./actions";
import { latestRequest } from "../megagame/latest";
import { CHECKIN_MIN_CHARS, type CheckinAccount } from "@/lib/checkin";

function AccountLine({ account }: { account: CheckinAccount }) {
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate font-medium text-navy">
        {account.name}
      </span>
      <span className="block truncate font-mono text-xs text-ink/60">
        {account.email}
      </span>
    </span>
  );
}

/** Picks the account a ticket is for: the one on the purchase, or one searched for. */
export default function AccountPicker({
  suggested,
  onPick,
}: {
  suggested: CheckinAccount | null;
  onPick: (account: CheckinAccount) => void;
}) {
  const [searching, setSearching] = useState(suggested === null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CheckinAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [search] = useState(latestRequest);
  const searchId = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < CHECKIN_MIN_CHARS) return;
    const timer = setTimeout(() => {
      const isCurrent = search.begin();
      start(async () => {
        const res = await findAccounts(q);
        if (!isCurrent()) return;
        setError(res.error ?? null);
        setHits(res.accounts ?? []);
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      search.cancel();
    };
  }, [query, search]);

  const pick = (account: CheckinAccount) => (
    <button
      type="button"
      onClick={() => onPick(account)}
      className="flex w-full items-center gap-3 rounded-lg border border-line bg-white px-3 py-3 hover:border-navy"
    >
      <AccountLine account={account} />
      <span className="shrink-0 text-sm font-semibold text-navy">Pick</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {suggested && pick(suggested)}
      {!searching ? (
        <button
          type="button"
          onClick={() => setSearching(true)}
          className={`${smallButtonClass} self-start py-2`}
        >
          Someone else…
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={searchId} className="text-sm font-medium text-ink/80">
            Search accounts by name or email
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
          {pending && <p className="text-sm text-ink/60">Searching…</p>}
          {!pending &&
            query.trim().length >= CHECKIN_MIN_CHARS &&
            hits.length === 0 && (
              <p className="text-sm text-ink/60">
                No account matches. They need to sign in at metagame.games/login
                first, then search again.
              </p>
            )}
          {hits.map((a) => (
            <div key={a.id}>{pick(a)}</div>
          ))}
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
