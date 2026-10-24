import { createEye, ratingLabel } from './eye.js';
import { Timeline, clamp, ease, lerp, spring } from './motion.js';

/**
 * Boot sequence, like an app launching: the eye drops in oversized and settles,
 * wakes up and scans the viewer. Tap, click or any key skips it.
 */
export async function playIntro(boot, rating) {
  const stage = boot.querySelector('.boot__stage');
  const line = boot.querySelector('.boot__line');
  const bar = boot.querySelector('.boot__bar span');
  const eye = createEye(boot.querySelector('svg'));
  const tl = new Timeline();

  const skip = () => {
    if (tl.cancelled) return;
    boot.classList.add('is-skipping');
    tl.cancel();
  };
  boot.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip);

  const status = text => { line.textContent = text; };
  const progress = p => { bar.style.transform = `scaleX(${p})`; };
  const look = (x, y, delay) => tl.wait(delay).then(() => {
    const { gazeX, gazeY } = eye.state;
    return tl.tween(160, p => eye.set({ gazeX: lerp(gazeX, x, p), gazeY: lerp(gazeY, y, p) }), ease.outCubic);
  });
  const blink = () => tl.tween(220, (_, t) => eye.set({ open: 1 - Math.sin(Math.PI * t) }));

  eye.set({ open: 0, pupil: 1.9, spin: -140 });
  eye.label(ratingLabel(0), 'ID:');

  // 1. Arrive oversized and blurred, then settle into place on a spring.
  // 2. Halfway through, the lids open while the pupil contracts and the iris winds into focus.
  status('Establishing citizen link');
  await Promise.all([
    tl.tween(1700, (p, t) => {
      stage.style.opacity = clamp(t * 4);
      stage.style.filter = `blur(${(1 - clamp(t * 2.5)) * 14}px)`;
      stage.style.transform = `scale(${lerp(1.9, 1, p)}) rotate(${lerp(-8, 0, p)}deg)`;
      progress(t * 0.3);
    }, spring(1700, { stiffness: 50, damping: 7 })),
    tl.wait(850).then(() => Promise.all([
      tl.tween(650, p => eye.set({ open: p }), ease.outBack),
      tl.tween(1300, p => eye.set({ pupil: lerp(1.9, 1, p), spin: lerp(-140, 0, p) }),
        spring(1300, { stiffness: 140, damping: 10 })),
    ])),
  ]);
  stage.style.filter = '';

  // 3. Scan the viewer while darting the gaze around, then look straight at them.
  status('Scanning citizen');
  await Promise.all([
    tl.tween(1400, p => eye.set({ scan: p }), ease.inOutCubic),
    tl.tween(1400, (p, t) => {
      eye.label(ratingLabel(rating * p), `ID: ${'SCANNING'.slice(0, Math.ceil(t * 12))}`);
      progress(0.3 + t * 0.5);
    }, ease.outCubic),
    look(-0.8, 0.2, 100),
    look(0.75, -0.15, 550),
    look(0, 0, 1000),
  ]);
  eye.set({ scan: -1 });

  // 4. Lock on.
  status('Citizen identified');
  progress(1);
  await blink();
  await tl.wait(350);

  boot.removeEventListener('pointerdown', skip);
  window.removeEventListener('keydown', skip);
}
