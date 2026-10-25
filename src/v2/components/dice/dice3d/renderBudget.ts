// Decides when the dice canvas draws. The Canvas runs frameloop="never" and
// FrameDriver (Dice3D) asks this before each frame: draw only while something
// is moving (a hold, or a timed wake), only while the hero is on screen, and
// never more than ~60 times a second. Without it the default loop redraws an
// idle scene at the display's refresh rate for the life of the page, which on
// a 144 Hz monitor — or Chrome's software WebGL — pegs a core. META-4558.
export class RenderBudget {
  visible = true;
  /** Draw every frame until this performance.now() timestamp. */
  until = 0;
  /** Draw at least one more frame, whenever the throttle next allows. */
  pending = false;
  /** Open-ended motion (the roll-in); draw while any hold is open. */
  holds = 0;
  private kick: (() => void) | null = null;

  /** Keep drawing for `ms` from now (0 = just one frame). */
  wake(ms = 0) {
    this.pending = true;
    this.until = Math.max(this.until, performance.now() + ms);
    this.kick?.();
  }

  /** Draw until the returned release is called. */
  hold(): () => void {
    this.holds++;
    this.kick?.();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds--;
    };
  }

  setVisible(visible: boolean) {
    if (visible === this.visible) return;
    this.visible = visible;
    // repaint on re-entry: the resting pose may have changed while hidden
    if (visible) this.wake(0);
  }

  wants(now: number) {
    return (
      this.visible && (this.holds > 0 || this.pending || now <= this.until)
    );
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
