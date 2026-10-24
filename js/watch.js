import { clamp, ease, lerp } from './motion.js';

/**
 * Keeps an eye alive: it looks at the pointer (or whatever `aimAt` is given),
 * blinks now and then and, when idle, wanders off. Starts shut until `wake()`
 * unless `awake` is set.
 */
export function watch(eye, { idle = true, awake = false } = {}) {
  const { svg } = eye;
  const target = { x: 0, y: 0, near: 0 };
  let lastAim = -Infinity;
  let nextWander = 0;
  let nextBlink = performance.now() + 3000;
  let blinkStart = -Infinity;
  let wakeStart = awake ? -Infinity : Infinity;
  let last = performance.now();

  function aimAt(px, py) {
    const box = svg.getBoundingClientRect();
    const dx = px - (box.left + box.width / 2);
    const dy = py - (box.top + box.height / 2);
    target.x = clamp(dx / (innerWidth * 0.4), -1, 1);
    target.y = clamp(dy / (innerHeight * 0.4), -1, 1);
    target.near = 1 - clamp(Math.hypot(dx, dy) / 240);
    lastAim = performance.now();
  }

  const onPointer = e => aimAt(e.clientX, e.clientY);
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });

  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (idle && now - lastAim > 4000 && now > nextWander) {
      target.x = Math.random() * 1.6 - 0.8;
      target.y = Math.random() * 0.8 - 0.4;
      target.near = 0;
      nextWander = now + 900 + Math.random() * 2200;
    }
    if (idle && now > nextBlink) {
      blinkStart = now;
      nextBlink = now + 2200 + Math.random() * 4500;
    }

    const k = 1 - Math.exp(-dt * 14);
    const blink = (now - blinkStart) / 200;
    const lids = blink < 1 ? 1 - Math.sin(Math.PI * blink) : 1;
    const opened = ease.outBack(clamp((now - wakeStart) / 600));
    const s = eye.state;
    eye.set({
      gazeX: lerp(s.gazeX, target.x, k),
      gazeY: lerp(s.gazeY, target.y, k),
      pupil: lerp(s.pupil, 1 + target.near * 0.35, k * 0.5),
      open: Math.min(lids, opened),
    });
  };
  requestAnimationFrame(frame);

  return {
    aimAt,
    blink() {
      blinkStart = performance.now();
    },
    wake(delay = 0) {
      wakeStart = performance.now() + delay;
    },
  };
}
