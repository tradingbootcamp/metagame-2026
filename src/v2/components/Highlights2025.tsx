import Image from "next/image";
import { HIGHLIGHTS_2025 } from "@/v2/data/highlights-2025";
import { HEADING } from "./styles";

// A checkerboard: each session type is one row, photo in one column and the
// picked sessions with hosts in the other, sides alternating. Rows stack
// (photo first) on phones.
export default function Highlights2025() {
  return (
    <div className="mt-10 flex flex-col gap-6 md:gap-8">
      {HIGHLIGHTS_2025.map((g, i) => (
        <div key={g.label} className="grid md:grid-cols-2">
          {/* h-full: the row is as tall as the photo's natural height at column
              width or the list, whichever is taller; object-cover fills the rest. */}
          <Image
            src={g.photo}
            alt={g.alt}
            className={`h-full w-full object-cover ${
              i % 2
                ? "md:order-2 md:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
                : "md:[mask-image:linear-gradient(to_left,transparent,black_30%)]"
            }`}
            sizes="(min-width: 768px) 560px, 100vw"
          />
          <div className="self-center px-0 py-8 md:px-10 md:py-10">
            <h3 className={`${HEADING} text-[clamp(24px,3vw,32px)] text-navy`}>
              {g.label}
            </h3>
            <ul className="mt-5 flex flex-col gap-2.5">
              {g.sessions.map((s) => (
                <li key={s.title} className="leading-snug">
                  <span className={`${HEADING} text-[17px] text-navy`}>
                    {s.title}
                  </span>
                  {s.hosts && (
                    <span className="text-[15px] text-ink/60">
                      {" "}
                      &middot; {s.hosts}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
