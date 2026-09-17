import IconDivider from "../IconDivider";
import { ICONS } from "./icons";

// pacman · dot · ghost · cherry — Pac-Man + cherry from the Noun Project (CC BY
// 3.0); the dot is a plain circle we drew. Credit on /credits.
export default function PacmanDivider() {
  return <IconDivider icons={ICONS} decoy />;
}
