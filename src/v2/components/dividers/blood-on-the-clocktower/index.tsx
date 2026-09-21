"use client";

import { useRef, useState } from "react";
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import Crossbow from "./Crossbow";
import { trackClick, trackEgg } from "../track";
import { ICONS } from "./icons";

// Every glyph gets its own compositing layer up front. Rotating one grows its
// ink past its box, and a layer whose bounds move re-snaps everything it paints
// — which is the whole row twitching a pixel each time a beat starts or ends.
const LAYER = "transform-gpu will-change-transform";
const SPIN = `inline-flex ${LAYER} transition-[rotate,translate,opacity] ease-in`;

// blood · crossbow · demon's trident · clock tower — a nod to Blood on the
// Clocktower. Click the crossbow and it swings round onto the trident; click
// again and it shoots, the trident keeling over. A third click resets.
export default function BloodOnTheClocktowerDivider() {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const bolt = useRef<HTMLSpanElement>(null);

  const onCrossbow = () => {
    trackClick("clocktower");
    if (stage === 1) {
      trackEgg({ egg: "clocktower", event: "kill" });
      bolt.current?.animate(
        [
          { opacity: 1, transform: "translateX(0)" },
          { opacity: 1, transform: "translateX(33px)" },
        ],
        { duration: 160, easing: "linear" },
      );
    }
    setStage(((stage + 1) % 3) as 0 | 1 | 2);
  };

  return (
    <DividerRow game="botct">
      {ICONS.map((icon) => {
        if (icon.name === "crossbow") {
          return (
            <span key={icon.name} className="relative inline-flex">
              {/* Three taps on one spot: touch-manipulation stops iOS reading
                  the second as double-tap-to-zoom and scaling the page. */}
              <span
                onClick={onCrossbow}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className={`${SPIN} touch-manipulation duration-300 select-none pointer-coarse:cursor-pointer ${stage ? "rotate-45" : ""}`}
              >
                <Crossbow d={icon.d ?? ""} fired={stage === 2} />
              </span>
              <span
                ref={bolt}
                className={`pointer-events-none absolute top-1/2 left-[22px] h-0.5 w-[11px] -translate-y-1/2 rounded-full bg-[#4d4d4d] opacity-0 ${LAYER}`}
              />
            </span>
          );
        }
        if (icon.name === "trident") {
          // The source glyph points down-right; -90° stands it up-right.
          return (
            <span
              key={icon.name}
              className={`${SPIN} ${
                stage === 2
                  ? "translate-y-[15px] -rotate-45 opacity-60 delay-150 duration-500"
                  : "-rotate-90 duration-300"
              }`}
            >
              <IconGlyph icon={icon} />
            </span>
          );
        }
        return <IconGlyph key={icon.name} icon={icon} className={LAYER} />;
      })}
    </DividerRow>
  );
}
