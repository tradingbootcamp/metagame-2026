"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/v2/components/ui/dialog";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import { FIELD_LIGHT } from "./styles";
import metaCryptics from "../../../public/images/meta_cryptics.jpg";

const ALT =
  "Whiteboard from the 2025 cryptic crossword contest, covered in handwritten clues whose answer is META";

type Status = "idle" | "submitting" | "error";

// The FAQ section's whiteboard photo: a button that opens the photo large
// beside a form that posts a clue to Airtable (/api/cryptic-clue), then
// optionally attaches a name/email to the same row.
export default function CrypticsLightbox({
  className,
}: {
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        className={`group cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${className ?? ""}`}
        aria-label="Open the cryptic crossword contest whiteboard larger"
      >
        <Image
          src={metaCryptics}
          alt={ALT}
          className="h-auto w-full border border-navy/10 shadow-[0_8px_24px_rgba(23,48,89,0.08)] transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(min-width: 1024px) 380px, 100vw"
        />
      </DialogTrigger>
      {/* Explicit width (630px, or the viewport on phones): a centered fixed
          box with auto width only gets half the viewport to size against,
          which squeezed the photo on mobile. The photo fills that width so
          the handwriting is legible; taller than the screen, the dialog
          scrolls. The form row beneath is exactly as wide as the photo. No
          close button: click outside or press Escape. */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100vh-1rem)] w-[min(630px,calc(100vw-1rem))] max-w-none flex-col gap-2 overflow-y-auto border-navy/15 bg-cream p-2 text-ink"
      >
        <DialogTitle className="sr-only">
          Cryptic Crossword Contest, 2025
        </DialogTitle>
        <DialogDescription className="sr-only">
          Every clue on the board resolves to META. Submit your own.
        </DialogDescription>
        <ClueForm />
      </DialogContent>
    </Dialog>
  );
}

const ERROR = "Something went wrong. Try again.";

// The photo over one 48px row, in every state, so the dialog never changes
// size: the row swaps from clue + Submit to Name + Email + Add after the clue
// lands, and status messages overlay the photo instead of taking a line.
function ClueForm() {
  const [clue, setClue] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  // null until the clue is stored; "" when Airtable wasn't configured (local
  // dev), in which case there's no row to attach a contact to.
  const [recordId, setRecordId] = useState<string | null>(null);
  const [contactDone, setContactDone] = useState(false);

  async function send(method: "POST" | "PATCH", body: unknown) {
    setStatus("submitting");
    try {
      const res = await fetch("/api/cryptic-clue", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("idle");
      return (await res.json()) as { id?: string };
    } catch {
      setStatus("error");
      return null;
    }
  }

  async function submitClue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await send("POST", { clue });
    if (result) setRecordId(result.id ?? "");
  }

  async function submitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await send("PATCH", { id: recordId, name, email });
    if (result) setContactDone(true);
  }

  const busy = status === "submitting";
  const message =
    status === "error"
      ? ERROR
      : contactDone
        ? "Our chaotic team might get in touch :)"
        : recordId === null
          ? ""
          : recordId
            ? "Innovative, mate! Drop your name if you'd like to be credited"
            : "Thanks!";

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Status (thanks / errors) floats over the photo's bottom corner so it
          takes no layout space and the dialog keeps one size. */}
      {/* On short phones the portrait photo is capped so the form row fits on
          screen without the dialog scrolling. Width stays 100%: with w-auto,
          next/image's intrinsic size comes from `sizes` and can be tiny. */}
      <div className="relative">
        <Image
          src={metaCryptics}
          alt={ALT}
          className="h-auto max-h-[calc(100svh-8rem)] w-full object-contain sm:max-h-none"
          sizes="(min-width: 640px) 630px, 100vw"
        />
        <p
          aria-live="polite"
          className={`absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-md px-3 py-1.5 text-sm font-semibold shadow-[0_4px_14px_rgba(23,48,89,0.25)] ${
            message ? "" : "hidden"
          } ${status === "error" ? "bg-meeple text-white" : "bg-navy text-cream"}`}
        >
          {message}
        </p>
      </div>
      {recordId === null ? (
        <form
          onSubmit={submitClue}
          className="flex shrink-0 flex-col gap-3 sm:flex-row"
        >
          <Input
            type="text"
            required
            maxLength={300}
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            placeholder="Submit your own cryptic clue"
            aria-label="Your cryptic clue"
            className={`${FIELD_LIGHT} min-w-0 sm:flex-1`}
          />
          <Button
            type="submit"
            disabled={busy || !clue.trim()}
            className="h-10 px-5 text-sm sm:h-12 sm:px-7 sm:text-base"
          >
            {busy ? "…" : "Submit"}
          </Button>
        </form>
      ) : (
        // Stays in the layout (invisible) once done or when there's no row,
        // so the dialog keeps its height.
        <form
          onSubmit={submitContact}
          className={`grid shrink-0 grid-cols-2 gap-3 sm:flex ${
            contactDone || !recordId ? "invisible" : ""
          }`}
        >
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="Name"
            autoComplete="name"
            className={`${FIELD_LIGHT} min-w-0 sm:flex-1`}
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email address"
            autoComplete="email"
            className={`${FIELD_LIGHT} min-w-0 sm:flex-1`}
          />
          <Button
            type="submit"
            variant="navy"
            disabled={busy || (!name.trim() && !email.trim())}
            className="col-span-2 h-10 px-5 text-sm sm:col-auto sm:h-12 sm:px-7 sm:text-base"
          >
            {busy ? "…" : "Add"}
          </Button>
        </form>
      )}
    </div>
  );
}
