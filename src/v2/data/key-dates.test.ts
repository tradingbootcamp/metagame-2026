import { expect, it } from "vitest";
import { NIGHT_NAME } from "./chapters";
import { upcomingTurns } from "./key-dates";

const titles = (now: number) => upcomingTurns(now).map((d) => d.title);

it("puts the con weekend between the deadlines and the nap", () => {
  expect(titles(Date.UTC(2026, 9, 22, 19))).toEqual([
    "Volunteer applications due",
    "Ticket sales close",
    "The game begins",
    `Expansion: ${NIGHT_NAME}`,
    "Talks, workshops and games all day",
    "Final round",
    "The Metagame team takes a looong nap",
  ]);
});

it("drops each beat once its day is over, Pacific time", () => {
  // Saturday Nov 7, 10am Pacific (PST, UTC-8).
  expect(titles(Date.UTC(2026, 10, 7, 18))).toEqual([
    "The game begins",
    "Talks, workshops and games all day",
    "Final round",
    "The Metagame team takes a looong nap",
  ]);
});
