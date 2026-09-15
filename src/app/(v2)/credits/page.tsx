import type { Metadata } from "next";
import ContentPage from "@/v2/components/ContentPage";
import { EYEBROW } from "@/v2/components/styles";
import { IconGlyph, type GameIcon } from "@/v2/components/dividers/IconDivider";
import { SuitCard } from "@/v2/components/dividers/card-suits";
import { SUITS } from "@/v2/components/dividers/card-suits/suits";
import { ICONS as BOTC } from "@/v2/components/dividers/blood-on-the-clocktower/icons";
import { ICONS as CATAN } from "@/v2/components/dividers/catan/icons";
import { ICONS as DUNGEON } from "@/v2/components/dividers/dungeon-crawl/icons";
import { ICONS as MONOPOLY } from "@/v2/components/dividers/monopoly/icons";
import { ICONS as PACMAN } from "@/v2/components/dividers/pacman/icons";

export const metadata: Metadata = {
  title: "Credits — Metagame 2026",
  description:
    "Attributions for the icons and artwork used on the Metagame 2026 site.",
};

const LINK = "font-semibold text-navy underline underline-offset-2";

// Every divider glyph by its `name`, so a credit can show the art it covers.
const GLYPHS = new Map<string, GameIcon>(
  [...BOTC, ...CATAN, ...DUNGEON, ...MONOPOLY, ...PACMAN].map((ic) => [
    ic.name,
    ic,
  ]),
);

type Credit = { name: string; author: string; href: string; icons: string[] };

function CreditArt({ icons }: { icons: string[] }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {icons.map((id) => {
        const suit = SUITS.find((s) => s.name === id);
        if (suit) return <SuitCard key={id} {...suit} />;
        const glyph = GLYPHS.get(id);
        return glyph ? <IconGlyph key={id} icon={glyph} /> : null;
      })}
    </span>
  );
}

function CreditLine({
  credit: { name, author, href, icons },
  source,
}: {
  credit: Credit;
  source: string;
}) {
  return (
    <li className="flex items-center gap-3 text-[15px] text-ink/80">
      <CreditArt icons={icons} />
      <span>
        <span className="font-semibold text-ink">{name}</span> by {author} from{" "}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK}
        >
          {source}
        </a>{" "}
        (CC BY 3.0)
      </span>
    </li>
  );
}

// Noun Project icons (CC BY 3.0). The section dividers use these; the baked-in
// attribution was stripped from the art and the required credit lives here.
const NOUN_PROJECT: Credit[] = [
  {
    name: "Monopoly Iron",
    author: "Anna Lupean",
    href: "https://thenounproject.com/browse/icons/term/monopoly-iron/",
    icons: ["monopoly-iron"],
  },
  {
    name: "Monopoly Hat",
    author: "Anna Lupean",
    href: "https://thenounproject.com/browse/icons/term/monopoly-hat/",
    icons: ["monopoly-hat"],
  },
  {
    name: "Monopoly Shoe",
    author: "Anna Lupean",
    href: "https://thenounproject.com/browse/icons/term/monopoly-shoe/",
    icons: ["monopoly-shoe"],
  },
  {
    name: "Pac Man",
    author: "emkamal kamaluddin",
    href: "https://thenounproject.com/browse/icons/term/pac-man/",
    icons: ["pacman", "ghost"],
  },
  {
    name: "Cherry",
    author: "Daniel Falk",
    href: "https://thenounproject.com/browse/icons/term/cherry/",
    icons: ["cherry"],
  },
  {
    name: "Wheat",
    author: "Callum Taylor",
    href: "https://thenounproject.com/browse/icons/term/wheat/",
    icons: ["catan-wheat"],
  },
  {
    name: "Wood",
    author: "Callum Taylor",
    href: "https://thenounproject.com/browse/icons/term/wood/",
    icons: ["catan-wood"],
  },
  {
    name: "Brick",
    author: "Callum Taylor",
    href: "https://thenounproject.com/browse/icons/term/brick/",
    icons: ["catan-brick"],
  },
  {
    name: "Wool",
    author: "Callum Taylor",
    href: "https://thenounproject.com/browse/icons/term/wool/",
    icons: ["catan-wool"],
  },
];

// game-icons.net icons (CC BY 3.0), used across the other dividers.
const GAME_ICONS: Credit[] = [
  {
    name: "Crossbow",
    author: "carl-olsen",
    href: "https://game-icons.net/1x1/carl-olsen/crossbow.html",
    icons: ["crossbow"],
  },
  {
    name: "Trident",
    author: "lorc",
    href: "https://game-icons.net/1x1/lorc/trident.html",
    icons: ["trident"],
  },
  {
    name: "Clock Tower",
    author: "caro-asercion",
    href: "https://game-icons.net/1x1/caro-asercion/clock-tower.html",
    icons: ["clock-tower"],
  },
  {
    name: "Sword Wound",
    author: "lorc",
    href: "https://game-icons.net/1x1/lorc/sword-wound.html",
    icons: ["sword-wound"],
  },
  {
    name: "Chest",
    author: "delapouite",
    href: "https://game-icons.net/1x1/delapouite/chest.html",
    icons: ["chest"],
  },
  {
    name: "Spiked Dragon Head",
    author: "delapouite",
    href: "https://game-icons.net/1x1/delapouite/spiked-dragon-head.html",
    icons: ["spiked-dragon"],
  },
  {
    name: "Stone Wall",
    author: "delapouite",
    href: "https://game-icons.net/1x1/delapouite/stone-wall.html",
    icons: ["stone-wall"],
  },
  {
    name: "Card 2 Spades",
    author: "aussiesim",
    href: "https://game-icons.net/1x1/aussiesim/card-2-spades.html",
    icons: ["spades"],
  },
  {
    name: "Card 2 Hearts",
    author: "aussiesim",
    href: "https://game-icons.net/1x1/aussiesim/card-2-hearts.html",
    icons: ["hearts"],
  },
  {
    name: "Card 2 Clubs",
    author: "aussiesim",
    href: "https://game-icons.net/1x1/aussiesim/card-2-clubs.html",
    icons: ["clubs"],
  },
  {
    name: "Card 2 Diamonds",
    author: "aussiesim",
    href: "https://game-icons.net/1x1/aussiesim/card-2-diamonds.html",
    icons: ["diamonds"],
  },
];

export default function CreditsPage() {
  return (
    <ContentPage
      eyebrow="Whose work is this?"
      title="Credits"
      intro={
        <p>
          The section dividers are built from third-party icons, and the dice
          got their coat of paint from a friend. Our thanks to their creators
          &mdash; attributions below.
        </p>
      }
    >
      <div className="max-w-[760px]">
        <section>
          <p className={`${EYEBROW} mb-4 text-meeple`}>Dice</p>
          <p className="text-[15px] text-ink/80">
            <span className="font-semibold text-ink">Design art for dice</span>{" "}
            by Isabelle Watriss &mdash; the coloured render of the METAGAME dice
            used across this site.
          </p>
        </section>

        <section className="mt-12">
          <p className={`${EYEBROW} mb-4 text-meeple`}>
            Icons &middot; Noun Project (CC BY 3.0)
          </p>
          <ul className="flex flex-col gap-2.5">
            {NOUN_PROJECT.map((c) => (
              <CreditLine key={c.name} credit={c} source="Noun Project" />
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <p className={`${EYEBROW} mb-4 text-meeple`}>
            Icons &middot; game-icons.net (CC BY 3.0)
          </p>
          <ul className="flex flex-col gap-2.5">
            {GAME_ICONS.map((c) => (
              <CreditLine key={c.name} credit={c} source="game-icons.net" />
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-3 text-[15px] text-ink/80">
            <CreditArt icons={["blood"]} />
            <span>
              The blood drop,{" "}
              <a
                href="https://www.svgrepo.com/svg/65401/big-blood-drop"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                Big Blood Drop
              </a>
              , is from SVG Repo.
            </span>
          </p>
        </section>
      </div>
    </ContentPage>
  );
}
