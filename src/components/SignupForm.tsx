"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const FIELD =
  "h-12 border-[1.5px] border-[#1b1530]/35 bg-[#f4ecd2] px-4 text-base text-[#1b1530] outline-none transition-colors placeholder:text-[#1b1530]/40 focus:border-[#2b9bf0]";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      setName("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-center text-base text-[#1b1530]">
        Thanks — you&apos;re on the list. We&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
        aria-label="Name (optional)"
        autoComplete="name"
        className={`${FIELD} w-full`}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          autoComplete="email"
          className={`${FIELD} flex-1`}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-12 bg-[#1b1530] px-7 font-[family-name:var(--font-bebas)] text-xl tracking-[0.08em] text-[#f4ecd2] shadow-[5px_5px_0_#2b9bf0] transition-transform hover:-translate-x-[3px] hover:-translate-y-[3px] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          {status === "submitting" ? "…" : "Notify me"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-[#c0392b]">
          Something went wrong. Try again.
        </p>
      )}
    </form>
  );
}
