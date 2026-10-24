export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const ease = {
  linear: t => t,
  outCubic: t => 1 - (1 - t) ** 3,
  inOutCubic: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
};

/** Underdamped spring response sampled over `duration` ms, as a 0..1 easing that overshoots and settles. */
export function spring(duration, { stiffness = 120, damping = 12, mass = 1 } = {}) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return t => {
    if (t >= 1) return 1;
    const s = (t * duration) / 1000;
    return 1 - Math.exp(-zeta * w0 * s) * (Math.cos(wd * s) + ((zeta * w0) / wd) * Math.sin(wd * s));
  };
}

/** rAF tweens that can be cancelled together; cancelling fast-forwards every tween to its end state. */
export class Timeline {
  cancelled = false;

  cancel() {
    this.cancelled = true;
  }

  tween(duration, update, easing = ease.linear) {
    return new Promise(resolve => {
      const start = performance.now();
      const frame = now => {
        const t = this.cancelled ? 1 : clamp((now - start) / duration);
        update(easing(t), t);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  wait(ms) {
    return this.tween(ms, () => {});
  }
}
