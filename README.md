# See It. Report It.

An app-launch animation for the fictional *Unified Civic Authority*, built as a static
site with plain HTML, CSS and JavaScript modules: no build step.

**Opening sequence.** A giant eye drops in, settles on a spring and wakes up. It scans
you, then rushes toward you until its pupil fills the screen. Tap, click or press any key
to skip.

**Civic Docs.** The eye opens a docs-style editor holding the citizen report. You can
edit the text and use the formatting toolbar: styles, fonts, sizes, colours, alignment
and lists. Photos come from the file manager (or drag and drop, or paste) and are
always shown at a medium size. The File, Edit, View, Insert, Format, Tools and Help menus work, and edits
autosave to the browser. The viewer's avatar is a tiny live eye that follows your pointer
and text caret. Visitors who prefer reduced motion skip the intro.

## Files

| Path            | What it does                                                    |
| --------------- | --------------------------------------------------------------- |
| `index.html`    | Boot overlay and the Civic Docs markup                          |
| `css/style.css` | Intro, reveal, editor layout and opening animations             |
| `js/eye.js`     | Builds the eye as SVG and exposes lids, gaze, pupil, scan state |
| `js/motion.js`  | Easing, spring and a small cancellable rAF timeline             |
| `js/intro.js`   | The boot sequence (`INTRO_PACE` sets its speed)                 |
| `js/editor.js`  | Toolbar, menus, autosave and toasts                             |
| `js/watch.js`   | Keeps an eye alive: gaze, blinks, idle wandering                |
| `js/app.js`     | Runs the intro, opens the app and wires everything together     |

## Run locally

ES modules need to be served over HTTP:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

The site is served as-is from the `gh-pages` branch (root folder):

```sh
git push origin main:gh-pages
```

In the repository settings, under **Pages**, set the source to *Deploy from a branch*,
`gh-pages`, `/ (root)`. The site is published at
`https://<user>.github.io/48HoursAnimation/`.
