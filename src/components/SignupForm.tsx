"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

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
      <p className="mt-10 text-base text-foreground/80">
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  const inputClass =
    "h-12 rounded-full border border-foreground/15 bg-transparent px-5 text-base outline-none placeholder:text-foreground/40 focus:border-foreground/40";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 flex w-full max-w-sm flex-col gap-3"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
        aria-label="Name (optional)"
        autoComplete="name"
        className={`${inputClass} w-full`}
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
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-12 rounded-full bg-foreground px-6 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "…" : "Notify me"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-500">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
