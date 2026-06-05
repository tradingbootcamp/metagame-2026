"use client";

import { useEffect, useState } from "react";
import styles from "./Dice.module.css";

// blue front spells META, orange right spells GAME, dark tops show 2026 in pips
const DICE = [
  { front: "M", right: "G", top: 2 },
  { front: "E", right: "A", top: 0 },
  { front: "T", right: "M", top: 2 },
  { front: "A", right: "E", top: 6 },
];

// 3x3 pip grid positions (0-8) for each value. Opposite faces sum to 7, so each
// die's bottom shows 7 - top — including 7 (a 6 with a center pip) opposite the blank.
const PIP_MAP: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
  7: [0, 2, 3, 4, 5, 6, 8],
};

const PHASE = {
  static: "rotateX(14deg) rotateY(-16deg)",
  meta: "rotateX(13deg) rotateY(-13deg)",
  game: "rotateX(8deg) rotateY(90deg)",
  year: "rotateX(-78deg) rotateY(8deg)",
};
const SEQ = ["meta", "game", "year"] as const;

function Pips({ value }: { value: number }) {
  const on = PIP_MAP[value] ?? [];
  return (
    <div className={styles.pips}>
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className={`${styles.pip} ${on.includes(i) ? styles.pipOn : styles.pipOff}`}
        />
      ))}
    </div>
  );
}

export default function Dice() {
  // Start on the static pose; animate unless the user prefers reduced motion.
  const [phase, setPhase] = useState<keyof typeof PHASE>("static");

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % SEQ.length;
      setPhase(SEQ[step]);
    }, 2300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.arena}>
      <div className={styles.diceRow}>
        {DICE.map((d, i) => (
          <div key={i} className={styles.dieWrap}>
            <div
              className={styles.die}
              style={{
                transform: PHASE[phase],
                transitionDelay: `${i * 0.11}s`,
              }}
            >
              <div className={`${styles.face} ${styles.front}`}>
                <span className={styles.glyph}>{d.front}</span>
              </div>
              <div className={`${styles.face} ${styles.right}`}>
                <span className={styles.glyph}>{d.right}</span>
              </div>
              <div className={`${styles.face} ${styles.top}`}>
                <Pips value={d.top} />
              </div>
              <div className={`${styles.face} ${styles.back}`}>
                <span className={styles.glyph}>{d.front}</span>
              </div>
              <div className={`${styles.face} ${styles.left}`}>
                <span className={styles.glyph}>{d.right}</span>
              </div>
              <div className={`${styles.face} ${styles.bottom}`}>
                <Pips value={7 - d.top} />
              </div>
            </div>
            <div className={styles.dieShadow} />
          </div>
        ))}
      </div>
    </div>
  );
}
