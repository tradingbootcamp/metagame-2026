// Each featured speaker's account: the `user.id` whose hosted sessions their
// homepage card lists (public already, at /u/<id>), and their name. SPEAKERS
// (speakers.ts) spreads these in; the dev seed (scripts/db-seed.mjs) creates
// an account for each, so it imports this file untranspiled: keep it to plain
// data. TODO ids are placeholders until the prod id is filled in.
export const SPEAKER_ACCOUNTS = {
  chrisGrace: { name: "Chris Grace", userId: "TODO-chris-grace" },
  caroMurphy: { name: "Caro Murphy", userId: "TODO-caro-murphy" },
  peihGeeLaw: { name: "Peih-Gee Law", userId: "TODO-peih-gee-law" },
  tommyHonton: { name: "Tommy Honton", userId: "TODO-tommy-honton" },
  lexiKohanski: { name: "Lexi Kohanski", userId: "TODO-lexi-kohanski" },
  amySchneider: { name: "Amy Schneider", userId: "TODO-amy-schneider" },
  andrewNathenson: {
    name: "Andrew Nathenson",
    userId: "TODO-andrew-nathenson",
  },
  davidTurner: { name: "David Turner", userId: "TODO-david-turner" },
  elliFuredy: { name: "Elli Furedy", userId: "TODO-elli-furedy" },
  raphDAmico: { name: "Raph D’Amico", userId: "TODO-raph-damico" },
  randyLubin: { name: "Randy Lubin", userId: "TODO-randy-lubin" },
  jamieWahls: { name: "Jamie Wahls", userId: "TODO-jamie-wahls" },
  marleeHonton: { name: "Marlee Honton", userId: "TODO-marlee-honton" },
  aemiliaDixon: { name: "Aemilia Dixon", userId: "TODO-aemilia-dixon" },
  irisLemony: { name: "iris lemony", userId: "TODO-iris-lemony" },
  spencerBeebe: { name: "Spencer Beebe", userId: "TODO-spencer-beebe" },
  chrisKay: { name: "Chris Kay", userId: "TODO-chris-kay" },
  rickiHeicklen: { name: "Ricki Heicklen", userId: "TODO-ricki-heicklen" },
};
