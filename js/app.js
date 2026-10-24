import { createEye, ratingLabel } from './eye.js';
import { playIntro } from './intro.js';
import { Timeline, clamp, ease } from './motion.js';

const RATING = 412;

const boot = document.getElementById('boot');
const app = document.getElementById('app');
const posterEye = createEye(document.getElementById('poster-eye'));
posterEye.set({ open: 0 });
posterEye.label(ratingLabel(0), 'ID: SCANNING');

start();

async function start() {
  await playIntro(boot, RATING);
  await openApp();
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
  wakePosterEye();

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
