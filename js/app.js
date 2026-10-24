import { initEditor } from './editor.js';
import { createEye } from './eye.js';
import { playIntro } from './intro.js';
import { watch } from './watch.js';

const RATING = 412;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The intro reveals from the middle of the screen, so always start a (re)load at the top.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const boot = document.getElementById('boot');
const app = document.getElementById('app');

// The viewer's avatar is the eye itself, following the pointer and the text caret.
const watcher = watch(createEye(document.getElementById('avatar-eye')), {
  idle: !reducedMotion,
  awake: reducedMotion,
});

const { doc } = initEditor({
  onReplay() {
    scrollTo(0, 0);
    location.reload();
  },
  onCaret(rect) {
    watcher.aimAt(rect.left, rect.top + rect.height / 2);
  },
});

start();

async function start() {
  if (reducedMotion) {
    boot.remove();
    document.body.classList.remove('is-booting');
    document.body.classList.add('is-live');
  } else {
    await playIntro(boot, RATING);
    await openApp();
  }
}

// The app opens out of the pupil: a circle grows from the centre of the screen until it uncovers everything.
async function openApp() {
  const x = innerWidth / 2;
  const y = innerHeight / 2;
  const radius = Math.hypot(x, y);
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
  loadDocument();
  watcher.wake(1300);

  await opening.finished;
  boot.remove();
}

// Once the page has slid up, its blocks appear one after another as if the document were loading.
function loadDocument() {
  [...doc.children].slice(0, 20).forEach((block, i) => {
    block.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 500, delay: 800 + i * 60, easing: 'ease-out', fill: 'backwards' },
    );
  });
}
