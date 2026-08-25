export type Testimonial = {
  quote: string;
  name: string;
};

// Empty hides the section and drops its nav entry (see components/site/sections.ts).
// Repopulate to bring both back — the 2025 quotes are kept below.
export const TESTIMONIALS: readonly Testimonial[] = [];

// From Metagame 2025:
// {
//   quote:
//     '"By far the most fun I had was arriving on the first day and discovering the puzzle hunt stuff. As I explored the campus, I felt an amazing mixture of excitement and whimsy, in trying to discover all the secrets hidden about."',
//   name: "A person, in attendence",
// },
// {
//   quote:
//     '"Metagame is pretty good for people who like games. All games there are fun and enjoyable. I liked playing Ultimate Tic-Tac-Toe. That is all the things I have to say."',
//   name: "Vasili, Age 8",
// },
// {
//   quote:
//     '"Every person I interacted with on the team was amazing, there was so much enthusiasm and welcoming attitude, which really brought the conference to life."',
//   name: "Another",
// },
