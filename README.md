# Ed White Tuition

Live: **https://telfardo.github.io/ed-white-tuition/**

A plain static site — no build step, no dependencies. Open `index.html` in a
browser to preview it locally.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Landing page — all about booking. Form sits in the hero, where the old slogan was. |
| `music.html` | Music skills — violin, drums &amp; percussion, theory, on stage, students. |
| `academic.html` | Academic info — physics, maths, philosophy, and how those lessons run. |
| `about.html` | Ed's full bio in his own words. |
| `gallery.html` | Photo grid: gigs, the teaching room, lessons. |
| `styles.css` | All styling. Colours and fonts are variables at the top of the file. |
| `script.js` | Builds the WhatsApp message from the form and shows it for review. |
| `images/` | Photos go here — see `images/README.txt` for the exact filenames. |

## Photos

**The images won't show until the files exist.** Save each photo into `images/`
with the exact filename listed in `images/README.txt`. Any slot without its file
shows a striped "add this photo" panel rather than a broken image, so the layout
never falls apart mid-edit.

## The booking form

No backend. Filling it in writes a tidy message, shows it for review, then
offers three ways out: **email** to `edchriswhite@gmail.com`, **WhatsApp** to
`447710241930`, or copy-to-clipboard.

The WhatsApp link deliberately opens in the *same* tab. Opening `wa.me` in a new
tab breaks the handoff to the WhatsApp app on iOS and dumps people on the App
Store download page instead — that was the original bug.

`Where?` behaves differently depending on the answer, because Ed moves between
England and Bilbao:

- **Online** → asks for a city/timezone, pre-filled from the browser
- **In person** → asks where they're based, and explains the England/Bilbao split
- **Either** → asks both

To change the contact details, edit `WHATSAPP_NUMBER` and `EMAIL_ADDRESS` at the
top of `script.js`, plus the `wa.me` and `mailto:` links in the HTML.

## Editing the site without touching code

Go to `/admin.html`, sign in (`admin` / `password`), then open any page. A bar
appears along the bottom with three modes:

- **Text** — click any heading or paragraph and type over it
- **Photos** — click a photo to change its size, shape, and which part of it shows
- **Sections** — move whole blocks up and down, or hide them

Changes are saved in that browser straight away, but **they are only live for
that one person** until they're published. To publish them:

1. Press **Export** in the editing bar — this downloads a `content.js`
2. Replace the `content.js` in this folder with the downloaded one
3. Commit and push

`content.js` holds nothing but the overrides, so the original wording stays in
the HTML and can always be recovered by emptying that file.

### About the password

It is checked in the browser, so anyone who views the page source can read it.
It keeps a passer-by out of the editor; it is not real security, and there is
nothing behind it that could be damaged permanently — the worst case is someone
exporting a file nobody commits. Treat `/admin.html` as a convenience, and take
it out when it's no longer needed by deleting `admin.html`, `admin.js`,
`admin.css` and the two `<script>`/`<link>` lines that reference them.

## Publishing

Currently on **GitHub Pages**, served from `main` at the repository root. Any
push to `main` redeploys it within a minute or two:

```
git add -A
git commit -m "Update copy"
git push
```

`.nojekyll` is there to stop GitHub running the files through Jekyll.

Alternatively, drag this folder onto [app.netlify.com/drop](https://app.netlify.com/drop)
— no build command, publish directory is the folder root.

## Tweaking the look

Everything visual lives in the `:root` block at the top of `styles.css`:

- `--accent` — the warm terracotta used for buttons and highlights
- `--paper` / `--paper-warm` — the two background tones
- `--serif` / `--sans` — heading and body fonts

The fonts are Source Serif 4 and Inter, loaded from Google Fonts in the `<head>`
of each page.
