import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LastYearSchedule from "@/components/LastYearSchedule";
import SignupForm from "@/components/SignupForm";
import BloodOnTheClocktowerDivider from "@/components/site/dividers/blood-on-the-clocktower";
import CardSuitsDivider from "@/components/site/dividers/card-suits";
import CatanDivider from "@/components/site/dividers/catan";
import DiceDivider from "@/components/site/dividers/dice";
import MonopolyDivider from "@/components/site/dividers/monopoly";
import PacmanDivider from "@/components/site/dividers/pacman";
import SetCardDivider from "@/components/site/dividers/set-cards";
import { GLYPH, SHADOW } from "@/components/site/dividers/sizing";
import SectionHeading from "@/components/site/SectionHeading";
import SiteHero from "@/components/site/SiteHero";
import {
  HEADING,
  NEWSLETTER_LINK,
  SECTION,
  SECTION_ANCHOR,
} from "@/components/site/styles";
import TicketsPanel from "@/components/site/TicketsPanel";
import UpdatesButton from "@/components/site/UpdatesButton";
import UpdatesHashModal from "@/components/site/UpdatesHashModal";
import { Button } from "@/components/ui/button";
import { TESTIMONIALS } from "@/data/testimonials";
import { RFP_FORM_URL } from "@/lib/links";
import lighthavenMap from "../../../public/images/lighthaven.png";
import weirdchess1 from "../../../public/images/weirdchess1.png";
import weirdchess2 from "../../../public/images/weirdchess2.png";
import weirdchess3 from "../../../public/images/weirdchess3.png";
import weirdchess4 from "../../../public/images/weirdchess4.png";

export const metadata: Metadata = {
  title: "Metagame — Nov 6-8, 2026",
  description:
    "A convention of games, designs, and puzzles. Nov 6-8, 2026 at Lighthaven, Berkeley, California.",
};

const FAQ_BODY_LINK = "font-semibold text-navy underline underline-offset-2";

const NewsletterCta = () => (
  <UpdatesButton className={`${NEWSLETTER_LINK} align-baseline`}>
    Sign up for updates
  </UpdatesButton>
);

const FAQS: {
  id?: string;
  open?: boolean;
  question: string;
  answer: React.ReactNode;
}[] = [
  {
    id: "first-faq",
    open: true,
    question: "What is Metagame?",
    answer: (
      <>
        To be frank with you, it is hard to describe. Metagame has many of the
        typical trappings of a board game convention: gaming spaces, designers
        talking about their projects, as well games requiring more organization,
        such as Blood on the Clocktower. But it&apos;s a little weirder, too.
        <br />
        <br />
        Last year, the entire con was one large game. Players discovered their
        team by solving a puzzle on their swag, and spent three days competing
        against one another while still playing the other games.
        <br />
        <br />
        Attendees who took the escape room design course created their own
        escape room from scratch and ran it.
        <br />
        <br />
        A guest started a secret, second convention-wide game that staff only
        learned of in the closing hours. At one point, there were people
        knife-fighting with tasers.
        <br />
        <br />
        Come see what happens in 2026.
      </>
    ),
  },
  {
    question: "Where will it be?",
    answer: (
      <>
        <a href="https://lighthaven.space/" className={FAQ_BODY_LINK}>
          Lighthaven{" "}
        </a>
        <br />
        2740 Telegraph Ave, Berkeley, CA 94705
        <Image
          src={lighthavenMap}
          alt="Map of the Lighthaven campus"
          className="mt-4 h-auto w-full max-w-[560px] rounded-lg"
        />
      </>
    ),
  },
  {
    question: "Where can I stay?",
    answer: (
      <>
        Rooms will be available to book at the venue, Lighthaven. Want to know
        when they are available?&nbsp;
        <NewsletterCta />
      </>
    ),
  },
  {
    question: "When is Metagame?",
    answer: <>It begins at 2pm Friday, Nov 6. It will run to 9:00pm, Nov 8.</>,
  },
  {
    question: "What is the refund policy?",
    answer: (
      <>
        You may exchange your tickets for as much money as you paid for them
        until sunset in Berkeley on September 6th. After the sun has set, you
        must contact us.
        <br />
        <br />
        Bitcoin is ethereal and complicated to refund.
      </>
    ),
  },
  {
    question: "Can I transfer my ticket?",
    answer: (
      <>
        Yes, as long as your ticket wasn&apos;t a special personal comp. Email{" "}
        <a href="mailto:team@metagame.games" className={FAQ_BODY_LINK}>
          team@metagame.games
        </a>{" "}
        if you&apos;d like to transfer your ticket to someone else.
      </>
    ),
  },
  {
    question: "What will I eat?",
    answer: (
      <>
        Snacks and beverages will be available for the taking. Food trucks will
        also be on-site with meals available for purchase.
      </>
    ),
  },
  {
    question: "Can I bring my kids?",
    answer: (
      <>
        There will be childcare and some children&apos;s programming available
        during the day! If you have particular questions or concerns feel free
        to{" "}
        <a href="mailto:team@metagame.games" className={FAQ_BODY_LINK}>
          reach out
        </a>
        .
      </>
    ),
  },
];

export default function Home() {
  return (
    <>
      <UpdatesHashModal />

      {/* home */}
      <div id="home" className={SECTION_ANCHOR}>
        <SiteHero />
      </div>

      {/* about */}
      <section id="about" className={`${SECTION} md:pt-11 md:pb-[88px]`}>
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="mb-12 max-w-[600px]">
            <SectionHeading
              eyebrow="What is all this?"
              title="Games, designs, puzzles."
            />
            <p className="mt-3.5 text-base text-ink/70">
              This convention is a conundrum, sent to confound you. It is a
              puzzle. A riddle. There will be game designers in nooks and
              alcoves, whispering their secrets to knowing audiences. You will
              be competing, but you may not know against whom. And, above all
              else, there will be games.
            </p>
            <p className="mt-3.5 text-base text-ink/70">
              Still confused?{" "}
              <Link href="#faq" className={NEWSLETTER_LINK}>
                Click here.
              </Link>
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-center gap-[22px] py-10">
        <span className="h-px max-w-40 flex-1 bg-line" />
        {[weirdchess1, weirdchess2, weirdchess3, weirdchess4].map(
          (piece, i) => (
            <Image
              key={i}
              src={piece}
              alt=""
              aria-hidden
              className={`${GLYPH} object-contain ${SHADOW}`}
            />
          ),
        )}
        <span className="h-px max-w-40 flex-1 bg-line" />
      </div>

      {/* schedule */}
      <section id="schedule" className={`${SECTION} md:pt-14 md:pb-[88px]`}>
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-8">
          <div className="max-w-[820px]">
            <SectionHeading
              eyebrow="What's going on?"
              title="Schedule (2025)"
            />
            <p className="mt-3.5 text-base text-ink/70">
              The 2026 schedule is still coming together. In the meantime, here
              is the complete program from Metagame 2025: talks, workshops,
              games, and megagames across three days. Tap any session for
              details.
            </p>
          </div>
          <LastYearSchedule />
        </div>
      </section>

      <DiceDivider />

      {/* speakers */}
      <section id="speakers" className={`${SECTION} md:pt-14 md:pb-[88px]`}>
        <div className="mx-auto max-w-[1180px] px-8">
          <SectionHeading
            eyebrow="Who will I see?"
            title="Speakers"
            className="mb-8"
          />
          <div className="max-w-[760px] rounded-2xl border border-navy/[0.16] bg-sky p-[clamp(40px,7vw,72px)] text-center shadow-[0_12px_32px_rgba(23,48,89,0.1)]">
            <p className="mx-auto mb-6 max-w-[520px] text-base text-ink/70">
              We&rsquo;re still working out our 2026 lineup. Got a talk, a
              workshop, a game, or something that defies category? We&rsquo;re
              accepting session proposals for 2026.
            </p>
            <Button asChild variant="raised" size="lg">
              <a href={RFP_FORM_URL} target="_blank" rel="noopener noreferrer">
                Propose a session <span aria-hidden="true">&rarr;</span>
              </a>
            </Button>
            <p className="mt-8">
              <a
                href="https://2025.metagame.games/#speakers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline underline-offset-2 hover:text-navy/70"
              >
                See last year&apos;s speakers{" "}
                <span aria-hidden="true">&#8599;</span>
              </a>
            </p>
          </div>
        </div>
      </section>

      <SetCardDivider />

      {/* children */}
      <section id="children" className={`${SECTION} md:pt-[72px] md:pb-[54px]`}>
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="max-w-[820px]">
            <SectionHeading
              eyebrow="What of the children?"
              title="Children's Programming"
              className="mb-[22px]"
            />
            <p className="mb-4 max-w-[680px] text-[17px] text-ink/70">
              Metagame welcomes your whole family! Childcare and activity for
              children will be available throughout the conference. Specifics to
              come later, but for now, you can take a look at some of what the
              kids got up to last year, below.
            </p>
          </div>

          <div className="mt-12">
            <h3
              className={`${HEADING} mb-6 text-[clamp(24px,3vw,34px)] text-navy`}
            >
              Last year in The Family Room
            </h3>
            <LastYearSchedule
              locationNames={["The Family Room"]}
              ages={["KIDS"]}
              variant="sequential"
              defaultView="list"
              showViewToggle={false}
            />
          </div>
        </div>
      </section>

      <BloodOnTheClocktowerDivider />

      {/* Mailing list */}
      <section id="mailing-list" className={`${SECTION} md:py-[72px]`}>
        <div className="mx-auto max-w-[1180px] px-8">
          <SectionHeading
            eyebrow="Want to keep up?"
            title="Join the mailing list"
          />
          <p className="mt-3 mb-7 max-w-[520px] text-base text-ink/70">
            Get notified about ticket sales, updates, volunteer opportunities,
            future events, and more.
          </p>
          <div className="max-w-[600px]">
            <SignupForm light />
          </div>
        </div>
      </section>

      <MonopolyDivider />

      {/* Testimonials — the trailing divider goes with it so two dividers don't stack */}
      {TESTIMONIALS.length > 0 && (
        <>
          <section id="testimonials" className={`${SECTION} md:py-[88px]`}>
            <div className="mx-auto max-w-[1180px] px-8">
              <SectionHeading
                eyebrow="What did they make of it?"
                title="What people said"
                className="mb-12"
              />
              <div className="grid min-w-0 grid-cols-3 gap-5 max-[900px]:grid-cols-1">
                {TESTIMONIALS.map(({ quote, name }) => (
                  <div
                    key={name}
                    className="min-w-0 rounded-[14px] border border-navy/[0.16] bg-white px-6 py-[26px] shadow-[0_8px_24px_rgba(23,48,89,0.08)]"
                  >
                    <p className="mb-[18px] text-[15px] text-ink/80">{quote}</p>
                    <p className="text-sm font-semibold text-meeple">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <PacmanDivider />
        </>
      )}

      {/* tickets — replaces the old top-nav "Buy tickets" button */}
      <section id="tickets" className={`${SECTION} sm:py-16 md:py-24`}>
        <div className="mx-auto max-w-[1180px] px-8">
          <SectionHeading
            eyebrow="Ready to play?"
            title="Tickets"
            className="mb-8"
          />
          <div className="mx-auto flex max-w-[560px] flex-col items-center gap-[22px]">
            <TicketsPanel showHeading={false} surface="light" />
          </div>
        </div>
      </section>

      <CardSuitsDivider />

      {/* sponsorship — a one-line pointer to the /sponsor page */}
      <section id="sponsorship" className={`${SECTION} md:py-[72px]`}>
        <div className="mx-auto max-w-[1180px] px-8">
          <SectionHeading
            eyebrow="Want to help make the magic happen?"
            title="Sponsorship"
            className="mb-6"
          />
          <p className="max-w-[620px] text-lg text-ink/75">
            Want to partner with us and help make Metagame financially
            sustainable? Take a look at our{" "}
            <Link href="/sponsor" className={FAQ_BODY_LINK}>
              sponsorship packages
            </Link>{" "}
            &rarr;
          </p>
        </div>
      </section>

      <CatanDivider />

      {/* faq */}
      <section id="faq" className={`${SECTION} md:pt-14 md:pb-[88px]`}>
        <div className="mx-auto max-w-[1180px] px-8">
          <SectionHeading
            eyebrow="But what about…"
            title="FAQ"
            className="mb-12"
          />

          <div className="flex max-w-[820px] flex-col gap-3.5">
            {FAQS.map(({ id, open, question, answer }) => (
              <details
                key={question}
                id={id}
                open={open}
                className="group overflow-hidden rounded-[14px] border border-navy/[0.22] bg-sky transition-[box-shadow,border-color] duration-[180ms] open:border-navy open:shadow-[0_6px_24px_rgba(23,48,89,0.12)]"
              >
                <summary
                  className={`${HEADING} flex cursor-pointer list-none items-center justify-between gap-[18px] px-6 py-5 text-lg text-navy after:flex after:h-7 after:w-7 after:flex-none after:items-center after:justify-center after:rounded-full after:bg-white/55 after:font-space-mono after:text-lg after:font-normal after:text-navy after:transition-[background,color] after:duration-[180ms] after:content-['+'] group-open:after:bg-navy group-open:after:text-white group-open:after:content-['−'] hover:after:bg-navy hover:after:text-white [&::-webkit-details-marker]:hidden`}
                >
                  {question}
                </summary>
                <div className="max-w-[660px] px-6 pb-[22px] text-[15.5px] text-ink/75">
                  {answer}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-11">
            <p className="max-w-[620px] text-ink/70">
              Have more questions? Email{" "}
              <a href="mailto:team@metagame.games" className={FAQ_BODY_LINK}>
                team@metagame.games
              </a>{" "}
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
