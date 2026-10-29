export type VolunteerWhen = "now" | "weekend" | "both";

export type VolunteerTeam = {
  name: string;
  /** When the team needs people: before the con, on the weekend, or both. */
  when: VolunteerWhen;
  blurb: string;
  /** Text color for the team name in the home page list. */
  color: string;
};

// The volunteer teams, in the order the home page lists them. `when` and the
// blurbs drive /volunteer; confirm changes with the Volunteer Coordinator.
export const VOLUNTEER_TEAMS: VolunteerTeam[] = [
  {
    name: "Registration desk",
    when: "weekend",
    blurb: "Welcome people at the gate and get them checked in.",
    color: "text-[#d16d8b]",
  },
  {
    name: "Room check",
    when: "weekend",
    blurb: "Keep rooms ready and sessions starting on time.",
    color: "text-[#d98a54]",
  },
  {
    name: "Physical labor",
    when: "weekend",
    blurb: "Carry, set up and tear down. Strong arms appreciated.",
    color: "text-[#c9a227]",
  },
  {
    name: "Set design",
    when: "both",
    blurb: "Help dress Lighthaven so the whole campus feels like a game.",
    color: "text-[#6faa6f]",
  },
  {
    name: "Marketing",
    when: "now",
    blurb:
      "Put up posters, share Metagame in your communities, and bring your friends.",
    color: "text-[#5ba8a0]",
  },
  {
    name: "Speaker coordination",
    when: "both",
    blurb: "Help session hosts get what they need and find their rooms.",
    color: "text-[#7a8fd4]",
  },
  {
    name: "Megagame design",
    when: "now",
    blurb: "Build puzzles and games for the all-weekend Megagame.",
    color: "text-[#a582c9]",
  },
];

export const WHEN_LABEL: Record<VolunteerWhen, string> = {
  now: "Starts now",
  weekend: "Nov 6–8",
  both: "Now + Nov 6–8",
};
