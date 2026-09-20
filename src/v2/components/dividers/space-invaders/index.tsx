"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import { GLYPH_PX, ICON_GAP, ICON_GAP_PX } from "../sizing";
import { trackClick, trackEgg } from "../track";
import { BOOM, BUNKER_ROWS, CANNON, CRAB, SQUID, bunker } from "./icons";

// Field geometry, in CSS px: four boxes in a row, as DividerRow lays them
// out. One sprite pixel is PX; the 8-row art sits centred in its box.
const BOX = GLYPH_PX;
const PX = BOX / 13;
const HOME = [0, 1, 2, 3].map((i) => i * (BOX + ICON_GAP_PX));
const FIELD = HOME[3] + BOX;
const ART_TOP = (BOX - 8 * PX) / 2;
const ART_BOTTOM = ART_TOP + 8 * PX;
const RISE = 10 * PX;
const STEP = 2 * PX;
const BOLT = 3 * PX;

// `inset`: blank sprite-pixel columns either side of the art within its box.
const ALIENS = [
  { home: HOME[0], inset: 2.5, frames: SQUID },
  { home: HOME[1], inset: 1, frames: CRAB },
];

const CANNON_SPEED = 240;
const SHOT_SPEED = 220;
const BOMB_SPEED = 70;
const MARCH_MS = [0, 110, 250];

type Phase = "idle" | "rise" | "play" | "dead" | "won";
type Fate = "alive" | "boom" | "dead";
type Bolt = { x: number; y: number };

const place = (el: HTMLElement | null, x: number, y: number, glide = false) => {
  if (!el) return;
  el.style.transition = glide
    ? "transform 400ms ease-in-out, opacity 300ms"
    : "none";
  el.style.transform = x || y ? `translate(${x}px, ${y}px)` : "";
};

const newGame = () => ({
  cannon: HOME[3],
  target: null as number | null,
  dir: 0,
  fire: false,
  held: false,
  fx: 0,
  fy: -2 * RISE,
  way: 1,
  march: 0,
  alive: [true, true],
  shot: null as Bolt | null,
  bombs: [] as Bolt[],
  bombIn: 1,
  bunker: BUNKER_ROWS,
  last: 0,
  over: false,
});

// squid · crab · bunker · cannon. Click the row and it opens out into a game:
// the mouse or ←/→ steers, a click or space fires; a tap slides over and fires,
// and a held drag steers with autofire. Clearing both invaders earns a star
// under the cannon.
// Not mounted anywhere yet.
export default function SpaceInvadersDivider() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fates, setFates] = useState<Fate[]>(["alive", "alive"]);
  const [frame, setFrame] = useState(0);
  const [rows, setRows] = useState(BUNKER_ROWS);
  const [starred, setStarred] = useState(false);

  const field = useRef<HTMLDivElement>(null);
  const alienEls = useRef<(HTMLElement | null)[]>([]);
  const bunkerEl = useRef<HTMLSpanElement>(null);
  const cannonEl = useRef<HTMLSpanElement>(null);
  const shotEl = useRef<HTMLSpanElement>(null);
  const bombEls = useRef<(HTMLElement | null)[]>([]);

  const reset = useCallback(() => {
    [...alienEls.current, bunkerEl.current, cannonEl.current].forEach((el) =>
      place(el, 0, 0, true),
    );
    setPhase("idle");
    setFates(["alive", "alive"]);
    setFrame(0);
    setRows(BUNKER_ROWS);
  }, []);

  const start = () => {
    if (phase !== "idle") return;
    trackClick("invaders");
    place(bunkerEl.current, 0, -RISE, true);
    alienEls.current.forEach((el) => place(el, 0, -2 * RISE, true));
    setPhase("rise");
  };

  useEffect(() => {
    if (phase === "rise") {
      const t = setTimeout(() => setPhase("play"), 420);
      return () => clearTimeout(t);
    }
    if (phase === "dead" || phase === "won") {
      const t = setTimeout(reset, 900);
      return () => clearTimeout(t);
    }
  }, [phase, reset]);

  useEffect(() => {
    if (phase !== "play") return;
    const g = newGame();

    const end = (p: Phase) => {
      g.over = true;
      setPhase(p);
    };

    const erase = (cells: [number, number][]) => {
      g.bunker = g.bunker.map((row, r) =>
        [...row]
          .map((c, col) =>
            cells.some(([x, y]) => x === col && y === r) ? "." : c,
          )
          .join(""),
      );
      setRows(g.bunker);
    };

    // A bolt chews out the cell it lands on and the one behind it.
    const hitBunker = (x: number, y: number, dy: number) => {
      const col = Math.floor((x - HOME[2]) / PX - 0.5);
      const row = Math.floor((y + RISE - ART_TOP) / PX);
      if (g.bunker[row]?.[col] !== "#") return false;
      erase([
        [col, row],
        [col, row + dy],
      ]);
      return true;
    };

    const alienBox = (i: number) => {
      const { home, inset } = ALIENS[i];
      return {
        x0: g.fx + home + inset * PX,
        x1: g.fx + home + BOX - inset * PX,
        y0: g.fy + ART_TOP,
        y1: g.fy + ART_BOTTOM,
      };
    };

    const kill = (i: number) => {
      g.alive[i] = false;
      setFates((f) => f.map((v, j) => (j === i ? "boom" : v)));
      setTimeout(
        () =>
          setFates((f) =>
            f.map((v, j) => (j === i && v === "boom" ? "dead" : v)),
          ),
        300,
      );
      if (!g.alive.includes(true)) {
        setStarred(true);
        trackEgg({ egg: "invaders", event: "win" });
        end("won");
      }
    };

    const shotHits = ({ x, y }: Bolt) => {
      if (hitBunker(x, y, -1)) return true;
      const i = ALIENS.findIndex((_, j) => {
        const b = alienBox(j);
        return g.alive[j] && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
      });
      if (i < 0) return false;
      kill(i);
      return true;
    };

    const bombHits = ({ x, y }: Bolt) => {
      if (hitBunker(x, y, 1)) return true;
      const onCannon =
        x >= g.cannon && x <= g.cannon + BOX && y >= ART_TOP + 3 * PX;
      if (onCannon) end("dead");
      return onCannon;
    };

    // Sub-stepped so a fast bolt can't skip a bunker cell. True once it's spent.
    const fly = (b: Bolt, dy: number, hits: (b: Bolt) => boolean) => {
      const n = Math.ceil(Math.abs(dy) / PX);
      for (let i = 0; i < n; i++) {
        b.y += dy / n;
        if (hits(b)) return true;
      }
      return b.y < -2 * RISE - BOX || b.y > BOX;
    };

    const march = () => {
      const live = ALIENS.filter((_, i) => g.alive[i]);
      const lo = -Math.min(...live.map((a) => a.home + a.inset * PX));
      const hi =
        FIELD - Math.max(...live.map((a) => a.home + BOX - a.inset * PX));
      const next = g.fx + g.way * STEP;
      if (next < lo || next > hi) {
        g.fy += STEP;
        g.way = -g.way;
      } else g.fx = next;
      setFrame((f) => 1 - f);

      const trampled: [number, number][] = [];
      ALIENS.forEach((_, i) => {
        if (!g.alive[i]) return;
        const b = alienBox(i);
        g.bunker.forEach((row, r) =>
          [...row].forEach((c, col) => {
            const x = HOME[2] + (col + 0.5) * PX;
            const y = ART_TOP - RISE + r * PX;
            if (
              c === "#" &&
              x < b.x1 &&
              x + PX > b.x0 &&
              y < b.y1 &&
              y + PX > b.y0
            )
              trampled.push([col, r]);
          }),
        );
      });
      if (trampled.length) erase(trampled);
      if (g.fy + ART_BOTTOM > ART_TOP + 3 * PX) end("dead");
    };

    const paint = () => {
      ALIENS.forEach(
        (_, i) => g.alive[i] && place(alienEls.current[i], g.fx, g.fy),
      );
      place(cannonEl.current, g.cannon - HOME[3], 0);
      const bolts: [HTMLElement | null, Bolt | undefined, number][] = [
        [shotEl.current, g.shot ?? undefined, 0],
        ...bombEls.current.map(
          (el, i) => [el, g.bombs[i], -BOLT] as [typeof el, Bolt, number],
        ),
      ];
      bolts.forEach(([el, b, dy]) => {
        if (!el) return;
        el.style.opacity = b ? "1" : "0";
        if (b) place(el, b.x - PX / 2, b.y + dy);
      });
    };

    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - (g.last || now), 50) / 1000;
      g.last = now;

      if (g.dir) g.cannon += g.dir * CANNON_SPEED * dt;
      else if (g.target !== null) {
        const gap = g.target - g.cannon;
        g.cannon += Math.sign(gap) * Math.min(Math.abs(gap), CANNON_SPEED * dt);
      }
      g.cannon = Math.max(0, Math.min(FIELD - BOX, g.cannon));

      const arrived = g.target === null || Math.abs(g.target - g.cannon) < 1;
      if ((g.fire || g.held) && !g.shot && arrived) {
        g.shot = { x: g.cannon + BOX / 2, y: ART_TOP };
        g.fire = false;
      }
      if (g.shot && fly(g.shot, -SHOT_SPEED * dt, shotHits)) g.shot = null;
      g.bombs = g.bombs.filter((b) => !fly(b, BOMB_SPEED * dt, bombHits));

      const left = g.alive.filter(Boolean).length;
      if (left) {
        g.march += dt * 1000;
        while (g.march >= MARCH_MS[left]) {
          g.march -= MARCH_MS[left];
          march();
        }
        g.bombIn -= dt;
        if (g.bombIn <= 0 && g.bombs.length < 2) {
          const from = ALIENS.map((_, i) => i).filter((i) => g.alive[i]);
          const b = alienBox(from[Math.floor(Math.random() * from.length)]);
          g.bombs.push({ x: (b.x0 + b.x1) / 2, y: b.y1 });
          g.bombIn = 0.6 + Math.random();
        }
      }

      paint();
      if (!g.over) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const aim = (clientX: number) => {
      const left = field.current?.getBoundingClientRect().left ?? 0;
      g.target = clientX - left - BOX / 2;
      g.dir = 0;
    };
    // A touch only aims while it's dragging the field; otherwise it's a scroll.
    const onMove = (e: PointerEvent) =>
      (e.pointerType === "mouse" || g.held) && aim(e.clientX);
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node && field.current?.contains(e.target)))
        return;
      aim(e.clientX);
      g.fire = g.held = true;
    };
    const onUp = () => (g.held = false);
    const DIRS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    const typing = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement &&
      (e.target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.key === "Escape") return reset();
      if (DIRS[e.key]) {
        g.dir = DIRS[e.key];
        g.target = null;
      } else if (e.key === " " || e.key === "ArrowUp") g.fire = true;
      else return;
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (DIRS[e.key] === g.dir) g.dir = 0;
    };

    // Scrolled away: pack up, so space and the arrows go back to the page.
    const seen = new IntersectionObserver(
      ([entry]) => !entry.isIntersecting && reset(),
    );
    if (field.current) seen.observe(field.current);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const bolts = [shotEl.current, ...bombEls.current];
    return () => {
      cancelAnimationFrame(raf);
      seen.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      bolts.forEach((el) => el && (el.style.opacity = "0"));
    };
  }, [phase, reset]);

  const BOLT_CLASS =
    "pointer-events-none absolute top-0 left-0 bg-[#4d4d4d] opacity-0";
  const boltSize = { width: PX, height: BOLT };

  return (
    <DividerRow>
      <div
        ref={field}
        onClick={start}
        className={`relative flex items-center ${ICON_GAP}`}
      >
        {ALIENS.map((a, i) => (
          <span
            key={a.frames[0].name}
            ref={(el) => {
              alienEls.current[i] = el;
            }}
            className={`inline-flex ${fates[i] === "dead" ? "opacity-0" : ""}`}
          >
            <IconGlyph icon={fates[i] === "boom" ? BOOM : a.frames[frame]} />
          </span>
        ))}
        <span ref={bunkerEl} className="inline-flex">
          <IconGlyph icon={bunker(rows)} />
        </span>
        <span ref={cannonEl} className="relative inline-flex">
          <IconGlyph icon={phase === "dead" ? BOOM : CANNON} />
          {starred && (
            <Star
              aria-hidden
              size={9}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 fill-meeple text-meeple"
              style={{ top: ART_BOTTOM + 1 }}
            />
          )}
        </span>
        <span
          ref={shotEl}
          aria-hidden
          className={BOLT_CLASS}
          style={boltSize}
        />
        {[0, 1].map((i) => (
          <span
            key={i}
            ref={(el) => {
              bombEls.current[i] = el;
            }}
            aria-hidden
            className={BOLT_CLASS}
            style={boltSize}
          />
        ))}
        {/* Catches clicks in the sky above the row while the game is on. */}
        {phase === "play" && (
          <span className="absolute -inset-x-8 -top-16 -bottom-5 touch-pan-y" />
        )}
      </div>
    </DividerRow>
  );
}
