const STORAGE_KEY = 'civic-docs:report';
const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = MAC ? '⌘' : 'Ctrl+';

// execCommand('fontSize') only knows the legacy sizes 1–7; these are their point sizes.
const LEVEL_PT = [0, 7.5, 10, 12, 13.5, 18, 24, 36];

// Photos are scaled down before they go into the document so autosave stays small.
const IMAGE_MAX_SIDE = 1200;

const MENUS = {
  File: [['New report', 'new'], ['Print', 'print', `${MOD}P`], ['Reboot terminal', 'replay']],
  Edit: [['Undo', 'undo', `${MOD}Z`], ['Redo', 'redo', MAC ? '⇧⌘Z' : 'Ctrl+Y'], ['Select all', 'selectAll', `${MOD}A`]],
  View: [['Zoom in', 'zoomIn'], ['Zoom out', 'zoomOut'], ['Actual size', 'zoomReset']],
  Insert: [['Image…', 'image'], ['Today’s date', 'date'], ['Horizontal line', 'insertHorizontalRule'], ['Link…', 'createLink']],
  Format: [
    ['Bold', 'bold', `${MOD}B`],
    ['Italic', 'italic', `${MOD}I`],
    ['Underline', 'underline', `${MOD}U`],
    ['Clear formatting', 'removeFormat'],
  ],
  Tools: [['Word count', 'wordCount']],
  Help: [['Replay intro', 'replay'], ['About Civic Docs', 'about']],
};

/**
 * Wires up the Civic Docs editor: toolbar, menus, autosave to this browser and
 * a few toasts. `onCaret` receives the caret's screen rect as the user types.
 */
export function initEditor({ onReplay, onCaret }) {
  const doc = document.getElementById('doc');
  const title = document.getElementById('doc-title');
  const status = document.getElementById('doc-status');
  const toolbar = document.getElementById('doc-toolbar');
  const menubar = document.getElementById('doc-menu');
  const sizeOut = document.getElementById('doc-size');
  const zoomSelect = toolbar.querySelector('[data-cmd="zoom"]');
  const styleSelect = toolbar.querySelector('[data-cmd="formatBlock"]');
  const fontSelect = toolbar.querySelector('[data-cmd="fontName"]');
  const toggles = toolbar.querySelectorAll('button[aria-pressed]');
  const imageInput = document.getElementById('doc-image-input');

  restoreSaved();
  document.execCommand('styleWithCSS', false, true);
  // No drag-to-resize handles (Firefox): photos always stay at the medium size.
  document.execCommand('enableObjectResizing', false, false);

  // Toolbar controls steal focus, so remember the last selection inside the page and put it back.
  let savedRange = null;

  function restoreSelection() {
    doc.focus({ preventScroll: true });
    if (!savedRange) return;
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function exec(cmd, value = null) {
    restoreSelection();
    document.execCommand(cmd, false, value);
    changed();
    syncToolbar();
  }

  function currentPt() {
    const node = savedRange?.startContainer;
    const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const px = parseFloat(getComputedStyle(el && doc.contains(el) ? el : doc).fontSize);
    return Math.round(px * 0.75);
  }

  function stepSize(dir) {
    const pt = currentPt();
    const level = dir > 0
      ? LEVEL_PT.findIndex((p, i) => i > 0 && p > pt)
      : LEVEL_PT.findLastIndex((p, i) => i > 0 && p < pt);
    if (level > 0) exec('fontSize', String(level));
  }

  function setZoom(value) {
    zoomSelect.value = value;
    doc.style.zoom = value;
  }

  function stepZoom(dir) {
    const values = [...zoomSelect.options].map(o => o.value);
    const i = Math.min(values.length - 1, Math.max(0, values.indexOf(zoomSelect.value) + dir));
    setZoom(values[i]);
  }

  const actions = {
    print: () => print(),
    zoom: setZoom,
    zoomIn: () => stepZoom(1),
    zoomOut: () => stepZoom(-1),
    zoomReset: () => setZoom('1'),
    formatBlock: tag => exec('formatBlock', `<${tag}>`),
    sizeUp: () => stepSize(1),
    sizeDown: () => stepSize(-1),
    selectAll: () => exec('selectAll'),
    createLink() {
      const url = prompt('Link to', 'https://');
      if (url) exec('createLink', url);
    },
    image: () => imageInput.click(),
    date: () => exec('insertText',new Date().toLocaleDateString(undefined, { dateStyle: 'long' })),
    new() {
      if (!confirm('Start a blank report? The current text will be cleared.')) return;
      doc.innerHTML = '<p><br></p>';
      title.value = 'Untitled report';
      savedRange = null;
      changed();
      restoreSelection();
    },
    wordCount() {
      const text = doc.innerText.trim();
      const words = text ? text.split(/\s+/).length : 0;
      toast(`${words.toLocaleString()} words · ${text.length.toLocaleString()} characters`);
    },
    replay: onReplay,
    share: () => toast('Sharing is handled by the Bureau of Social Standing.'),
    about: () => toast('Civic Docs, issued by the Unified Civic Authority.'),
  };

  function run(cmd, value) {
    (actions[cmd] ?? (v => exec(cmd, v)))(value);
  }

  function syncToolbar() {
    for (const b of toggles) b.setAttribute('aria-pressed', String(document.queryCommandState(b.dataset.cmd)));
    const block = document.queryCommandValue('formatBlock').toLowerCase();
    styleSelect.value = ['h1', 'h2', 'h3'].includes(block) ? block : 'p';
    const font = document.queryCommandValue('fontName').split(',')[0].replace(/["']/g, '').trim();
    if ([...fontSelect.options].some(o => o.value === font)) fontSelect.value = font;
    sizeOut.value = currentPt();
  }

  function caretRect() {
    const range = savedRange;
    if (!range) return null;
    const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
    if (rect.width || rect.height) return rect;
    const el = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    return el.getBoundingClientRect?.() ?? null;
  }

  document.addEventListener('selectionchange', () => {
    const sel = getSelection();
    if (!sel.rangeCount || !doc.contains(sel.anchorNode)) return;
    savedRange = sel.getRangeAt(0).cloneRange();
    syncToolbar();
    const rect = caretRect();
    if (rect) onCaret?.(rect);
  });

  // Images: picked from the file manager, dropped or pasted

  async function insertImages(files, range = savedRange) {
    const images = [...files].filter(f => f.type.startsWith('image/'));
    if (!images.length) return;
    const html = [];
    for (const file of images) {
      try {
        const img = document.createElement('img');
        img.src = await shrinkImage(file);
        img.alt = file.name.replace(/\.[^.]+$/, '');
        html.push(img.outerHTML);
      } catch {
        toast(`Couldn’t read ${file.name}`);
      }
    }
    if (!html.length) return;
    savedRange = range ?? endOfDocument();
    exec('insertHTML', html.join(''));
  }

  function endOfDocument() {
    const range = document.createRange();
    range.selectNodeContents(doc);
    range.collapse(false);
    return range;
  }

  function rangeAtPoint(x, y) {
    const pos = document.caretPositionFromPoint?.(x, y);
    if (!pos) return document.caretRangeFromPoint?.(x, y) ?? null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    return range;
  }

  imageInput.addEventListener('change', () => {
    insertImages(imageInput.files);
    imageInput.value = '';
  });
  doc.addEventListener('dragover', e => {
    if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
  });
  doc.addEventListener('drop', e => {
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault();
    insertImages(e.dataTransfer.files, rangeAtPoint(e.clientX, e.clientY));
  });
  doc.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (!files.some(f => f.type.startsWith('image/'))) return;
    e.preventDefault();
    insertImages(files);
  });

  // Saving

  let saveTimer;

  function changed() {
    status.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
  }

  function save() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: title.value, html: doc.innerHTML }));
      status.textContent = 'Saved to this device';
    } catch (error) {
      status.textContent = error?.name === 'QuotaExceededError'
        ? 'Not saved: too many images for this device'
        : 'Not saved: storage unavailable';
    }
  }

  function restoreSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved?.html) return;
      doc.innerHTML = saved.html;
      title.value = saved.title || title.value;
    } catch {
      // Nothing saved, or storage is blocked: keep the default report.
    }
  }

  doc.addEventListener('input', changed);
  title.addEventListener('input', () => {
    document.title = `${title.value || 'Untitled report'} – Civic Docs`;
    changed();
  });
  title.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      restoreSelection();
    }
  });

  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
      toast('Saved to this device');
    }
  });

  // Toolbar

  toolbar.addEventListener('mousedown', e => {
    if (e.target.closest('button')) e.preventDefault();
  });
  toolbar.addEventListener('click', e => {
    const button = e.target.closest('button[data-cmd]');
    if (button) run(button.dataset.cmd);
  });
  toolbar.addEventListener('change', e => {
    const field = e.target.closest('[data-cmd]');
    if (!field) return;
    if (field.type === 'color') field.closest('.tb-swatch').style.setProperty('--swatch', field.value);
    run(field.dataset.cmd, field.value);
  });
  document.getElementById('doc-share').addEventListener('click', () => run('share'));

  // Menus

  const dropdown = document.createElement('div');
  dropdown.className = 'docs-dropdown';
  dropdown.setAttribute('role', 'menu');
  dropdown.hidden = true;
  document.body.append(dropdown);
  let openButton = null;

  function openMenu(button) {
    closeMenu();
    openButton = button;
    button.setAttribute('aria-expanded', 'true');
    dropdown.replaceChildren(...MENUS[button.textContent].map(([label, cmd, keys]) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      item.dataset.cmd = cmd;
      item.append(label);
      if (keys) item.append(Object.assign(document.createElement('kbd'), { textContent: keys }));
      return item;
    }));
    const box = button.getBoundingClientRect();
    dropdown.style.left = `${box.left}px`;
    dropdown.style.top = `${box.bottom + 4}px`;
    dropdown.hidden = false;
  }

  function closeMenu() {
    openButton?.setAttribute('aria-expanded', 'false');
    openButton = null;
    dropdown.hidden = true;
  }

  for (const button of menubar.children) {
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
  }
  menubar.addEventListener('mousedown', e => e.preventDefault());
  menubar.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    if (openButton === button) closeMenu();
    else openMenu(button);
  });
  menubar.addEventListener('pointerover', e => {
    const button = e.target.closest('button');
    if (openButton && button && button !== openButton) openMenu(button);
  });
  dropdown.addEventListener('mousedown', e => e.preventDefault());
  dropdown.addEventListener('click', e => {
    const item = e.target.closest('[data-cmd]');
    if (!item) return;
    closeMenu();
    run(item.dataset.cmd);
  });
  addEventListener('pointerdown', e => {
    if (openButton && !dropdown.contains(e.target) && !menubar.contains(e.target)) closeMenu();
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
  addEventListener('resize', closeMenu);

  // Toasts

  const toastEl = document.createElement('div');
  toastEl.className = 'docs-toast';
  toastEl.setAttribute('role', 'status');
  document.body.append(toastEl);
  let toastTimer;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), 2600);
  }

  return { doc };
}

/** Decodes an image file and returns it as a data URL no larger than IMAGE_MAX_SIDE on either side. */
async function shrinkImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    // Keep PNG for formats that may carry transparency; photos become JPEG.
    const keepsAlpha = /png|gif|webp|svg/.test(file.type);
    return canvas.toDataURL(keepsAlpha ? 'image/png' : 'image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
