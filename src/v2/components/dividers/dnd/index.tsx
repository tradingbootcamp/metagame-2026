import IconDivider from "../IconDivider";
import { ICONS } from "./icons";

// sword · chest · dragon · wall — the hero puzzle's D&D row.
export default function DndDivider() {
  return <IconDivider icons={ICONS} game="dnd" />;
}
