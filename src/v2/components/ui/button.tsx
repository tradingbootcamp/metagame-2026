import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/v2/lib/utils";

// The site button, themed onto the Metagame palette. Roboto is baked in as the
// label font, so every button gets it. Pass `asChild` to render an <a> (or any
// element) instead of a <button> while keeping the styling.
const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 font-roboto font-semibold whitespace-nowrap transition-[transform,background,border-color,box-shadow] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 after:absolute after:inset-0",
  {
    variants: {
      variant: {
        // Flat solid CTA (meeple) — the site default (e.g. "Propose a session").
        default:
          "rounded-lg border-[1.5px] border-transparent bg-meeple text-white hover:-translate-y-px hover:bg-meeple-dark hover:after:-bottom-[2.5px]",
        // Navy solid — secondary actions / archive links ("See last year's").
        navy: "rounded-lg border-[1.5px] border-transparent bg-navy text-white hover:-translate-y-px hover:bg-navy2 hover:after:-bottom-[2.5px]",
        // Outlined-on-navy.
        ghost:
          "rounded-lg border-[1.5px] border-cream/55 text-cream hover:-translate-y-px hover:border-cream hover:bg-cream/10 hover:after:-bottom-[2.5px]",
        // Ticket-tile preset: bordered navy face where a salmon hard offset
        // shadow grows and the face slides up-left on hover.
        raised:
          "border-2 border-cream/30 bg-navy text-cream shadow-[0_0_0_0_#fa8072] hover:-translate-x-[5px] hover:-translate-y-[5px] hover:border-cream/60 hover:shadow-[8px_8px_0_0_#fa8072] hover:after:-right-[7px] hover:after:-bottom-[7px]",
        // Rulebook ticket: one ruled row of the join chapter's price list. The
        // first child (the name) and third (a note) stack on the left; the
        // second (the price) sits at the right across both rows.
        tile: "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 rounded-none border-b border-navy/15 px-2 py-4 text-left whitespace-normal text-navy hover:bg-tan/20 [&>:nth-child(2)]:col-start-2 [&>:nth-child(2)]:row-span-2 [&>:nth-child(2)]:row-start-1",
      },
      size: {
        sm: "px-4 py-[9px] text-sm",
        default: "px-[22px] py-3 text-[15px]",
        lg: "px-8 py-3.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
