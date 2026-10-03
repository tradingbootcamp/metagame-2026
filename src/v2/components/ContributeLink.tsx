"use client";

import { useState, type ReactNode } from "react";
import { FaGithub } from "react-icons/fa";
import { SOCIAL_LINKS } from "@/v2/lib/urls";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import { HEADING } from "./styles";

// Footer "Contribute to this site" item: a short pitch for forking the repo,
// then the GitHub link. Styling is caller-supplied, like ContactLink.
export default function ContributeLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`cursor-pointer text-left ${className ?? ""}`}
      >
        {children}
      </button>
      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="flex max-w-[460px] flex-col gap-5 p-6 sm:p-8">
            <div className="flex flex-col gap-1 pr-6">
              <DialogTitle
                className={`${HEADING} flex items-center gap-2 text-[clamp(24px,6vw,30px)]`}
              >
                <FaGithub aria-hidden className="text-tan" />
                Contribute to this site
              </DialogTitle>
              <DialogDescription className="text-base text-cream/80">
                Have an idea for a minigame, easter egg, or puzzle to add to
                this website? Make a PR and we&rsquo;ll take a look.
              </DialogDescription>
            </div>
            <Button asChild className="h-12 w-full gap-2 text-base">
              <a
                href={SOCIAL_LINKS.GITHUB}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGithub aria-hidden /> Open on GitHub
              </a>
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
