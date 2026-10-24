import { createEye, ratingLabel } from './eye.js';

const RATING = 412;

const posterEye = createEye(document.getElementById('poster-eye'));
posterEye.label(ratingLabel(RATING), 'ID: SCANNING');
