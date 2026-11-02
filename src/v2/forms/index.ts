import { children } from "./children";
import type { FormDef } from "./engine";
import { financialAid } from "./financial-aid";
import { joinTeam } from "./join-team";
import { megagame } from "./megagame";
import { nightMarket } from "./night-market";
import { propose } from "./propose";
import { sponsor } from "./sponsor";
import { volunteer } from "./volunteer";

// Every journey on the site, by slug (the submit route's path segment).
export const FORMS: Record<string, FormDef> = Object.fromEntries(
  [
    propose,
    megagame,
    volunteer,
    financialAid,
    children,
    nightMarket,
    sponsor,
    joinTeam,
  ].map((def) => [def.slug, def]),
);
