import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Carousel from "@/v2/components/Carousel";
import BloodOnTheClocktowerDivider from "@/v2/components/dividers/blood-on-the-clocktower";
import CardSuitsDivider from "@/v2/components/dividers/card-suits";
import CatanDivider from "@/v2/components/dividers/catan";
import ChessDivider from "@/v2/components/dividers/chess";
import DiceDivider from "@/v2/components/dividers/dice";
import DungeonCrawlDivider from "@/v2/components/dividers/dungeon-crawl";
import MonopolyDivider from "@/v2/components/dividers/monopoly";
import PacmanDivider from "@/v2/components/dividers/pacman";
import SetCardDivider from "@/v2/components/dividers/set-cards";
import FaqItem from "@/v2/components/FaqItem";
import Highlights2025 from "@/v2/components/Highlights2025";
import PersonCard from "@/v2/components/PersonCard";
import SectionHeading from "@/v2/components/SectionHeading";
import SignupForm from "@/v2/components/signup/SignupForm";
import SiteHero from "@/v2/components/SiteHero";
import {
  EYEBROW,
  HEADING,
  NEWSLETTER_LINK,
  SECTION,
  SECTION_ANCHOR,
} from "@/v2/components/styles";
import TicketsPanel from "@/v2/components/tickets/TicketsPanel";
import { Button } from "@/v2/components/ui/button";
import { CAROUSEL } from "@/v2/data/carousel";
import { GOLD_SPONSORS, PATRON_SPONSORS } from "@/v2/data/sponsors";
import { SPEAKERS } from "@/v2/data/speakers";
import {
  HOUSING_URL,
  LIGHTHAVEN_URL,
  MEGAGAME_PROPOSAL_FORM_URL,
  RFP_FORM_URL,
  TEAM_EMAIL,
  VOLUNTEER_FORM_URL,
} from "@/v2/lib/links";
import { EARLY_BIRD_DEADLINE, isEarlyBirdActive } from "@/lib/early-bird";
import lighthavenMap from "../../../public/images/lighthaven.png";
import lighthavenCutout from "../../../public/images/lighthaven_cutout.png";
import megagameChess from "../../../public/images/megagame-chess.jpg";

// Re-render hourly so the early-bird gate flips at the deadline without a deploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Metagame — Nov 6-8, 2026",
  description:
    "A convention of games, designs, and puzzles. Nov 6-8, 2026 at Lighthaven, Berkeley, California.",
};

const BODY_LINK = "font-semibold text-navy underline underline-offset-2";
const CONTAINER = "mx-auto max-w-[1180px] px-8";
const PROSE = "mt-3.5 text-base text-ink/70";

const FAQS: {
  id?: string;
  open?: boolean;
  question: string;
  answer: React.ReactNode;
}[] = [
  {
    id: "first-faq",
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
        <a href={LIGHTHAVEN_URL} className={BODY_LINK}>
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
        On-site housing at Lighthaven is now available.{" "}
        <a
          href={HOUSING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={BODY_LINK}
        >
          Book a room here
        </a>
        .
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
        until sunset in Berkeley on October 6th. After the sun has set, you must
        contact us.
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
        <a href={`mailto:${TEAM_EMAIL}`} className={BODY_LINK}>
          {TEAM_EMAIL}
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
        during the day! See the{" "}
        <Link href="/childcare" className={BODY_LINK}>
          childcare page
        </Link>{" "}
        for more. If you have particular questions or concerns feel free to{" "}
        <a href={`mailto:${TEAM_EMAIL}`} className={BODY_LINK}>
          reach out
        </a>
        .
      </>
    ),
  },
];

export default function Home() {
  const earlyBird = isEarlyBirdActive();
  return (
    <>
      {/* Section ids are deep-link anchors (/#faq); the nav links to pages. */}
      <div id="home" className={SECTION_ANCHOR}>
        <SiteHero />
      </div>

      {/* about */}
      <section id="about" className={`${SECTION} md:pt-11 md:pb-12`}>
        <div className={CONTAINER}>
          <div className="max-w-[600px]">
            <SectionHeading eyebrow="What is all this?" title="Metagame 2026" />
            <p className={PROSE}>
              Metagame is a weekend conference devoted to games. We mean games
              in the broadest sense of the word: any experience that is designed
              to be played, as opposed to passively consumed. This includes
              board games, card games, videogames, tabletop games, LARPs,
              puzzles, rock climbing routes, and more. If building it involves
              asking the question &ldquo;what would the consumer of this
              experience choose to do next?&rdquo;, it&apos;s a game.
            </p>
            <p className={PROSE}>
              <Link href="/last-year" className={NEWSLETTER_LINK}>
                See what happened last year &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      <div className="py-6">
        <Carousel images={CAROUSEL} />
      </div>

      <ChessDivider />

      {/* speakers */}
      <section id="speakers" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          <SectionHeading eyebrow="Who will be there?" title="Speakers" />
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {SPEAKERS.map((speaker) => (
              <PersonCard key={speaker.name} {...speaker} compact />
            ))}
          </div>
          <p className="mt-8 text-base text-ink/70">
            And many more coming soon&hellip;
          </p>
        </div>
      </section>

      <CardSuitsDivider />

      {/* get involved */}
      <section id="get-involved" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          <SectionHeading eyebrow="Want to do more?" title="Get Involved" />
          <p className={`${PROSE} max-w-[600px]`}>
            Metagame is made by the people who show up. Here&apos;s how to be
            one of them.
          </p>
          <div className="mt-10 grid gap-6 min-[900px]:grid-cols-3">
            {[
              {
                title: "Run something",
                body: (
                  <>
                    We want your games, puzzles, competitions, indie TTRPGs,
                    immersive theater performances, tournaments, design jams,
                    LARPs, trivia, crosswords, homemade meeples, chess variants,
                    turtle doves, social deception experiments not yet ready for
                    prime time, or things that defy all of these categories
                  </>
                ),
                cta: "Propose a session",
                href: RFP_FORM_URL,
                external: true,
              },
              {
                title: "Volunteer",
                body: (
                  <>
                    Help out before or during the con by joining one of the
                    volunteer teams:
                    <ul className="mt-2 list-disc pl-5 font-medium">
                      <li className="text-[#d16d8b]">Registration desk</li>
                      <li className="text-[#d98a54]">Room check</li>
                      <li className="text-[#c9a227]">Physical labor</li>
                      <li className="text-[#6faa6f]">Set design</li>
                      <li className="text-[#5ba8a0]">Marketing</li>
                      <li className="text-[#7a8fd4]">Speaker coordination</li>
                      <li className="text-[#a582c9]">Megagame design</li>
                      <li className="text-[#c76a6a]">&hellip; and more!</li>
                    </ul>
                  </>
                ),
                cta: "Apply to volunteer",
                href: VOLUNTEER_FORM_URL,
                external: true,
              },
              {
                title: "Sponsor Metagame",
                body: (
                  <>
                    Put your name on the weekend. Sponsor tiers can include:
                    <ul className="mt-2 list-disc pl-5">
                      <li>Logo placement on the site, swag, and marketing</li>
                      <li>A booth at the night market / career fair</li>
                      <li>Tickets for your team</li>
                      <li>Main-room talk and office-hours slots</li>
                      <li>A custom-built branded event</li>
                      <li>
                        &hellip; and at the headline tier, let&apos;s dream big
                      </li>
                    </ul>
                  </>
                ),
                cta: "Sponsor tiers",
                href: "/sponsor",
                external: false,
              },
            ].map(({ title, body, cta, href, external }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-navy/[0.16] bg-white p-7 shadow-[0_8px_24px_rgba(23,48,89,0.08)]"
              >
                <h3 className={`${HEADING} text-2xl text-navy`}>{title}</h3>
                {/* div, not p: the volunteer body nests a <ul>. */}
                <div className="mt-3 flex-1 text-[15px] text-ink/70">
                  {body}
                </div>
                <Button asChild variant="default" className="mt-6 w-fit">
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {cta}
                    </a>
                  ) : (
                    <Link href={href}>{cta}</Link>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DiceDivider />

      {/* venue */}
      <section id="venue" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          {/* Single grid so the image top-aligns with the title on wide screens. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div className="max-w-[560px]">
              <SectionHeading
                eyebrow="Where is it?"
                title={
                  <a
                    href={LIGHTHAVEN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-meeple"
                  >
                    Lighthaven Campus
                  </a>
                }
              />
              <p className="mt-2 text-base text-ink/60">
                2740 Telegraph Ave, Berkeley, CA 94705
              </p>
              <p className="mt-6 text-base text-ink/70">
                Lighthaven Campus is a puzzle-seeker&apos;s paradise, with
                easter eggs wedged into every nook and cranny and games mid-play
                concealed behind secret doors.
              </p>
              <p className={PROSE}>
                Onsite housing is available for the weekend, so you can roll out
                of bed and into a game at any moment. Rooms can be booked
                directly with Lighthaven.
              </p>
              <Button asChild variant="navy" className="mt-5">
                <a href={HOUSING_URL} target="_blank" rel="noopener noreferrer">
                  Book your rooms
                </a>
              </Button>
            </div>
            <a
              href={LIGHTHAVEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full max-w-[560px] transition-transform duration-300 hover:scale-[1.04]"
            >
              <Image
                src={lighthavenCutout}
                alt="Aerial view of the Lighthaven campus"
                className="h-auto w-full"
                sizes="(min-width: 1024px) 560px, 100vw"
              />
            </a>
          </div>
        </div>
      </section>

      <BloodOnTheClocktowerDivider />

      {/* highlights from 2025 */}
      <section id="highlights" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          <SectionHeading
            eyebrow="What happened last year?"
            title="Highlights from 2025"
          />
          <Highlights2025 />
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild variant="default">
              <a href={RFP_FORM_URL} target="_blank" rel="noopener noreferrer">
                Propose a session
              </a>
            </Button>
            <Button asChild variant="navy">
              <Link href="/last-year">See the full 2025 schedule</Link>
            </Button>
          </div>
        </div>
      </section>

      <DungeonCrawlDivider />

      {/* the megagame */}
      <section id="megagame" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div className="max-w-[600px]">
              <SectionHeading
                eyebrow="Want to build something?"
                title="The Megagame"
              />
              <div className="mt-3.5 space-y-3 text-base text-ink/70">
                <p>
                  The game begins when you step through the gate, and runs all
                  weekend. One part puzzle hunt, one part game gauntlet, one
                  part interlocking story.
                </p>
                <p>
                  The Megagame is threaded through the rest of Metagame, many
                  puzzles and games making up larger games and larger puzzles.
                  Anyone can play it, and anyone can create it. We want puzzles!
                  We want games! We want cryptic hints added to your session!
                  More details in the proposal form.
                </p>
              </div>
              <Button asChild variant="default" className="mt-6 w-fit">
                <a
                  href={MEGAGAME_PROPOSAL_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Build part of the Megagame
                </a>
              </Button>
            </div>
            <figure className="w-full max-w-[560px]">
              <Image
                src={megagameChess}
                alt="Giant orange and blue chess pieces, a knight in front"
                className="h-auto w-full [mask-image:linear-gradient(to_right,transparent,black_30%)]"
                sizes="(min-width: 1024px) 560px, 100vw"
              />
              <figcaption className="mt-3 text-center text-sm text-ink/70 italic">
                A puzzle and game made of smaller puzzles and games. Made
                by&hellip; you?
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <PacmanDivider />

      {/* tickets */}
      <section id="tickets" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          <SectionHeading eyebrow="Ready to play?" title="Tickets" />
          <p className={`${PROSE} mb-7 max-w-[600px]`}>
            One ticket covers all three days.
            {earlyBird && <> Early-bird pricing ends {EARLY_BIRD_DEADLINE}.</>}
          </p>
          {/* The panel renders bare toggle + tiles; the column/gap is ours. */}
          <div className="flex max-w-[700px] flex-col items-start gap-6">
            <TicketsPanel
              showHeading={false}
              surface="light"
              align="start"
              earlyBird={earlyBird}
            />
          </div>
        </div>
      </section>

      <SetCardDivider />

      {/* sponsors */}
      <section id="sponsors" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          <SectionHeading eyebrow="With gratitude" title="Our sponsors" />
          <div className="mt-10 flex flex-col items-center gap-10">
            {[
              { label: "Gold", sponsors: GOLD_SPONSORS, logo: "h-28 md:h-40" },
              {
                label: "Patron",
                sponsors: PATRON_SPONSORS,
                logo: "h-14 md:h-[72px]",
              },
            ].map(({ label, sponsors, logo }) => (
              <div key={label} className="flex flex-col items-center gap-4">
                <p className={`${EYEBROW} text-sm text-ink/50`}>{label}</p>
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                  {sponsors.map((s) => {
                    const img = (
                      <Image
                        src={s.logo}
                        alt={`${s.name} logo`}
                        className={`w-auto ${s.logoClass ?? logo}`}
                      />
                    );
                    return s.url ? (
                      <a
                        key={s.name}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-opacity hover:opacity-75"
                      >
                        {img}
                      </a>
                    ) : (
                      <span key={s.name}>{img}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <h3 className="font-grotesk text-xl font-semibold text-navy">
              Interested in helping make Metagame 2026 happen?
            </h3>
            <Button asChild variant="navy" size="lg" className="mt-5 text-lg">
              <Link href="/sponsor">Sponsor Metagame</Link>
            </Button>
          </div>
        </div>
      </section>

      <CatanDivider />

      {/* faq */}
      <section id="faq" className={`${SECTION} md:py-14`}>
        <div className={CONTAINER}>
          <SectionHeading
            eyebrow="But what about…"
            title="FAQ"
            className="mb-12"
          />
          <div className="flex max-w-[820px] flex-col gap-3.5">
            {FAQS.map(({ id, open, question, answer }) => (
              <FaqItem
                key={question}
                id={id}
                defaultOpen={open}
                question={question}
              >
                {answer}
              </FaqItem>
            ))}
          </div>
          <div className="mt-11">
            <p className="max-w-[620px] text-ink/70">
              Have more questions? Email{" "}
              <a href={`mailto:${TEAM_EMAIL}`} className={BODY_LINK}>
                {TEAM_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <MonopolyDivider />

      {/* stay in the loop */}
      <section
        id="stay-in-the-loop"
        className={`${SECTION} md:pt-14 md:pb-[88px]`}
      >
        <div className={CONTAINER}>
          <SectionHeading eyebrow="Want to keep up?" title="Stay in the loop" />
          <p className="mt-3 mb-7 max-w-[520px] text-base text-ink/70">
            Get notified about ticket sales, updates, volunteer opportunities,
            future events, and more.
          </p>
          <div className="max-w-[600px]">
            <SignupForm light />
          </div>
        </div>
      </section>
    </>
  );
}
