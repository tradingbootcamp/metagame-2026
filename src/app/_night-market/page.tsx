/* eslint-disable @next/next/no-img-element -- tiny decorative jpg/svg sprites; next/image adds nothing */
import type { Metadata } from "next";
import { Bodoni_Moda, EB_Garamond } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import artwork from "../../../public/images/night-market-images/night-market-background.png";
import tent1 from "../../../public/images/night-market-images/tent1.png";
import tent2 from "../../../public/images/night-market-images/tent2.png";
import tent3 from "../../../public/images/night-market-images/tent3.png";
import tent4 from "../../../public/images/night-market-images/tent4.png";
import tent5 from "../../../public/images/night-market-images/tent5.png";
import tent6 from "../../../public/images/night-market-images/tent6.png";
import styles from "./NightMarket.module.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-bodoni",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
});

export const metadata: Metadata = {
  title: "The Metagame Night Market",
  description:
    "The Night Market at Metagame 2026 — open to all, ticketed or not. Friday, November 6th from 7-10pm. See what is sold in the dark.",
};

type Star = {
  img: 1 | 2 | 3 | 4;
  left: number;
  top: number;
  tw: number;
  w?: string;
  delay?: string;
  dur?: string;
};

// Positions/timings transcribed verbatim from the mock's inline styles.
const HERO_STARS: Star[] = [
  {
    img: 2,
    left: 87.7,
    top: 17.6,
    tw: 0.48,
    w: "clamp(7px,0.9vw,16px)",
    delay: "-5.4s",
    dur: "5.5s",
  },
  {
    img: 1,
    left: 39.8,
    top: 4.0,
    tw: 0.59,
    w: "clamp(7px,1.1vw,13px)",
    delay: "-0.6s",
    dur: "6.9s",
  },
  {
    img: 4,
    left: 11.2,
    top: 18.7,
    tw: 0.63,
    w: "clamp(7px,0.9vw,15px)",
    delay: "-5.9s",
    dur: "4.7s",
  },
  {
    img: 2,
    left: 82.2,
    top: 85.7,
    tw: 0.73,
    w: "clamp(7px,0.9vw,13px)",
    delay: "-1.9s",
    dur: "4.8s",
  },
  {
    img: 3,
    left: 52.7,
    top: 19.5,
    tw: 0.52,
    w: "clamp(7px,0.9vw,14px)",
    delay: "-0.4s",
    dur: "4.4s",
  },
  {
    img: 2,
    left: 7.6,
    top: 3.4,
    tw: 0.53,
    w: "clamp(7px,1.0vw,14px)",
    delay: "-1.8s",
    dur: "4.7s",
  },
  {
    img: 4,
    left: 16.6,
    top: 58.1,
    tw: 0.54,
    w: "clamp(9px,1.4vw,18px)",
    delay: "-2.0s",
    dur: "4.7s",
  },
  {
    img: 3,
    left: 81.8,
    top: 78.4,
    tw: 0.54,
    w: "clamp(9px,1.5vw,22px)",
    delay: "-2.9s",
    dur: "4.0s",
  },
  {
    img: 4,
    left: 72.8,
    top: 85.8,
    tw: 0.54,
    w: "clamp(7px,1.1vw,12px)",
    delay: "-2.9s",
    dur: "4.8s",
  },
  {
    img: 1,
    left: 50.3,
    top: 90.9,
    tw: 0.47,
    w: "clamp(7px,0.9vw,14px)",
    delay: "-0.0s",
    dur: "5.6s",
  },
  {
    img: 3,
    left: 43.5,
    top: 80.0,
    tw: 0.52,
    w: "clamp(7px,1.1vw,15px)",
    delay: "-2.7s",
    dur: "5.9s",
  },
  { img: 3, left: 87.7, top: 53.6, tw: 0.66, delay: "-4.7s", dur: "5.2s" },
  { img: 1, left: 10.9, top: 92.2, tw: 0.45, delay: "-2.3s", dur: "7.1s" },
  {
    img: 1,
    left: 22.3,
    top: 13.0,
    tw: 0.68,
    w: "clamp(7px,0.9vw,16px)",
    delay: "-3.8s",
    dur: "6.9s",
  },
  { img: 2, left: 8.9, top: 82.4, tw: 0.77, delay: "-0.2s", dur: "4.3s" },
  {
    img: 1,
    left: 6.3,
    top: 36.8,
    tw: 0.51,
    w: "clamp(7px,1.1vw,14px)",
    delay: "-2.1s",
    dur: "6.4s",
  },
  {
    img: 3,
    left: 26.5,
    top: 6.9,
    tw: 0.54,
    w: "clamp(7px,0.9vw,13px)",
    delay: "-4.7s",
    dur: "5.5s",
  },
  {
    img: 1,
    left: 93.8,
    top: 70.2,
    tw: 0.69,
    w: "clamp(7px,1.0vw,13px)",
    delay: "-5.8s",
    dur: "6.4s",
  },
  {
    img: 3,
    left: 83.0,
    top: 59.0,
    tw: 0.62,
    w: "clamp(9px,1.5vw,19px)",
    delay: "-1.0s",
    dur: "4.3s",
  },
  {
    img: 4,
    left: 89.8,
    top: 36.5,
    tw: 0.72,
    w: "clamp(9px,1.3vw,20px)",
    delay: "-0.3s",
    dur: "5.0s",
  },
  {
    img: 3,
    left: 17.0,
    top: 87.4,
    tw: 0.46,
    w: "clamp(7px,1.0vw,12px)",
    delay: "-5.2s",
    dur: "6.6s",
  },
  {
    img: 1,
    left: 91.3,
    top: 84.4,
    tw: 0.58,
    w: "clamp(7px,1.2vw,12px)",
    delay: "-1.6s",
    dur: "5.3s",
  },
  { img: 1, left: 30, top: 17, tw: 0.85, delay: "-0.5s" },
  {
    img: 2,
    left: 49,
    top: 12,
    tw: 0.75,
    w: "clamp(14px,2.2vw,30px)",
    delay: "-2s",
  },
  { img: 3, left: 68, top: 18, tw: 0.8, delay: "-3.4s" },
  { img: 2, left: 11, top: 50, tw: 0.7, delay: "-1.4s" },
  { img: 4, left: 89, top: 47, tw: 0.75, delay: "-4.2s" },
  {
    img: 3,
    left: 35,
    top: 82,
    tw: 0.7,
    w: "clamp(9px,1.4vw,18px)",
    delay: "-2.8s",
  },
  {
    img: 1,
    left: 62,
    top: 84,
    tw: 0.65,
    w: "clamp(9px,1.5vw,20px)",
    delay: "-5s",
  },
  {
    img: 4,
    left: 76,
    top: 9,
    tw: 0.65,
    w: "clamp(9px,1.4vw,18px)",
    delay: "-1.8s",
  },
  {
    img: 3,
    left: 34.8,
    top: 17.3,
    tw: 0.59,
    w: "clamp(9px,1.4vw,19px)",
    delay: "-4.8s",
    dur: "6.8s",
  },
  {
    img: 2,
    left: 63.0,
    top: 10.4,
    tw: 0.43,
    w: "clamp(7px,1.1vw,14px)",
    delay: "-4.4s",
    dur: "5.2s",
  },
  {
    img: 1,
    left: 12.0,
    top: 48.7,
    tw: 0.78,
    w: "clamp(7px,1.1vw,16px)",
    delay: "-4.7s",
    dur: "7.3s",
  },
  { img: 3, left: 13.0, top: 12.0, tw: 0.68, delay: "-3.0s", dur: "7.2s" },
  {
    img: 4,
    left: 17.6,
    top: 23.6,
    tw: 0.51,
    w: "clamp(9px,1.6vw,20px)",
    delay: "-0.1s",
    dur: "5.8s",
  },
  {
    img: 2,
    left: 61.0,
    top: 87.4,
    tw: 0.64,
    w: "clamp(9px,1.3vw,20px)",
    delay: "-0.8s",
    dur: "5.0s",
  },
  {
    img: 4,
    left: 91.0,
    top: 8.1,
    tw: 0.77,
    w: "clamp(9px,1.3vw,21px)",
    delay: "-2.4s",
    dur: "5.1s",
  },
  { img: 2, left: 80.8, top: 29.5, tw: 0.73, delay: "-1.7s", dur: "5.7s" },
];

const INTRO_STARS: Star[] = [
  { img: 3, left: 87.0, top: 59.8, tw: 0.64, delay: "-5.5s", dur: "4.8s" },
  {
    img: 1,
    left: 16.5,
    top: 91.3,
    tw: 0.46,
    w: "clamp(7px,0.9vw,15px)",
    delay: "-5.5s",
    dur: "7.0s",
  },
  {
    img: 4,
    left: 15.3,
    top: 18.1,
    tw: 0.64,
    w: "clamp(9px,1.5vw,21px)",
    delay: "-1.5s",
    dur: "7.5s",
  },
  { img: 4, left: 83.2, top: 11.2, tw: 0.75, delay: "-2.0s", dur: "5.6s" },
  {
    img: 3,
    left: 87.0,
    top: 27.3,
    tw: 0.52,
    w: "clamp(7px,1.1vw,15px)",
    delay: "-1.9s",
    dur: "7.9s",
  },
  {
    img: 4,
    left: 88.6,
    top: 90.9,
    tw: 0.52,
    w: "clamp(7px,0.9vw,13px)",
    delay: "-5.9s",
    dur: "7.3s",
  },
  {
    img: 4,
    left: 91.6,
    top: 73.4,
    tw: 0.59,
    w: "clamp(7px,1.0vw,14px)",
    delay: "-2.7s",
    dur: "4.5s",
  },
  {
    img: 2,
    left: 6.3,
    top: 48.8,
    tw: 0.52,
    w: "clamp(7px,1.1vw,13px)",
    delay: "-4.4s",
    dur: "6.7s",
  },
  {
    img: 1,
    left: 11.8,
    top: 30.6,
    tw: 0.49,
    w: "clamp(7px,0.9vw,13px)",
    delay: "-2.0s",
    dur: "6.2s",
  },
  {
    img: 4,
    left: 69.1,
    top: 89.9,
    tw: 0.54,
    w: "clamp(7px,1.2vw,13px)",
    delay: "-5.1s",
    dur: "5.5s",
  },
  {
    img: 4,
    left: 37.6,
    top: 8.1,
    tw: 0.78,
    w: "clamp(7px,1.1vw,13px)",
    delay: "-6.0s",
    dur: "5.6s",
  },
  {
    img: 1,
    left: 39.4,
    top: 89.6,
    tw: 0.74,
    w: "clamp(7px,1.0vw,13px)",
    delay: "-3.0s",
    dur: "5.3s",
  },
];

const FOOTER_STARS: Star[] = [
  { img: 1, left: 21, top: 30, tw: 0.8, delay: "-1s" },
  {
    img: 2,
    left: 33,
    top: 72,
    tw: 0.7,
    w: "clamp(10px,1.6vw,20px)",
    delay: "-3s",
  },
  { img: 3, left: 44, top: 20, tw: 0.75, delay: "-2s" },
  {
    img: 4,
    left: 59,
    top: 76,
    tw: 0.7,
    w: "clamp(10px,1.6vw,20px)",
    delay: "-4.4s",
  },
  { img: 2, left: 70, top: 26, tw: 0.8, delay: "-0.6s" },
  {
    img: 1,
    left: 83,
    top: 58,
    tw: 0.7,
    w: "clamp(10px,1.7vw,22px)",
    delay: "-2.8s",
  },
  {
    img: 3,
    left: 12,
    top: 62,
    tw: 0.65,
    w: "clamp(9px,1.5vw,18px)",
    delay: "-5s",
  },
  {
    img: 4,
    left: 89,
    top: 32,
    tw: 0.65,
    w: "clamp(9px,1.5vw,18px)",
    delay: "-1.6s",
  },
  {
    img: 1,
    left: 51.3,
    top: 37.1,
    tw: 0.43,
    w: "clamp(7px,0.9vw,13px)",
    delay: "-1.6s",
    dur: "4.5s",
  },
  {
    img: 1,
    left: 60.4,
    top: 51.0,
    tw: 0.65,
    w: "clamp(7px,0.9vw,13px)",
    delay: "-0.4s",
    dur: "7.5s",
  },
  { img: 4, left: 13.4, top: 88.8, tw: 0.4, delay: "-2.5s", dur: "7.7s" },
  {
    img: 2,
    left: 74.2,
    top: 87.7,
    tw: 0.42,
    w: "clamp(7px,1.2vw,13px)",
    delay: "-1.6s",
    dur: "4.7s",
  },
];

type Butterfly = { img: 1 | 2 | 3; left: number; top: number; w?: string };

const HERO_BUTTERFLIES: Butterfly[] = [
  { img: 1, left: 16, top: 32 },
  { img: 3, left: 84, top: 24 },
  { img: 3, left: 79, top: 70, w: "clamp(22px,3vw,40px)" },
];

const INTRO_BUTTERFLIES: Butterfly[] = [
  { img: 1, left: 11, top: 30, w: "clamp(24px,3.2vw,44px)" },
  { img: 3, left: 88, top: 64, w: "clamp(20px,2.8vw,38px)" },
];

const BOOTHS = [
  {
    tent: tent1,
    title: "Games & Puzzles",
    copy: "Here you will find, puzzles, indie RPGs, bewlidering devices, and more.",
  },
  {
    tent: tent2,
    title: "The Physical",
    copy: "Booths for art, craft, nourishment, and tomes.",
  },
  {
    tent: tent3,
    title: "Experiences",
    copy: "Experience strange Tastes; have your fortune told. Feel something you have never felt before.",
  },
  {
    tent: tent4,
    title: "Job Market",
    copy: "Find a job, or fill one.",
  },
  {
    tent: tent5,
    title: "Black Market",
    copy: "Buy rights to middle names, tickets to cheat in your next RPG, other strange goods. All items must still be legal.",
  },
  {
    tent: tent6,
    title: "Information Booth",
    copy: "Information. Truth is encouraged, but optional.",
  },
];

function StarImg({ star }: { star: Star }) {
  return (
    <img
      className={styles.decorStar}
      src={`/images/night-market-images/star-${star.img}.jpg`}
      alt=""
      style={
        {
          left: `${star.left}%`,
          top: `${star.top}%`,
          "--tw": star.tw,
          width: star.w,
          animationDelay: star.delay,
          animationDuration: star.dur,
        } as React.CSSProperties
      }
    />
  );
}

function ButterflyImg({ butterfly }: { butterfly: Butterfly }) {
  return (
    <img
      className={styles.decorButterfly}
      src={`/images/butterfly-${butterfly.img}.svg`}
      alt=""
      style={{
        left: `${butterfly.left}%`,
        top: `${butterfly.top}%`,
        width: butterfly.w,
      }}
    />
  );
}

export default function NightMarketPage() {
  return (
    <div className={`${styles.page} ${bodoni.variable} ${garamond.variable}`}>
      <div className={styles.pageVines} aria-hidden="true">
        <img
          className={`${styles.vine} ${styles.vineLeft}`}
          src="/images/night-market-images/vine-left.jpg"
          alt=""
        />
        <img
          className={`${styles.vine} ${styles.vineRight}`}
          src="/images/night-market-images/vine-right.jpg"
          alt=""
        />
      </div>

      <main className={styles.hero}>
        <Image
          src={artwork}
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className={styles.artwork}
        />

        <div className={styles.heroDecor} aria-hidden="true">
          {HERO_STARS.map((star, i) => (
            <StarImg key={i} star={star} />
          ))}
          {HERO_BUTTERFLIES.map((butterfly, i) => (
            <ButterflyImg key={i} butterfly={butterfly} />
          ))}
        </div>

        <div className={styles.heroStack}>
          <h1 className={styles.title}>
            <span className={styles.titleThe}>the metagame</span>
            <span className={styles.titleNightMarket}>Night Market</span>
          </h1>

          <p className={styles.tagline}>See what is sold in the dark.</p>

          <p className={styles.eventDate}>
            Friday, November 6th from 7&ndash;10pm
          </p>
        </div>
      </main>

      <section className={styles.intro}>
        <div className={styles.introStars} aria-hidden="true">
          {INTRO_STARS.map((star, i) => (
            <StarImg key={i} star={star} />
          ))}
          {INTRO_BUTTERFLIES.map((butterfly, i) => (
            <ButterflyImg key={i} butterfly={butterfly} />
          ))}
        </div>
        <div className={styles.introInner}>
          <h2 className={styles.introHeading}>What is the Night Market?</h2>
          <p className={styles.introBody}>
            The Night Market is open; even those without tickets may attend.
            Wander the booths hunting for treasures and baubles, or open your
            own and transform your beloved belongings into heartless currency.
            Here you will find:
          </p>
        </div>
      </section>

      <section className={styles.booths} id="booths">
        <div className={styles.boothsInner}>
          <h2 className={styles.sectionTitle}>Our Booths</h2>

          <div className={styles.boothGrid}>
            {BOOTHS.map(({ tent, title, copy }) => (
              <div key={title} className={styles.boothCard}>
                <Image
                  src={tent}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(max-width: 1040px) 570px, 50vw"
                  className={styles.boothTent}
                />
                <div className={styles.boothCopy}>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.returnLight}>
        <div className={styles.footerStars} aria-hidden="true">
          {FOOTER_STARS.map((star, i) => (
            <StarImg key={i} star={star} />
          ))}
        </div>
        <Link href="/">return to the light</Link>
      </footer>
    </div>
  );
}
