import {
  activeClasses,
  classLevelLabel,
  FACTION_NAMES,
  MAX_LEVEL,
  type MegagameLevels,
} from "@/lib/megagame-levels";
import { FACTION_COLORS } from "./FactionEmblem";
import { FactionMedal } from "./FactionPatch";

/**
 * One badge per class the person holds (they stack: players multiclass), each
 * the faction's medal, name and level pips. Nothing when every level is 0.
 */
export default function ClassBadges({ levels }: { levels: MegagameLevels }) {
  const active = activeClasses(levels);
  if (active.length === 0) return null;
  return (
    <ul aria-label="Megagame classes" className="flex flex-wrap gap-3">
      {active.map(({ class: c, level }) => (
        <li
          key={c}
          className="flex items-center gap-3 rounded-full border-2 border-navy bg-[#FFFBF2] py-1 pr-5 pl-1"
        >
          <span className="sr-only">{classLevelLabel(c, level)}</span>
          <FactionMedal faction={c} className="size-12" />
          <span aria-hidden className="flex flex-col gap-1.5 leading-none">
            <span className="font-[family-name:var(--font-bebas)] text-[22px] tracking-[0.04em] text-navy">
              {FACTION_NAMES[c]}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-space-mono text-[11px] font-bold tracking-[0.08em] text-ink/70 uppercase">
                Lv {level}
              </span>
              <span className="flex gap-1">
                {Array.from({ length: MAX_LEVEL }, (_, i) => (
                  <span
                    key={i}
                    className="size-2 rotate-45 border-[1.5px]"
                    style={{
                      borderColor: FACTION_COLORS[c],
                      background: i < level ? FACTION_COLORS[c] : "transparent",
                    }}
                  />
                ))}
              </span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
