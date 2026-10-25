// Draw only while something moves and the hero is on screen, at most ~60/s
// (the Canvas runs frameloop="never"; FrameDriver in Dice3D asks `wants`).
export const MIN_FRAME_MS = 1000 / 60;

export class RenderBudget {
  private _visible = true;
  private until = 0;
  private holds = 0;
  private kick: (() => void) | null = null;

  get visible() {
    return this._visible;
  }

  /** Keep drawing for `ms` from now (0 = just one frame). */
  wake(ms = 0) {
    this.until = Math.max(
      this.until,
      performance.now() + ms + 2 * MIN_FRAME_MS,
    );
    this.kick?.();
  }

  /** Draw until the returned release is called. */
  hold(): () => void {
    this.holds++;
    this.kick?.();
    return () => {
      this.holds--;
    };
  }

  setVisible(visible: boolean) {
    if (visible === this._visible) return;
    this._visible = visible;
    if (visible) this.wake(0);
  }

  wants(now: number) {
    return this._visible && (this.holds > 0 || now <= this.until);
  }

  /** The driver's "schedule a frame" hook; called on every wake/hold. */
  attach(kick: () => void) {
    this.kick = kick;
    kick();
    return () => {
      if (this.kick === kick) this.kick = null;
    };
  }
}
