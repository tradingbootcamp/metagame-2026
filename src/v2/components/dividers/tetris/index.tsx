import IconDivider from "../IconDivider";
import { ICONS } from "./icons";

// I · O · T · L tetrominoes, drawn in icons.ts. Not a puzzle row (no library image).
export default function TetrisDivider() {
  return <IconDivider icons={ICONS} />;
}
