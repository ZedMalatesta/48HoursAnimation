# See It. Report It.

An animated propaganda poster for the fictional *Unified Civic Authority*, built as a
static site with plain HTML, CSS and JavaScript modules: no build step.

**Opening sequence.** The site launches like an app. A giant eye drops in, settles on a
spring and wakes up. It scans you, then rushes toward you until its pupil fills the
screen, and the poster opens out of the eye. Tap, click or press any key to skip.

**On the poster.** The eye follows your cursor or finger, wanders and blinks when left
alone, and flinches when tapped. Visitors who prefer reduced motion skip the intro.

## Files

| Path            | What it does                                                    |
| --------------- | --------------------------------------------------------------- |
| `index.html`    | Poster markup and the boot overlay                              |
| `css/style.css` | Layout, sunburst, intro and entrance animations                 |
| `js/eye.js`     | Builds the eye as SVG and exposes lids, gaze, pupil, scan state |
| `js/motion.js`  | Easing, spring and a small cancellable rAF timeline             |
| `js/intro.js`   | The boot sequence                                               |
| `js/app.js`     | Opening the app, the live eye and scroll reveals                |

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
