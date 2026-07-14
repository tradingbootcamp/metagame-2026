"use client";

import { useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import {
  EMAIL_LIST_VALUE,
  INTEREST_OPTIONS,
  type InterestValue,
} from "@/lib/interests";
import { RFP_FORM_URL } from "@/lib/links";

type Status = "idle" | "submitting" | "success" | "error";

const FIELD =
  "h-12 w-full border-[1.5px] border-[#1b1530]/35 bg-[#f4ecd2] px-4 text-base text-[#1b1530] outline-none transition-colors placeholder:text-[#1b1530]/40 focus:border-[#2b9bf0]";

// Optional knock-on shown under the signup thank-you: re-posts to /api/signup with
// the email we just captured, so the upsert merges interests/notes onto the same row.
export default function InterestFollowup({ email }: { email: string }) {
  const [selected, setSelected] = useState<InterestValue[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // "Just the email list" and the specific interests are mutually exclusive.
  function toggle(value: InterestValue) {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (value === EMAIL_LIST_VALUE) return [EMAIL_LIST_VALUE];
      return [...prev.filter((v) => v !== EMAIL_LIST_VALUE), value];
    });
  }

  const empty = selected.length === 0 && notes.trim() === "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (empty) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interests: selected, notes }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-center text-sm text-[#1b1530]">
          Additional details submitted ✓
        </p>
        {/* Submitted "Speaking" → push them to the session-proposal (RFP) form. */}
        {selected.includes("speaking") && (
          <a
            href={RFP_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-block"
          >
            {/* orange box behind, revealed on hover as the blue front slides */}
            <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
            <span className="relative flex min-h-14 items-center justify-center gap-2 border-2 border-[#eaa35a] bg-[#2b9bf0] px-6 py-3 text-center font-[family-name:var(--font-bebas)] text-[clamp(18px,4.5vw,24px)] leading-tight tracking-[0.06em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
              Interested in speaking? Fill out the Session Proposal form!
              <FaArrowRight size={16} aria-hidden className="shrink-0" />
            </span>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-center text-sm text-[#1b1530]">
        Say more about your interest:
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <fieldset
          className="grid grid-cols-2 gap-2"
          aria-label="Nature of your interest"
        >
          {INTEREST_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 text-base"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-4 w-4 accent-[#2b9bf0]"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else you want us to know"
          aria-label="Anything else you want us to know"
          className={FIELD}
        />

        <button
          type="submit"
          disabled={empty || status === "submitting"}
          className="group/btn relative self-center disabled:opacity-60"
        >
          {/* blue box behind the button, revealed on hover */}
          <span aria-hidden className="absolute inset-0 bg-[#2b9bf0]" />
          <span className="relative flex h-12 items-center justify-center bg-[#1b1530] px-7 font-[family-name:var(--font-bebas)] text-xl leading-[20px] tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover/btn:-translate-x-[5px] group-hover/btn:-translate-y-[5px] group-disabled/btn:translate-x-0! group-disabled/btn:translate-y-0!">
            {status === "submitting" ? "…" : "Send"}
          </span>
        </button>

        {status === "error" && (
          <p className="text-sm text-[#c0392b]">
            Something went wrong. Try again.
          </p>
        )}
      </form>
    </div>
  );
}
