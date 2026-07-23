"use client";

import { useState } from "react";
import { FaEnvelope } from "react-icons/fa";

type Status = "idle" | "submitting" | "success" | "error";

// One-click join to the same newsletter list the splash form writes to. The email
// is already verified from the paid Checkout Session, so this is a single confirm
// button rather than an editable field — the click is the consent.
export default function ThanksOptIn({
  email,
  name,
}: {
  email: string;
  name?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function subscribe() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      // recordSignup upserts on email, so an already-subscribed buyer succeeds
      // here too — no duplicate, no error.
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-center text-base text-[#1b1530]">
        You&apos;re on the list — we&apos;ll keep you posted.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={subscribe}
        disabled={status === "submitting"}
        className="group relative disabled:opacity-60"
      >
        {/* dark box behind the blue button, revealed on hover (matches SignupForm's motion) */}
        <span aria-hidden className="absolute inset-0 bg-[#1b1530]" />
        <span className="relative flex h-12 items-center justify-center gap-2 bg-[#2b9bf0] px-7 font-[family-name:var(--font-bebas)] text-xl leading-[20px] tracking-[0.08em] text-[#1b1530] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px] group-disabled:translate-x-0! group-disabled:translate-y-0!">
          {status === "submitting" ? (
            "…"
          ) : (
            <>
              Sign up for future Metagame updates
              <FaEnvelope size={16} aria-hidden />
            </>
          )}
        </span>
      </button>
      <p className="text-sm text-[#1b1530]/70">{email}</p>
      {status === "error" && (
        <p className="text-sm text-[#c0392b]">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
