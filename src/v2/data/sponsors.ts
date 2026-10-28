import type { StaticImageData } from "next/image";
import type { ComponentType } from "react";
import ArborLogo from "@/v2/components/ArborLogo";
import dModel from "../../../public/images/sponsors/dmodel_logo.png";
import franciscoSan from "../../../public/images/sponsors/francisco_san_logo.png";
import goodhartLabs from "../../../public/images/sponsors/goodhart-labs-logos/svg/goodhart-labs-stacked-black.svg";
import manifund from "../../../public/images/sponsors/manifund_logo.png";
import outsideTheAsylum from "../../../public/images/sponsors/outside_the_asylum.png";
import rogueSignal from "../../../public/images/sponsors/rogue_signal/rogue_signal_horiz.svg";
import spire from "../../../public/images/sponsors/spire.svg";

export type Sponsor = {
  name: string;
  url?: string;
  // Height classes overriding the tier default, for logos whose aspect
  // ratio makes the shared height read too big or too small.
  logoClass?: string;
} & (
  | { logo: StaticImageData; Logo?: never }
  // A component drawing its own logo (sized by className), for animated ones.
  | { logo?: never; Logo: ComponentType<{ className?: string }> }
);

// Sponsors by tier, each tier in display order. Logos shrink tier by tier
// (Gold > Silver > Patron) on the home page's sponsors section.
export const GOLD_SPONSORS: Sponsor[] = [
  { name: "Rogue Signal", url: "https://roguesignal.io", logo: rogueSignal },
  {
    name: "Goodhart Labs",
    url: "https://goodhartlabs.com",
    logo: goodhartLabs,
    logoClass: "h-24 md:h-32",
  },
];

export const SILVER_SPONSORS: Sponsor[] = [
  {
    name: "d_model",
    url: "https://dmodel.ai",
    logo: dModel,
    logoClass: "h-14 md:h-20",
  },
];

export const PATRON_SPONSORS: Sponsor[] = [
  {
    name: "Arbor",
    url: "https://www.trading.camp",
    Logo: ArborLogo,
    logoClass: "h-10 md:h-[52px]",
  },
  {
    name: "Francisco San",
    url: "https://franciscosan.org",
    logo: franciscoSan,
  },
  { name: "The Spire", logo: spire },
  { name: "Manifund", url: "https://manifund.org", logo: manifund },
  {
    name: "Outside the Asylum",
    url: "https://outsidetheasylum.blog/",
    logo: outsideTheAsylum,
    logoClass: "h-10 md:h-12",
  },
];
