import { createEye, ratingLabel } from './eye.js';
import { playIntro } from './intro.js';

const RATING = 412;

const boot = document.getElementById('boot');
const posterEye = createEye(document.getElementById('poster-eye'));
posterEye.label(ratingLabel(RATING), 'ID: SCANNING');

start();

async function start() {
  await playIntro(boot, RATING);
  boot.remove();
  document.body.classList.remove('is-booting');
}
