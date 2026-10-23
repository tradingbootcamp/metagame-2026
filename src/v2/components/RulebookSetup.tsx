import { HATS } from "@/v2/hat-trick/hats";
import { HOTELS_SEARCH_URL, HOUSING_URL, LIGHTHAVEN_URL } from "@/v2/lib/links";
import fairyLights from "../../../public/images/carousel/6_fairy_lights.jpg";
import ContactLink from "./contact/ContactLink";
import RulebookFigure from "./RulebookFigure";
import RulebookRules from "./RulebookRules";

const LINK = "font-semibold text-navy underline underline-offset-2";
const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;

// §3 of the rulebook: venue, beds, parking and access, beside Fig. 3 (which
// hides a Hat Trick hat).
export default function RulebookSetup() {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-11">
      <RulebookRules
        chapter={3}
        rules={[
          <>
            <strong className="text-navy">Find the board.</strong>{" "}
            <a href={LIGHTHAVEN_URL} {...EXT} className={LINK}>
              Lighthaven Campus
            </a>
            , 2740 Telegraph Ave, Berkeley, CA 94705. Easter eggs are wedged
            into every nook, and some games hide behind secret doors.
          </>,
          <>
            <strong className="text-navy">Claim a bed.</strong> On-site housing
            can be{" "}
            <a href={HOUSING_URL} {...EXT} className={LINK}>
              booked directly with Lighthaven
            </a>
            , so you can roll out of bed and into a game. Berkeley has{" "}
            <a href={HOTELS_SEARCH_URL} {...EXT} className={LINK}>
              plenty of hotels
            </a>{" "}
            too.
          </>,
          <>
            <strong className="text-navy">Leave the car.</strong> Street parking
            is very limited. Please avoid the two blocks around Lighthaven so
            the neighbors stay happy.
          </>,
          <>
            <strong className="text-navy">Tell us what you need.</strong> Some
            parts of the campus are easier to get around than others. If
            accessibility is a concern,{" "}
            <ContactLink subject="Accessibility" className={LINK}>
              reach out
            </ContactLink>{" "}
            and we&apos;ll make it work.
          </>,
        ]}
      />
      <RulebookFigure
        fig="3"
        caption="Evening games under the fairy lights. Metagame 2025."
        src={fairyLights}
        alt="Evening games under fairy lights"
        hats={[HATS.beanie]}
      />
    </div>
  );
}
