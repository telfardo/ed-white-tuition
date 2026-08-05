# Ed White Tuition

A plain static site — no build step, no dependencies. Open `index.html` in a
browser to preview it locally.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Home page. Booking form sits in the hero, where the old slogan was. |
| `about.html` | Ed's full bio in his own words — music, then physics/maths/philosophy. |
| `playing.html` | The violin page — on stage, the six-year-old, the seventy-five-year-old. |
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

It doesn't need a backend. Filling it in writes a tidy message, shows it to the
sender for review, then opens WhatsApp to `447710241930` with the text ready to
go — same approach as the old site, so nothing changes at Ed's end. There's also
a "copy message" button for anyone who'd rather paste it elsewhere.

To change the number, edit `WHATSAPP_NUMBER` at the top of `script.js` and the
`wa.me` links in both HTML files.

## Publishing

Drag this folder onto [app.netlify.com/drop](https://app.netlify.com/drop), or
point the existing Netlify site at it — no build command, publish directory is
the folder root.

## Tweaking the look

Everything visual lives in the `:root` block at the top of `styles.css`:

- `--accent` — the warm terracotta used for buttons and highlights
- `--paper` / `--paper-warm` — the two background tones
- `--serif` / `--sans` — heading and body fonts

The fonts are Source Serif 4 and Inter, loaded from Google Fonts in the `<head>`
of each page.
