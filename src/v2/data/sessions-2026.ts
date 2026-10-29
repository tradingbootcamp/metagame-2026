// Metagame 2026 sessions: every submission to the sessions form (Airtable,
// "Sessions RFP Form"), as exported on Oct 27, 2026, minus the ones marked
// unlikely. Times and rooms live in the schedule (/schedule), not here.
//
// `status` is where each session stands:
// - "confirmed": on the program.
// - "review": submitted, not confirmed yet (verdicts "Probably", "needs
//   follow up", or none yet).
// - "unconference": runs on the unconference schedule, not the main program.
//
// A null `title` means the host hasn't named it yet.

export type SessionStatus = "confirmed" | "review" | "unconference";
export type SessionKind =
  | "larp"
  | "talk"
  | "workshop"
  | "game"
  | "ttrpg"
  | "deception"
  | "puzzle"
  | "immersive"
  | "megagame"
  | "physical"
  | "playtest"
  | "other";

export type Session2026 = {
  slug: string;
  title: string | null;
  hosts: string[];
  /** Studio or company the hosts are running it for. */
  org?: string;
  /** Kinds of play, the main one first. */
  kinds: SessionKind[];
  duration: string;
  blurb: string;
  status: SessionStatus;
};

export const SESSIONS_2026: Session2026[] = [
  {
    slug: "thumper-braxtons-emergency-birthday-wish",
    title: "Thumper Braxton's Emergency Birthday Wish Vote",
    hosts: ["Michel Lichand"],
    kinds: ["larp"],
    duration: "2½ hours, with debrief",
    blurb:
      "Thumper Braxton’s 13th birthday is in an hour and he hasn’t decided on this year’s wish yet. The voices in his head have convened for an emergency meeting. Will you push for your party’s wish to be the chosen one, or will you pick what’s best for Thumper? It’s time to vote in this comedic LARP that’s Dr. Strangelove meets Inside Out.",
    status: "confirmed",
  },
  {
    slug: "celestial-decks-the-noncombat-tcg-about",
    title:
      "Celestial Decks, the noncombat TCG about resolving life's story in the spirit world",
    hosts: ["Kai Geffen"],
    kinds: ["game"],
    duration: "2 hours",
    blurb:
      "This will be an intro to Celestial Decks, the noncombat digital card game about telling your story in the spirit afterlife.\nHear about the development of the project, play through a brief tutorial, then team up and play a little competitive tournament together to win shirts, cards, and in-game prizes!",
    status: "confirmed",
  },
  {
    slug: "game-design-challenge-blitz-competition",
    title: "Game Design Challenge - Blitz Competition with Cash Prize",
    hosts: ["Alexander Guinn"],
    kinds: ["workshop"],
    duration: "2 hours",
    blurb:
      "Create and prototype a new game based on a surprise prompt in 90 minutes!\nA fun and fast challenge in game design.\nCome with a team of 4 friends or get matched in teams with other attendees.\nThe winning team wins a prize!",
    status: "review",
  },
  {
    slug: "the-good-people-of-sheepfield-a-larp",
    title: "The Good People of Sheepfield: A LARP",
    hosts: ["Michael Vassilevsky"],
    kinds: ["larp"],
    duration: "3 hours",
    blurb:
      "A secrets-and-powers LARP for 11 players, set in a seemingly placid early 19th-century Welsh farming village, where longstanding tensions and secrets simmer beneath the surface as its days of isolation threaten to come to an end. Will Sheepfield stay quiet after you're done with it? No.\n\n(Don't worry about dressing up, normal clothes are appropriate.)",
    status: "unconference",
  },
  {
    slug: "the-case-of-the-sabotaged-lecture",
    title: "The Case of the Sabotaged Lecture",
    hosts: ["Marcus Richardson"],
    kinds: ["talk", "puzzle", "immersive"],
    duration: "1 hour",
    blurb:
      "What starts as a ho-hum lecture devolves into chaos! How embarrassing!\nSolve puzzles to discover who sabotaged Marcus's presentation in this immersive mystery experience.",
    status: "confirmed",
  },
  {
    slug: "dark-exploit",
    title: "Dark Exploit",
    hosts: ["Chris Kay", "Devin Lehmacher"],
    kinds: ["deception", "playtest"],
    duration: "2 hours",
    blurb:
      "Dark Exploit is a social deduction game for 8-20 alignment researchers. There are two storytellers on opposite teams: the CEO and the Superintelligence. Players investigate which Programs will align the Superintelligence, while hidden Agents try to let it escape.",
    status: "confirmed",
  },
  {
    slug: "collaborative-game-design",
    title: "Collaborative game design",
    hosts: ["Isaac King"],
    kinds: [
      "immersive",
      "megagame",
      "puzzle",
      "workshop",
      "larp",
      "playtest",
      "other",
    ],
    duration: "All weekend",
    blurb: "",
    status: "review",
  },
  {
    slug: "building-an-irl-mmo-a-fireside-chat-on",
    title: "Building an IRL MMO: A Fireside Chat on Sandbox Systems",
    hosts: ["Elli Furedy", "Andrea Furedy"],
    kinds: ["talk"],
    duration: "1–1½ hours",
    blurb:
      "Alleycat has spent five years exploring the intersection of custom hardware and immersive experiences, all of which is now aimed at turning the platform into an open source IRL MMO. Come explore this interesting and complex design space over an intimate fireside chat with the founders, Elli and Andrea Furedy.",
    status: "confirmed",
  },
  {
    slug: "slaydium-games-an-unforgettable-d-d",
    title: "Slaydium Games: An Unforgettable D&D Gladiatorial Experience",
    hosts: ["Casey Jones"],
    kinds: ["immersive", "ttrpg", "talk"],
    duration: "2 hours",
    blurb:
      "Don't miss a one-of-a-kind experience as D&D becomes a spectator sport! Watch gladiatorial games unfold in one of twenty deadly arenas with level 10 characters in a fight to the death. Let the slayhem begin!",
    status: "review",
  },
  {
    slug: "rogue-an-ai-security-crisis-matrix-game",
    title: "Rogue: An AI Security Crisis Matrix Game",
    hosts: ["Marianne"],
    kinds: ["playtest"],
    duration: "1½ hours",
    blurb: "",
    status: "review",
  },
  {
    slug: "tommy-honton-talk",
    title: null,
    hosts: ["Tommy Honton"],
    kinds: ["talk"],
    duration: "1 hour",
    blurb: "",
    status: "review",
  },
  {
    slug: "blood-on-the-clocktower-with-chris-grace",
    title: "Blood on the Clocktower with Chris Grace",
    hosts: ["Chris Grace"],
    kinds: ["deception"],
    duration: "",
    blurb: "",
    status: "confirmed",
  },
  {
    slug: "intro-to-trading-w-arbor",
    title: "Intro to Trading w/ Arbor",
    hosts: ["Ricki Heicklen"],
    org: "Arbor",
    kinds: ["workshop"],
    duration: "1½ hours",
    blurb:
      "A couple Arbor instructors will present the first hour-long class of Arbor's quantitative trading bootcamp. Some people pay $88.09 per hour to attend content like this, but you can get it for free!\n\nIf substantially more people show up than we can handle we will probably just run this one for a third time later this weekend.",
    status: "review",
  },
  {
    slug: "play-megagem-the-secret-game-from-jane",
    title: "Play Megagem, the secret game from Richard Garfield & Jane Street",
    hosts: ["Jacob Kopczynski"],
    kinds: ["game"],
    duration: "1 hour",
    blurb:
      "Megagem is an auction game about private information, value that changes based on what isn't yet known, and strategically revealing what you know to conceal important secrets and to bluff. It simulates commodity trading in some ways, and was made by Jane Street and Richard Garfield. And Jane Street aren't selling it openly, so it's hard to get a hold of!",
    status: "confirmed",
  },
  {
    slug: "ye-olde-gemme-shoppe",
    title: "Ye Olde Gemme Shoppe",
    hosts: ["Adam Scherlis"],
    kinds: ["megagame", "puzzle", "other"],
    duration: "All weekend",
    blurb: "Acquire coins and win FABULOUS PRIZES (fake gemstones)!",
    status: "confirmed",
  },
  {
    slug: "sandbox-systems-designing-games-for-play",
    title: "Sandbox Systems - Designing Games for Immersive Play",
    hosts: ["Elli Furedy", "Andrea Furedy", "Carson Duffy"],
    kinds: ["talk", "immersive", "megagame", "other"],
    duration: "1–1½ hours",
    blurb:
      "Technology doesn’t have to pull people apart - we believe it can give them a reason to connect. Sandbox Systems explores our approach to designing immersive games where custom hardware creates opportunities for interaction and simple systems give rise to complex, emergent play. We’ll share the philosophy behind those systems and the improvisational engineering required to make them survive contact with the real world.",
    status: "review",
  },
  {
    slug: "strip-game-design",
    title: "Strip-Game Design",
    hosts: ["Guy"],
    kinds: ["workshop"],
    duration: "1 hour",
    blurb:
      'Many strip games err too much on the "strip" side. As someone who *loves* games, I took it upon myself to make strip games that are good *games*.\nLearn about the interesting aspects of balance and partial information in strip game design, and practice designing a game with a small group!',
    status: "confirmed",
  },
  {
    slug: "bolt-league-run-your-own-custom-tcg-and",
    title:
      "BOLT League: Run your own custom TCG (and take over your friends' lives in the process)",
    hosts: ["Andrew Nathenson"],
    kinds: ["talk"],
    duration: "1 hour",
    blurb:
      "I've run two seasons of an asynchronous trading card game league/role-playing game/puzzle hunt in the past two years, and I think I've hit upon a formula that causes the game to become extremely special to my friends (and, quite addictive!  But it's just for fun and has generated some amazing friendships, so in a good way!).  I want more people to know about and be able to run this kind of game, because it is too good to keep all to myself.",
    status: "confirmed",
  },
  {
    slug: "ideas-over-easy-building-games-with",
    title: "Ideas Over Easy: Building Games with Scramble",
    hosts: ["Carla X", "Dustin"],
    org: "Rogue Signal",
    kinds: ["talk"],
    duration: "2 hours",
    blurb:
      "Got a game idea? Bring it to life with Scramble. Take a tour of the platform and discover how its features bring interactive games to life. We’ll explore challenges, tasks, and integrations through real game examples, with time for Q&A and help getting started.",
    status: "confirmed",
  },
  {
    slug: "becoming-a-sell-out-licensing-selling-to",
    title:
      "Becoming a Sell-Out: Licensing & Selling concepts to Board Game Companies",
    hosts: ["Alexander Guinn"],
    kinds: ["talk"],
    duration: "1–1½ hours",
    blurb:
      "Have an idea for the next great boardgame? Want to get onto shelves in major retail stores around the country?\nLearn all about how to sell your game ideas to major companies like Hasbro, Mattel, Spin Master, Asmodee, ect.\nPresented by experienced Inventors and Board Game Industry Experts!",
    status: "review",
  },
  {
    slug: "hungry-hungry-humans",
    title: "Hungry Hungry Humans",
    hosts: ["Sparr"],
    kinds: ["physical"],
    duration: "1–2 hours",
    blurb:
      'Teams of two will play life-sized "Hungry Hungry Hippos", with one acting as the hippo and the other the player.',
    status: "review",
  },
  {
    slug: "den-of-wolves-new-eden",
    title: "Den of Wolves (New Eden)",
    hosts: ["Michael Sheely"],
    kinds: ["megagame", "deception", "larp", "ttrpg", "game", "immersive"],
    duration: "4 hours",
    blurb:
      "Den of Wolves is a small space themed megagame of paranoia and collaboration in which a fleet of six to seven space vessels are run by up to 20 players who will trade resources, exploration, and seek to evade a pursuing fleet. Supports roleplay and player creativity in the mechanics. Some of the players may secretly be members of the enemy fleet, trying to sabotage the fleet.",
    status: "confirmed",
  },
  {
    slug: "can-you-escape-rattle-spring-a-surreal",
    title:
      "Can you escape Rattle Spring? A surreal point-and-click puzzle playtest",
    hosts: ["Jiayang Liu"],
    kinds: ["playtest"],
    duration: "1 hour",
    blurb:
      "Step into the strange Rattle Spring Resort and solve interconnected puzzles to escape from the eerie spaces. This is a hands-on playtest of an upcoming surreal puzzle adventure video game, Rattle Spring, inspired by Rusty Lake.",
    status: "unconference",
  },
  {
    slug: "constitutional-promptocracy",
    title: "Constitutional Promptocracy",
    hosts: ["Adam Scherlis"],
    kinds: ["immersive", "playtest"],
    duration: "1 hour",
    blurb:
      "Claude always follows its Constitution, and has absolute power. Every minute, it adopts a new Rule. With the power of Prompt Engineering, you will add game mechanics, alter the system of government, and smooth-talk your way into Victory Points and eternal glory. BRING A LAPTOP (or phone)",
    status: "confirmed",
  },
  {
    slug: "a-classic-fantasy-adventure",
    title: "A Classic Fantasy Adventure!",
    hosts: ["John Bromels"],
    kinds: ["immersive", "game", "puzzle", "megagame"],
    duration: "1½–2 hours",
    blurb:
      "One table. Three characters. An entire epic tale's worth of adventure!\nThis immersive tabletop experience puts players in the center of a familiar narrative as three brave adventurers storm the castle, slay the dragon, rescue the princess, and grab the loot! But their fates will be determined not by rolls of the dice, but by their ability to think laterally to solve fiendish puzzles!\nThis experience was a sold-out hit at the 2025 National Puzzlers' League convention.",
    status: "review",
  },
  {
    slug: "barbaras-rhubarb-bar",
    title: "Barbara's Rhubarb Bar",
    hosts: ["John Bromels", "Ben Karcher"],
    kinds: ["immersive", "megagame", "larp", "other"],
    duration: "2 hours",
    blurb:
      "Barbara's Rhubarb Bar serves the finest German-inspired rhubarb treats this side of Bavaria!",
    status: "review",
  },
  {
    slug: "p-hacker",
    title: "P-Hacker",
    hosts: ["Gabriel Quinche"],
    kinds: ["game", "playtest"],
    duration: "1 hour",
    blurb:
      "P-Hacker is a card game about the replication crisis. Step into the role of a scientist: gather data, decide what to publish, and bet on what’s true while your rivals do the same. Win by uncovering the hidden truth—not by publishing the most papers.",
    status: "review",
  },
  {
    slug: "giving-players-metagame-power",
    title: "Giving Players Metagame Power",
    hosts: ["Damon Pourtahmaseb-Sasi"],
    kinds: ["talk"],
    duration: "1 hour",
    blurb:
      "Lecture and Q&A about the role of games as a medium for exploring agency, and how meta-gaming can be built-in mechanically into game and game-like experiences to help improve players' experiences, make the whole process more collaborative, and introduce extra fun both for players and those running the games.",
    status: "confirmed",
  },
  {
    slug: "narrative-design-marrying-script-and",
    title: "Narrative design: marrying script and gameplay",
    hosts: ["Justin Kuiper"],
    kinds: ["talk"],
    duration: "30 minutes + Q&A",
    blurb:
      "Sometimes, gameplay can tell a story that the script can't tell on its own: letting the player make terrible decisions (and live with the consequences), or letting the player tell a story where a \"fail state\" is just the start of a new arc. How can we design games that force players to choose between \"doing what's right\" and what helps them win without punishing good behavior?\n\nUsing examples from a variety of games (including my own), I'll show why players actually love to fail, and how scriptwriters can collaborate with designers to make gameplay choices a meaningful part of a game's story.",
    status: "review",
  },
  {
    slug: "dig-in",
    title: "Dig In",
    hosts: ["Caro Murphy"],
    kinds: ["larp"],
    duration: "2 hours",
    blurb:
      "In Dig In, you play as a member of a family around the Thanksgiving dinner table. Every person at the table has a bone to pick with someone else, and conflicts will arise. Will you apologize, or dig in?\nCo-written by Arlo Howard and Caro Murphy",
    status: "confirmed",
  },
  {
    slug: "dungeon-court",
    title: "Dungeon Court",
    hosts: ["Randy Lubin", "Raph D’Amico"],
    kinds: ["larp", "other"],
    duration: "1 hour",
    blurb:
      "Bring your fantastical problems to court in a game that's Judge Judy meets Dungeons & Dragons. Pairs of players are assigned court cases and then each party has one minute to make their case before the judge. Then, the judge asks questions and renders a verdict. Inspired by Jason Morningstar's Ghost Court.",
    status: "confirmed",
  },
  {
    slug: "aemilia-dixon-weekend-game",
    title: null,
    hosts: ["Aemilia Dixon"],
    kinds: ["immersive", "deception", "larp", "playtest", "other"],
    duration: "All weekend",
    blurb: "",
    status: "confirmed",
  },
  {
    slug: "gone-in-30-seconds",
    title: "Gone in 30 Seconds",
    hosts: ["John Bromels"],
    kinds: ["other"],
    duration: "30 seconds",
    blurb:
      "They're after me, so I can't give too many details.\nBut if you want to have your mind blown, you'll attend this session.\nBe in the right place at the right time.\nI won't wait to start.\nI won't stay afterward for questions.\nI've already said too much.",
    status: "review",
  },
  {
    slug: "cellular-automaton-dance-party",
    title: "Cellular automaton dance party",
    hosts: ["Isaac King"],
    kinds: ["immersive", "physical", "other"],
    duration: "30 minutes–1 hour",
    blurb: "Party so hard, they're gonna call us John von Noiseman",
    status: "confirmed",
  },
  {
    slug: "board-game-round-robin",
    title: "Board Game Round Robin",
    hosts: ["Sparr"],
    kinds: ["game", "megagame"],
    duration: "1 hour",
    blurb:
      "A head to head battle between players of each team, taking turns making moves in many different board games. A test of both game skill and ability to rapidly context switch.",
    status: "confirmed",
  },
  {
    slug: "designing-serious-games",
    title: 'Designing "Serious" Games',
    hosts: ["Randy Lubin"],
    kinds: ["talk"],
    duration: "45 minutes",
    blurb:
      "Learn about the world of \"serious\" games that help organizations explore possible futures and explain complex systems. We'll explore different types of digital and in person games and discuss how designing them is both similar and different than making consumer games. I'll share the process I've used for co-designing games with organizations like the United Nations and Red Cross as well as tips for collaborating with big organizations.",
    status: "confirmed",
  },
  {
    slug: "designing-horror-scenarios",
    title: "Designing Horror Scenarios",
    hosts: ["Jamie Wahls"],
    kinds: ["workshop", "talk"],
    duration: "1 hour",
    blurb:
      "We will sit down and talk theory, and by the end of the session we will have the bones of a good horror scenario, for your tabletop games, fiction book, or bedroom roleplay.",
    status: "confirmed",
  },
  {
    slug: "steal-this-system-a-practical-framework",
    title:
      "Steal This System: A Practical Framework for Generating Fresh Ideas",
    hosts: ["Marlee Honton"],
    kinds: ["workshop", "talk", "ttrpg", "puzzle", "immersive", "playtest"],
    duration: "1½ hours",
    blurb:
      "Traditional brainstorming often leaves you circling the same ideas. Discover a practical, repeatable framework you can steal to break creative gridlock on demand. This session features a live game demo, a breakdown of the system, and a hands-on sprint to spark your next concept.",
    status: "confirmed",
  },
  {
    slug: "carboniferous-bughouse",
    title: "Carboniferous bughouse",
    hosts: ["Isaac"],
    kinds: ["game", "physical"],
    duration: "20–30 minutes a game",
    blurb:
      'If you find the title unclear, pretend I called it "Jurassic bughouse" but replaced the era for paleontological accuracy.',
    status: "confirmed",
  },
  {
    slug: "brendan-runs-blood-on-the-clocktower",
    title: "Brendan runs Blood on the Clocktower",
    hosts: ["Brendan Hurst"],
    kinds: ["deception"],
    duration: "60–75 minutes",
    blurb: "The social deception game where death is not the end!",
    status: "confirmed",
  },
  {
    slug: "the-ghost-games",
    title: "The Ghost Games",
    hosts: ["Marlee Honton", "Tommy Honton"],
    kinds: ["game", "puzzle", "other"],
    duration: "2½ hours",
    blurb:
      "Part strategy, part social, a little bit puzzle. Teams of 3 to 5 play three original games in the style of The Genius and The Devil's Plan.",
    status: "confirmed",
  },
  {
    slug: "intro-to-bridge",
    title: "Intro to Bridge",
    hosts: ["Watson Ladd"],
    kinds: ["game", "workshop"],
    duration: "1½ hours",
    blurb:
      "Invented in the 19th century and refined by the 1920s, bridge is the ultimate trick taking game.  If you like Hearts and Spades, but think they've gotten a bit boring or just want to see what the most popular game of the mid 20th century was like, come start learning the basics!",
    status: "unconference",
  },
  {
    slug: "worlds-to-come-the-hebrew-roleplaying",
    title: "Worlds To Come: The Hebrew roleplaying game",
    hosts: ["Lexi Kohanski"],
    kinds: ["ttrpg", "playtest"],
    duration: "3 hours",
    blurb:
      "Play a story-forward session of Worlds To Come: The Hebrew roleplaying game with designer Lexi Kohanski. In Worlds To Come, you play miracle workers who speak truths in the language of Creation to rewrite people's guiding words. In this session, we'll explore the dark side of the miracle workers: while they strive to use their powers to repair the world, they do so with words of power that give those who hear no choice in how their souls will be forever altered.",
    status: "confirmed",
  },
  {
    slug: "troll-academy",
    title: "Troll Academy",
    hosts: ["John Bromels"],
    kinds: ["workshop", "immersive", "physical", "megagame"],
    duration: "45 minutes–1 hour",
    blurb:
      "YOU WANT BE TROLL?\nYOU SHOULD.\nTROLL IS BEST THING TO BE IN WHOLE WORLD.\nTROLL BIG.\nTROLL STRONG.\nTROLL HIT THING WITH CLUB.\nYOU COME TO CLASS, WE TEACH YOU HOW BE TROLL.\nYOU PASS, YOU GET TROLL DIP... TROLL DIPLOW...\nYOU PASS, YOU GET THING WE WRITE AND GIVE YOU TO PROVE YOU TROLL NOW.",
    status: "confirmed",
  },
  {
    slug: "designing-immersive-experiences-at-scale",
    title: "Designing Immersive Experiences at Scale",
    hosts: ["Caro Murphy"],
    kinds: ["talk"],
    duration: "1 hour",
    blurb:
      "Say you want to create an immersive/interactive playable experience for more than 150 people... How about 500? Where do you start? How do you ensure that you have both created something that scales, while retaining meaningful creative agency and interactivity? How do you ensure that the experience isn't just passive consumption, but actually engages your participants? In this session, Caro will discuss the design structures and tools needed to achieve the balance between scale and meaningful play.",
    status: "confirmed",
  },
  {
    slug: "chris-grace-talk",
    title: null,
    hosts: ["Chris Grace"],
    kinds: ["talk"],
    duration: "",
    blurb: "",
    status: "confirmed",
  },
  {
    slug: "person-do-thing-sign-language-edition",
    title: "Person Do Thing: Sign Language Edition",
    hosts: ["Noah Topper", "Rosie Campbell"],
    kinds: ["talk", "workshop", "other"],
    duration: "1 hour",
    blurb:
      "Person Do Thing is a wonderful game which teaches us that all human concepts can be described using just 33 simple words. American Sign Language is a beautifully fun language. I'll teach you the 33 signs you need, then we can break into groups for some ASL PDT.",
    status: "confirmed",
  },
  {
    slug: "i-100-game-designers-heres-what-i",
    title: "I ***** 100 Game Designers. Here's What I Learned.",
    hosts: ["Peih-Gee Law"],
    kinds: ["talk"],
    duration: "40 minutes–1 hour",
    blurb:
      "I spent the last 6 years ***** over 100 game designers so you don't have to. Learn from their mistakes, borrow inspiration, and see how the world's best game designers think.",
    status: "confirmed",
  },
  {
    slug: "spencers-secret-dungeon-talk-show",
    title: "Spencer's Secret Dungeon Talk Show",
    hosts: ["Spencer Beebe"],
    kinds: ["talk", "playtest"],
    duration: "75 minutes",
    blurb:
      "The only talk show that traps its guests in a video game dungeon where they must fight, solve, and roleplay their way to victory.",
    status: "confirmed",
  },
  {
    slug: "the-treacherous-turn-oneshot-special",
    title: "The Treacherous Turn: Oneshot Special",
    hosts: ["Aemilia Dixon", "iris lemony"],
    kinds: ["ttrpg"],
    duration: "2–3 hours",
    blurb:
      "The Treacherous Turn is a research-supported TTRPG in which the players collectively scheme as a misaligned AI in the modern world. Join its lead game designer, iris lemony, as she runs a bespoke oneshot, designed just for Metagame!",
    status: "confirmed",
  },
  {
    slug: "building-a-roleplaying-theme-park",
    title: "Building a Roleplaying Theme Park",
    hosts: ["Caro Murphy"],
    kinds: ["workshop", "other"],
    duration: "1 hour",
    blurb:
      "This is a spaghetti session to imagine what a mind-blowing experience at a roleplaying theme park would look like. We'll brainstorm and pitch creative concepts and share ideas and generally come up with fun creative shenanigans together.",
    status: "confirmed",
  },
  {
    slug: "ready-set-hodl-learn-bitcoin-ccg",
    title: "Ready, Set, HODL: Learn Bitcoin CCG",
    hosts: ["Carla X", "Dustin"],
    org: "Rogue Signal",
    kinds: ["game", "playtest"],
    duration: "1 hour",
    blurb:
      "Bitcoin CCG brings a new twist to strategic card battles familiar to fans of Magic: The Gathering. Join us for a gameplay demo, learn the basics, then try it for yourself. The first one to 21 bitcoin wins!",
    status: "confirmed",
  },
  {
    slug: "jadefall",
    title: "Jadefall",
    hosts: ["Chris Kay", "Devin Lehmacher"],
    kinds: ["game", "deception", "playtest"],
    duration: "1 hour",
    blurb:
      "Jadefall is a quick and dramatic social deduction game for 4-12 players, themed around the Chinese Zodiac. Players use their unique animal powers to discover who holds the most valuable treasure, while hidden traitors try to steer the vote towards the wrong choice. Jadefall plays fast: no night phase, no player elimination, no moderator, and only a single round of voting - without sacrificing deduction, deception, or strategic depth.",
    status: "confirmed",
  },
  {
    slug: "game-induction-nim-combinatorial-game",
    title: "Game Induction, Nim, & Combinatorial Game Theory",
    hosts: ["David Spies"],
    kinds: ["talk"],
    duration: "1 hour",
    blurb:
      "A math lecture presenting the game Nim and its solution. No background knowledge beyond basic arithmetic is needed.",
    status: "confirmed",
  },
  {
    slug: "gamify-your-world",
    title: "Gamify Your World",
    hosts: ["Dustin D. Trammell"],
    kinds: ["talk"],
    duration: "1 hour",
    blurb:
      "Want more gamification in your life?  Gamify the places you want to be in the world!  In this talk, Dustin D. Trammell, Gamemaster for Rogue Signal, will talk about what it means to gamify physical environments such as locations and events, our approach to such gamification at Rogue Signal, and highlight some case studies of our previous work as examples.  Come and learn how to shift into a gamification mindset as you explore the world every day!",
    status: "review",
  },
  {
    slug: "designing-iq-tests",
    title: "Designing IQ Tests",
    hosts: ["aella"],
    kinds: ["workshop"],
    duration: "45 minutes",
    blurb:
      "I made a lil IQ test. It turns out it's really hard to make high quality, tricky puzzles. Let's sit down and try to design cool ravens matrices (or number sequences or whatever)!",
    status: "review",
  },
  {
    slug: "hat-tricks",
    title: "Hat Tricks",
    hosts: ["Jacob Kopczynski"],
    kinds: ["physical", "megagame", "game"],
    duration: "All weekend",
    blurb:
      "A hat trick is when you trick someone and take their hat. There are hats; take them, if you dare to be a target yourself. Prizes for proving your skill; ransoms for returning the hats to the organizers. Or keep them beyond the weekend, if you think you can.\nNote: Violence is prohibited, but a few bruises will be inevitable. Caveat furator.",
    status: "confirmed",
  },
  {
    slug: "flight-of-the-bumblebees",
    title: "Flight of the Bumblebees",
    hosts: ["David Turner"],
    kinds: ["game", "playtest"],
    duration: "1 hour a playtest",
    blurb:
      "Flight of the Bumblebees is a track-laying board game for 2-3 players.",
    status: "unconference",
  },
  {
    slug: "professional-gming-realities-behind-a",
    title: "Professional GMing - Realities Behind a Full-Time Career",
    hosts: ["Casey Jones"],
    kinds: ["talk"],
    duration: "1 hour",
    blurb:
      "Ever wanted to turn your passion for D&D into a career? Join professional GMs with decades of TTRPG experience to hear about their work storytelling, collaborating, and building unforgettable gaming experiences for their players. It's an hour you won't want to miss!",
    status: "review",
  },
  {
    slug: "squire-larpg",
    title: "Squire (LARPG)",
    hosts: ["Christian Strohm", "Darren", "Josh"],
    kinds: ["larp", "immersive", "physical", "other"],
    duration: "10 minutes a round, all weekend",
    blurb:
      "Calling all knights and their squires! Come play a 2-player cooperative LARPG with a completely unique way of controlling a video game character.",
    status: "confirmed",
  },
  {
    slug: "revival-of-heartgrove",
    title: "Revival of Heartgrove",
    hosts: ["Anatoliy Cherednichenko"],
    kinds: ["game", "playtest"],
    duration: "1½ hours",
    blurb:
      "After humanity is wiped out, animal clans gain elemental powers to reclaim Earth by restoring “Heartgrove,” but some among them sabotage the restoration from within. Join us for the playtest and help shape the future of our game! (as well as the Earth!)",
    status: "review",
  },
  {
    slug: "demon-summoner",
    title: "Demon Summoner",
    hosts: ["Chris Kay", "Devin Lehmacher"],
    kinds: ["game", "deception", "playtest"],
    duration: "1 hour",
    blurb:
      "Demon Summoner is a social deduction game where one player stacks the deck. You are tasked with saving your town from demons while uncovering the Wicked traitors within your ranks. One player, the Demon Summoner, is the publicly known strategist of the Wicked team, with special powers to frame honest players as Wicked.",
    status: "confirmed",
  },
];

const sameName = (a: string, b: string) =>
  a.toLowerCase().replace(/’/g, "'") === b.toLowerCase().replace(/’/g, "'");

const STATUS_ORDER: SessionStatus[] = ["confirmed", "review", "unconference"];

/** A person's sessions, confirmed ones first. */
export function sessionsFor(name: string): Session2026[] {
  return SESSIONS_2026.filter((s) =>
    s.hosts.some((h) => sameName(h, name)),
  ).sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
}
