import { clamp } from './motion.js';

const NS = 'http://www.w3.org/2000/svg';

// Geometry in viewBox units: an almond 780 wide, centred on (CX, CY).
const CX = 400;
const CY = 170;
const HALF_W = 390;
const LID = 336; // control-point lift that puts the lid apex at y = 2
const VIEWBOX = '-4 -66 808 474';

let uid = 0;

export const ratingLabel = n => `RATING: ${String(Math.round(n)).padStart(3, '0')}`;

function node(tag, attrs, parent) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.appendChild(el);
  return el;
}

// open = 1 is the full almond, open = 0 collapses both lids into a line.
function almond(open) {
  const lift = LID * open;
  const l = CX - HALF_W;
  const r = CX + HALF_W;
  return `M${l} ${CY}Q${CX} ${CY - lift} ${r} ${CY}Q${CX} ${CY + lift} ${l} ${CY}Z`;
}

/**
 * Builds the eye inside `svg` and returns a handle to drive it.
 * State: open (0..1), gazeX/gazeY (-1..1), pupil (scale), spin (deg), scan (0..1, <0 hides).
 */
export function createEye(svg) {
  const id = `eye${++uid}`;
  svg.setAttribute('viewBox', VIEWBOX);
  svg.replaceChildren();

  const defs = node('defs', {}, svg);
  const clip = node('path', {}, node('clipPath', { id: `${id}-clip` }, defs));

  node('line', { class: 'eye__tick', x1: CX, y1: -59, x2: CX, y2: -8 }, svg);
  node('line', { class: 'eye__tick', x1: CX, y1: 348, x2: CX, y2: 401 }, svg);

  const lid = node('path', { class: 'eye__lid' }, svg);
  const inside = node('g', { 'clip-path': `url(#${id}-clip)` }, svg);

  const marks = node('g', {}, inside);
  node('line', { class: 'eye__tick eye__tick--h', x1: 170, y1: CY, x2: 222, y2: CY }, marks);
  node('line', { class: 'eye__tick eye__tick--h', x1: 578, y1: CY, x2: 630, y2: CY }, marks);
  const left = node('text', { class: 'eye__label', x: 57, y: CY }, marks);
  const right = node('text', { class: 'eye__label', x: 752, y: CY, 'text-anchor': 'end' }, marks);

  const iris = node('g', {}, inside);
  node('circle', { class: 'eye__ring', r: 162 }, iris);
  node('circle', { class: 'eye__iris', r: 138 }, iris);
  node('circle', { class: 'eye__iris-core', r: 110 }, iris);

  const fibres = node('g', { class: 'eye__fibres' }, iris);
  const count = 96;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const inner = i % 2 ? 58 : 50;
    const outer = i % 3 ? 136 : 126;
    const c = Math.cos(a);
    const s = Math.sin(a);
    node('line', {
      x1: (c * inner).toFixed(2),
      y1: (s * inner).toFixed(2),
      x2: (c * outer).toFixed(2),
      y2: (s * outer).toFixed(2),
    }, fibres);
  }

  const pupil = node('circle', { class: 'eye__pupil', r: 52 }, iris);
  const glint = node('circle', { class: 'eye__glint', cx: -17, cy: -17, r: 10 }, iris);

  const scan = node('g', { class: 'eye__scan' }, inside);
  node('rect', { class: 'eye__scan-glow', x: CX - HALF_W, y: -16, width: HALF_W * 2, height: 32 }, scan);
  node('rect', { x: CX - HALF_W, y: -1.5, width: HALF_W * 2, height: 3 }, scan);

  const outline = node('path', { class: 'eye__outline' }, svg);

  const state = { open: 1, gazeX: 0, gazeY: 0, pupil: 1, spin: 0, scan: -1 };

  function render() {
    const d = almond(state.open);
    lid.setAttribute('d', d);
    clip.setAttribute('d', d);
    outline.setAttribute('d', d);
    iris.setAttribute('transform', `translate(${CX + state.gazeX * 72} ${CY + state.gazeY * 18})`);
    fibres.setAttribute('transform', `rotate(${state.spin})`);
    pupil.setAttribute('r', 52 * state.pupil);
    glint.style.opacity = clamp((1.6 - state.pupil) / 0.4);
    scan.style.display = state.scan < 0 ? 'none' : '';
    scan.setAttribute('transform', `translate(0 ${CY - 168 + state.scan * 336})`);
  }

  render();

  return {
    svg,
    get state() {
      return { ...state };
    },
    set(patch) {
      Object.assign(state, patch);
      render();
    },
    label(leftText, rightText) {
      if (leftText != null) left.textContent = leftText;
      if (rightText != null) right.textContent = rightText;
    },
  };
}
