import { createEye, ratingLabel } from './eye.js';
import { playIntro } from './intro.js';
import { Timeline, clamp, ease, lerp } from './motion.js';

const RATING = 412;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The intro reveals from the eye, so always start a (re)load at the top.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const boot = document.getElementById('boot');
const app = document.getElementById('app');
const posterEye = createEye(document.getElementById('poster-eye'));
posterEye.set({ open: 0 });
posterEye.label(ratingLabel(0), 'ID: SCANNING');

document.getElementById('replay').addEventListener('click', () => {
  scrollTo(0, 0);
  location.reload();
});

start();

async function start() {
  if (reducedMotion) {
    boot.remove();
    document.body.classList.remove('is-booting');
    document.body.classList.add('is-live');
    posterEye.set({ open: 1 });
    posterEye.label(ratingLabel(RATING));
    trackEye(posterEye, { idle: false });
  } else {
    await playIntro(boot, RATING);
    await openApp();
  }
  watchReveals();
}

// The app opens out of the poster eye's pupil: a circle grows from it until the whole screen is uncovered.
async function openApp() {
  const eyeBox = posterEye.svg.getBoundingClientRect();
  const x = eyeBox.left + eyeBox.width / 2;
  const y = clamp(eyeBox.top + eyeBox.height / 2, 0, innerHeight);
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const at = `${x}px ${y + scrollY}px`;
  const timing = { duration: 1000, easing: 'cubic-bezier(0.65, 0, 0.25, 1)' };
  const ring = document.querySelector('.reveal-ring');

  ring.style.setProperty('--x', `${x}px`);
  ring.style.setProperty('--y', `${y}px`);
  ring.style.setProperty('--d', `${radius * 2}px`);
  ring.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], timing);
  ring.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], timing.duration);
  const opening = app.animate([
    { clipPath: `circle(0px at ${at})` },
    { clipPath: `circle(${radius}px at ${at})` },
  ], timing);

  boot.classList.add('is-under');
  document.body.classList.remove('is-booting');
  document.body.classList.add('is-live');
  wakePosterEye().then(() => trackEye(posterEye));

  await opening.finished;
  boot.remove();
}

function wakePosterEye() {
  const tl = new Timeline();
  return tl.wait(450).then(() => Promise.all([
    tl.tween(700, p => posterEye.set({ open: p }), ease.outBack),
    tl.tween(1400, p => posterEye.label(ratingLabel(RATING * p)), ease.outCubic),
  ]));
}

/**
 * Keeps the eye alive: it follows the pointer (or the last touch), wanders and
 * blinks when left alone, dilates as the pointer comes close and flinches when tapped.
 */
function trackEye(eye, { idle = true } = {}) {
  const { svg } = eye;
  const target = { x: 0, y: 0, near: 0 };
  let lastAim = -Infinity;
  let touch = true;
  let nextWander = 0;
  let nextBlink = performance.now() + 2500;
  let blinkStart = -Infinity;
  let onScreen = true;
  let last = performance.now();

  const aim = e => {
    const box = svg.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    target.x = clamp(dx / (innerWidth * 0.4), -1, 1);
    target.y = clamp(dy / (innerHeight * 0.4), -1, 1);
    target.near = 1 - clamp(Math.hypot(dx, dy) / (box.width * 0.6));
    touch = e.pointerType !== 'mouse';
    lastAim = performance.now();
  };
  addEventListener('pointermove', aim, { passive: true });
  addEventListener('pointerdown', aim, { passive: true });

  let relabel;
  svg.addEventListener('click', () => {
    blinkStart = performance.now();
    eye.label(null, 'ID: LOGGED');
    clearTimeout(relabel);
    relabel = setTimeout(() => eye.label(null, 'ID: SCANNING'), 1600);
  });

  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(svg);

  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!onScreen) return;

    // A mouse keeps the eye's attention; a finger or no input lets it wander off after a while.
    const unattended = touch && now - lastAim > 3000;
    if (idle && unattended && now > nextWander) {
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
    const breath = idle ? Math.sin(now / 900) * 0.03 : 0;
    const s = eye.state;
    eye.set({
      gazeX: lerp(s.gazeX, target.x, k),
      gazeY: lerp(s.gazeY, target.y, k),
      pupil: lerp(s.pupil, 1 + target.near * 0.35 + breath, k * 0.5),
      open: blink < 1 ? 1 - Math.sin(Math.PI * blink) : 1,
    });
  };
  requestAnimationFrame(frame);
}

// Rows of the rewards table slide in as they scroll into view and count up their values.
function watchReveals() {
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
      const value = entry.target.querySelector('[data-count]');
      if (value) countUp(value);
    }
  }, { threshold: 0.2 });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
}

function countUp(el) {
  if (reducedMotion) return;
  const to = Number(el.dataset.count);
  new Timeline().tween(900, p => { el.textContent = `+${Math.round(to * p)} rating`; }, ease.outCubic);
}
