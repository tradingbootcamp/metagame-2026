import type { PointerEvent } from "react";

// A card that leans toward the mouse and catches the light: the handlers set
// --lean-x/-y and --shine-x/-y on the card, LEAN turns them into a tilt and
// SHINE (a layer inside the card) into a highlight. Mouse only, and still for
// anyone who'd rather not have motion.
export function lean(e: PointerEvent<HTMLElement>) {
  if (
    e.pointerType !== "mouse" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--lean-x", `${((0.5 - y) * 10).toFixed(2)}deg`);
  el.style.setProperty("--lean-y", `${((x - 0.5) * 12).toFixed(2)}deg`);
  el.style.setProperty("--shine-x", `${(x * 100).toFixed(1)}%`);
  el.style.setProperty("--shine-y", `${(y * 100).toFixed(1)}%`);
}

export function unlean(e: PointerEvent<HTMLElement>) {
  for (const p of ["--lean-x", "--lean-y", "--shine-x", "--shine-y"])
    e.currentTarget.style.removeProperty(p);
}

export const LEAN =
  "[transform:perspective(800px)_rotateX(var(--lean-x,0deg))_rotateY(var(--lean-y,0deg))]";

export const SHINE =
  "pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_var(--shine-x,50%)_var(--shine-y,50%),rgb(255_255_255/0.55),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100";
