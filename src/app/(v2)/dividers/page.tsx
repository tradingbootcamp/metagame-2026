import { notFound } from "next/navigation";
import ContentPage from "@/v2/components/ContentPage";
import BloodOnTheClocktowerDivider from "@/v2/components/dividers/blood-on-the-clocktower";
import CardSuitsDivider from "@/v2/components/dividers/card-suits";
import CatanDivider from "@/v2/components/dividers/catan";
import ChessDivider from "@/v2/components/dividers/chess";
import DiceDivider from "@/v2/components/dividers/dice";
import DominoesDivider from "@/v2/components/dividers/dominoes";
import DndDivider from "@/v2/components/dividers/dnd";
import GoDivider from "@/v2/components/dividers/go";
import JigsawDivider from "@/v2/components/dividers/jigsaw";
import MonopolyDivider from "@/v2/components/dividers/monopoly";
import PacmanDivider from "@/v2/components/dividers/pacman";
import ScrabbleDivider from "@/v2/components/dividers/scrabble";
import SetCardDivider from "@/v2/components/dividers/set-cards";
import TetrisDivider from "@/v2/components/dividers/tetris";

// Dev-only gallery of every divider, mounted or not, so new sets can be
// eyeballed without wiring them into the one-pager. 404s in production.
const DIVIDERS: [string, React.ComponentType][] = [
  ["chess", ChessDivider],
  ["card-suits", CardSuitsDivider],
  ["dice", DiceDivider],
  ["dnd", DndDivider],
  ["blood-on-the-clocktower", BloodOnTheClocktowerDivider],
  ["pacman", PacmanDivider],
  ["set-cards", SetCardDivider],
  ["catan", CatanDivider],
  ["monopoly", MonopolyDivider],
  ["go", GoDivider],
  ["dominoes", DominoesDivider],
  ["jigsaw", JigsawDivider],
  ["tetris", TetrisDivider],
  ["scrabble", ScrabbleDivider],
];

export default function DividersPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ContentPage eyebrow="Dev only" title="Dividers">
      {DIVIDERS.map(([name, Divider]) => (
        <section key={name}>
          <p className="font-mono text-xs text-ink/50">{name}</p>
          <Divider />
        </section>
      ))}
    </ContentPage>
  );
}
