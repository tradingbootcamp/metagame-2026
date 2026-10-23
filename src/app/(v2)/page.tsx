import type { Metadata } from "next";
import Link from "next/link";
import ChapterSection, { PAGE } from "@/v2/components/ChapterHeading";
import ContactLink from "@/v2/components/contact/ContactLink";
import BloodOnTheClocktowerDivider from "@/v2/components/dividers/blood-on-the-clocktower";
import CardSuitsDivider from "@/v2/components/dividers/card-suits";
import CastlingDivider from "@/v2/components/dividers/castling";
import CatanDivider from "@/v2/components/dividers/catan";
import DiceDivider from "@/v2/components/dividers/dice";
import { ChapterRule } from "@/v2/components/dividers/DividerRow";
import GoDivider from "@/v2/components/dividers/go";
import MonopolyDivider from "@/v2/components/dividers/monopoly";
import ScrabbleDivider from "@/v2/components/dividers/scrabble";
import SetCardDivider from "@/v2/components/dividers/set-cards";
import SpaceInvadersDivider from "@/v2/components/dividers/space-invaders";
import TetrisDivider from "@/v2/components/dividers/tetris";
import Highlights2025 from "@/v2/components/Highlights2025";
import PlayerCard from "@/v2/components/PlayerCard";
import RulebookComponents from "@/v2/components/RulebookComponents";
import RulebookCover from "@/v2/components/RulebookCover";
import RulebookExpansions from "@/v2/components/RulebookExpansions";
import RulebookObject from "@/v2/components/RulebookObject";
import RulebookSetup from "@/v2/components/RulebookSetup";
import SignupForm from "@/v2/components/signup/SignupForm";
import SpecialRules, { type Rule } from "@/v2/components/SpecialRules";
import SponsorDeck from "@/v2/components/SponsorDeck";
import SpeakerCtaCard from "@/v2/components/SpeakerCtaCard";
import { DISPLAY, SECTION_ANCHOR } from "@/v2/components/styles";
import TicketsPanel from "@/v2/components/tickets/TicketsPanel";
import TurnOrder from "@/v2/components/TurnOrder";
import { Button } from "@/v2/components/ui/button";
import { CHAPTERS, CREDITS } from "@/v2/data/chapters";
import { upcomingKeyDates } from "@/v2/data/key-dates";
import { SPEAKERS } from "@/v2/data/speakers";
import {
  FINANCIAL_AID_FORM_URL,
  HOTELS_SEARCH_URL,
  HOUSING_URL,
  PODCAST_EPISODE_URL,
  LIGHTHAVEN_URL,
  RFP_FORM_URL,
} from "@/v2/lib/links";
import { SOCIAL_LINKS } from "@/v2/lib/urls";
import { isEarlyBirdActive } from "@/lib/early-bird";

// Re-render hourly so the early-bird gate flips at the deadline and the turn
// order's "Today" row advances without a deploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Metagame — Nov 6-8, 2026",
  description:
    "A convention of games, designs, and puzzles. Nov 6-8, 2026 at Lighthaven, Berkeley, California.",
};

const BODY_LINK = "font-semibold text-navy underline underline-offset-2";
const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;

const FAQS: Rule[] = [
  {
    id: "first-faq",
    topic: "when",
    question: "When is Metagame?",
    answer: (
      <>2:00pm Friday, November 6th through 9:00pm, November 8th, 2026.</>
    ),
  },
  {
    topic: "where",
    question: "Where is Metagame happening?",
    answer: (
      <>
        <a href={LIGHTHAVEN_URL} className={BODY_LINK}>
          Lighthaven{" "}
        </a>
        <br />
        2740 Telegraph Ave, Berkeley, CA 94705. See{" "}
        <a href="#venue" className={BODY_LINK}>
          §3 Setup
        </a>
        .
      </>
    ),
  },
  {
    topic: "lodging",
    question: "Is lodging available?",
    answer: (
      <>
        On-site housing at Lighthaven is now available.{" "}
        <a
          href={HOUSING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={BODY_LINK}
        >
          Book a room here
        </a>
        . There are also plenty of{" "}
        <a
          href={HOTELS_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={BODY_LINK}
        >
          hotels available in and around Berkeley
        </a>
        .
      </>
    ),
  },
  {
    topic: "meals",
    question: "Are meals included?",
    answer: (
      <>
        Snacks and beverages will be available for the taking. Food trucks will
        also be on-site with meals available for purchase.
      </>
    ),
  },
  {
    topic: "refunds",
    question: "Are tickets refundable?",
    answer: (
      <>
        You may request a ticket refund at the price you paid until 6PM Pacific
        on October 6th. After that, we will process on a case-by-case basis.
      </>
    ),
  },
  {
    topic: "transfers",
    question: "Can I transfer my ticket?",
    answer: (
      <>
        Yes, as long as your ticket wasn&apos;t a special personal comp.{" "}
        <ContactLink subject="Ticket transfer" className={BODY_LINK}>
          Contact us
        </ContactLink>{" "}
        if you&apos;d like to transfer your ticket to someone else.
      </>
    ),
  },
  {
    topic: "kids",
    question: "Can I bring my kids?",
    answer: (
      <>
        Yes! Children under 13 get free admission, and we offer free childcare
        and children&apos;s programming for kids ages 5-12 during the day (we
        can&apos;t provide childcare for children under 5). See the{" "}
        <Link href="/childcare" className={BODY_LINK}>
          childcare page
        </Link>{" "}
        for more. If you have particular questions or concerns feel free to{" "}
        <ContactLink subject="Childcare" className={BODY_LINK}>
          reach out
        </ContactLink>
        .
      </>
    ),
  },
  {
    topic: "parking",
    question: "Is parking available?",
    answer: (
      <>
        There is very limited street parking available by Lighthaven. Lighthaven
        requests that attendees avoid parking on the streets in the surrounding
        two blocks, as this may upset their neighbors.
      </>
    ),
  },
  {
    topic: "games",
    question: "May I bring or demonstrate my own game?",
    answer: (
      <>
        Please do! Fill out our proposal form{" "}
        <a
          href={RFP_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={BODY_LINK}
        >
          here
        </a>{" "}
        to run a game, event, or session.
      </>
    ),
  },
  {
    topic: "access",
    question: "Is the venue accessible?",
    answer: (
      <>
        Some parts of the campus are easier to navigate than others. If
        accessibility is an issue for you,{" "}
        <ContactLink subject="Accessibility" className={BODY_LINK}>
          reach out
        </ContactLink>{" "}
        so we can figure out how to make it work.
      </>
    ),
  },
  {
    topic: "help",
    question: "Who can I come to with problems?",
    answer: (
      <>
        For general questions or complaints,{" "}
        <ContactLink className={BODY_LINK}>contact the team</ContactLink>. If
        you have a sensitive issue to bring to our Community Health lead, you
        can contact Damon{" "}
        <ContactLink to="damon" toName="Damon" className={BODY_LINK}>
          here
        </ContactLink>
        .
      </>
    ),
  },
  {
    topic: "more",
    question: "Where can I learn more about Metagame?",
    answer: (
      <>
        <a
          href={SOCIAL_LINKS.DISCORD}
          target="_blank"
          rel="noopener noreferrer"
          className={BODY_LINK}
        >
          Join our Discord
        </a>{" "}
        to chat with the team and other attendees, or check out Ricki&apos;s
        conversation about Metagame 2025 on the{" "}
        <a
          href={PODCAST_EPISODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={BODY_LINK}
        >
          Complex Systems podcast
        </a>
        .
      </>
    ),
  },
];

// The home page as the game's rulebook (the brand mock in
// branding/website-rulebook): the box cover, then numbered chapters, the
// credits and a back cover. Section ids are kept from the one-pager, since
// the nav, tracking links and printed codes point at /#tickets, /#faq, …
export default function Home() {
  const earlyBird = isEarlyBirdActive();
  const salesClose = upcomingKeyDates().find(
    (d) => d.title === "Ticket sales close",
  );
  return (
    <>
      <RulebookCover />

      <ChapterSection chapter={CHAPTERS.object} rule={<CastlingDivider />}>
        <RulebookObject />
      </ChapterSection>

      <ChapterSection chapter={CHAPTERS.components} rule={<CardSuitsDivider />}>
        <RulebookComponents />
        <div className="mt-12">
          <ChapterRule>
            <TetrisDivider />
          </ChapterRule>
        </div>
        <div className="mt-4 mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3
            className={`${DISPLAY} text-[clamp(34px,4.4vw,52px)] leading-[0.9] text-navy`}
          >
            Examples of play
          </h3>
          <span className="w-full font-space-mono text-xs tracking-[0.12em] text-ink/60 uppercase md:ml-auto md:w-auto">
            A hand dealt from 2025
          </span>
        </div>
        <Highlights2025 />
      </ChapterSection>

      <ChapterSection chapter={CHAPTERS.setup} rule={<SetCardDivider />}>
        <RulebookSetup />
      </ChapterSection>

      <ChapterSection chapter={CHAPTERS.turns} rule={<DiceDivider />}>
        <TurnOrder />
      </ChapterSection>

      <ChapterSection
        chapter={CHAPTERS.players}
        rule={<BloodOnTheClocktowerDivider />}
      >
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SPEAKERS.map((speaker) => (
            <li key={speaker.name}>
              <PlayerCard {...speaker} />
            </li>
          ))}
          <li>
            <SpeakerCtaCard href={RFP_FORM_URL} compact />
          </li>
        </ul>
        <p className="mt-6 text-base text-ink/70">
          And many more coming soon&hellip;
        </p>
      </ChapterSection>

      <ChapterSection chapter={CHAPTERS.expansions} rule={<CatanDivider />}>
        <RulebookExpansions />
      </ChapterSection>

      <ChapterSection chapter={CHAPTERS.special} rule={<ScrabbleDivider />}>
        <SpecialRules rules={FAQS} />
      </ChapterSection>

      <ChapterSection
        rule={<MonopolyDivider />}
        chapter={{
          ...CHAPTERS.join,
          aka: salesClose
            ? `Tickets · sales close ${salesClose.label}`
            : CHAPTERS.join.aka,
        }}
      >
        <div className="flex flex-col items-start gap-5 rounded-[22px] bg-navy p-5 text-cream sm:p-7">
          <TicketsPanel
            look="rulebook"
            showHeading={false}
            surface="dark"
            align="start"
            earlyBird={earlyBird}
          />
          {/* /#get-involved lands here (nav, tracking links). */}
          <div
            id="get-involved"
            className={`${SECTION_ANCHOR} flex flex-wrap gap-3`}
          >
            <Button asChild variant="ghost">
              <Link href="/volunteer">Apply to volunteer</Link>
            </Button>
            <Button asChild variant="ghost">
              <a href={FINANCIAL_AID_FORM_URL} {...EXT}>
                Apply for financial aid
              </a>
            </Button>
            <Button asChild variant="ghost">
              <a href={RFP_FORM_URL} {...EXT}>
                Propose a session
              </a>
            </Button>
          </div>
          <p className="font-space-mono text-[12.5px] text-sky">
            A limited supply of volunteer tickets is available.
          </p>
        </div>
      </ChapterSection>

      <ChapterSection chapter={CREDITS} rule={<GoDivider />}>
        <SponsorDeck />
      </ChapterSection>

      {/* The back cover. */}
      <section id="stay-in-the-loop" className={SECTION_ANCHOR}>
        <div className={`${PAGE} pb-20`}>
          <ChapterRule>
            <SpaceInvadersDivider />
          </ChapterRule>
          <div className="mt-4 grid gap-8 rounded-[22px] bg-navy p-6 text-cream sm:p-8 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
            <div>
              <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-tan uppercase">
                To be continued&hellip;
              </p>
              <h2
                className={`${DISPLAY} mt-2 text-[clamp(44px,6vw,72px)] leading-[0.9] tracking-[0.01em]`}
              >
                Stay in the loop
              </h2>
              <p className="mt-3 max-w-[460px] text-cream/80">
                Get notified about ticket sales, updates, volunteer
                opportunities, future events, and more.
              </p>
              <p className="mt-5 font-grotesk text-cream/70 italic">
                I never met a game I didn&apos;t like.
              </p>
            </div>
            <SignupForm />
          </div>
        </div>
      </section>
    </>
  );
}
