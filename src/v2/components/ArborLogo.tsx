"use client";

import { useEffect, useRef, useState } from "react";
import wordmark from "../../../public/images/sponsors/arbor_wordmark.png";

// The Arbor sponsor logo with the tree grown in when it scrolls into view,
// as on trading.camp: root node, branches drawn out, next tier, repeat.
// Geometry matches the old flat PNG (925×300: tree at left, wordmark right).
const GREEN = "#189e3a";
const ROOT: [number, number] = [200, 60];
const MID: [number, number][] = [
  [135, 145],
  [265, 145],
];
const LEAVES: [number, number][] = [
  [102.5, 230],
  [167.5, 230],
  [232.5, 230],
  [297.5, 230],
];
const TIER1_LEN = 110;
const TIER2_LEN = 92;
const NODE_MS = 400;
const BRANCH_MS = 500;
const T_BRANCH1 = NODE_MS;
const T_MID = T_BRANCH1 + BRANCH_MS;
const T_BRANCH2 = T_MID + NODE_MS;
const T_LEAF = T_BRANCH2 + BRANCH_MS;
const START_DELAY_MS = 600;

function Branch({
  from,
  to,
  len,
  delay,
}: {
  from: [number, number];
  to: [number, number];
  len: number;
  delay: number;
}) {
  return (
    <line
      className="arbor-branch"
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      style={{
        strokeDasharray: len,
        strokeDashoffset: len,
        animationDelay: `${delay}ms`,
        animationDuration: `${BRANCH_MS}ms`,
      }}
    />
  );
}

function Node({ at, delay }: { at: [number, number]; delay: number }) {
  return (
    <circle
      className="arbor-node"
      cx={at[0]}
      cy={at[1]}
      r={19}
      style={{
        transformOrigin: `${at[0]}px ${at[1]}px`,
        animationDelay: `${delay}ms`,
        animationDuration: `${NODE_MS}ms`,
      }}
    />
  );
}

export default function ArborLogo({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timer = setTimeout(() => setGrown(true), START_DELAY_MS);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 925 300"
      width={925}
      height={300}
      role="img"
      aria-label="Arbor logo"
      data-grown={grown || undefined}
      className={className}
    >
      <g
        transform="translate(12 12) scale(1.2174) translate(-73.5 -31)"
        fill={GREEN}
        stroke={GREEN}
        strokeWidth={8}
        strokeLinecap="round"
      >
        <g fill="none">
          {MID.map((m, i) => (
            <Branch
              key={i}
              from={ROOT}
              to={m}
              len={TIER1_LEN}
              delay={T_BRANCH1}
            />
          ))}
          {LEAVES.map((l, i) => (
            <Branch
              key={i}
              from={MID[i >> 1]}
              to={l}
              len={TIER2_LEN}
              delay={T_BRANCH2}
            />
          ))}
        </g>
        <g stroke="none">
          <Node at={ROOT} delay={0} />
          {MID.map((m, i) => (
            <Node key={i} at={m} delay={T_MID} />
          ))}
          {LEAVES.map((l, i) => (
            <Node key={i} at={l} delay={T_LEAF} />
          ))}
        </g>
      </g>
      <image href={wordmark.src} x={356} y={70} width={548} height={164} />
    </svg>
  );
}
