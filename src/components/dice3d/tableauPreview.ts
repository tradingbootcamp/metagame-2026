import type * as THREE from "three";

// Live channel from the dev picker (DiceDevPanel) to the playback driver.
// `retcon` overrides the take's symmetries and is re-read every frame, so
// cycling an orientation re-poses the dice instantly instead of replaying the
// 2.5s roll; `hold` freezes playback on the take's last keyframe rather than
// running the beat + align tail, so the scattered tableau can be judged. Both
// stay inert outside the panel.
type Preview = { hold: boolean; retcon: THREE.Quaternion[] | null };

const preview: Preview = { hold: false, retcon: null };

export const tableauPreview = (): Readonly<Preview> => preview;

export function setTableauPreview(next: Partial<Preview>) {
  Object.assign(preview, next);
}
