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

Go to `/admin` and sign in with Google. There is an email and password form
behind a link underneath, kept as a way in if Google ever stops working.

Then open any page. A bar appears along the bottom with three modes:

- **Text** — click any heading or paragraph and type over it. Empty one
  completely and it removes itself rather than leaving a gap; or point at any
  block and click the × in its corner.
- **Photos** — change a photo's size, shape and framing, or upload a new one
- **Sections** — move whole blocks up and down, hide them, delete them, or
  add a new paragraph with **+ Text**

Changes are held in your own browser as you work. Press **Publish** and they go
live for everyone straight away. Nothing needs sending on, and nobody has to
commit anything.

Two ways back:

- **Discard my edits** — throws away anything not yet published
- **Reset page** — puts the page you are on back to the original wording,
  undoing published changes too, for everyone

Neither can destroy anything permanently: the original text lives in the HTML
files, not in the database. Published edits have no version history though, so
Reset page cannot itself be undone.

Deleting hides rather than removes. Text overrides are keyed by position —
`page|section|tag|index` — so taking an element out of the document would
renumber its later siblings and rebind their saved text to the wrong element.
Blocks Ed adds are stored as records with their own ids for the same reason,
and are appended after everything already in the section.

### Who can edit

Sign-in is Supabase Auth, and writing is limited to the addresses listed in the
`editors` table in the database. Being signed in is not enough on its own:
Supabase allows public email signup by default, so without that list a stranger
could register and edit the site. To add or remove an editor, change that table.

Accounts are created in the Supabase dashboard under **Authentication → Users**.
Signing in with Google for the first time counts as a signup, so **Allow new
users to sign up** has to stay on. That is safe because the `editors` table, not
the signup setting, is what grants the ability to change anything — a stranger
who registers can sign in and gets refused the moment they try to save.

Google sign-in needs three things to line up, and all three are outside this
repository:

- an OAuth client in Google Cloud Console, whose authorised redirect URI is
  `https://mmcghrsbugsakxhpehvg.supabase.co/auth/v1/callback`
- that client's ID and secret in Supabase under **Authentication → Providers**
- the site on Supabase's redirect allowlist under **Authentication → URL
  Configuration**, as `https://edtutors.telfardo.com/**`, plus a **Site URL** of
  `https://edtutors.telfardo.com`

If the Site URL is wrong, signing in appears to work and then lands on
`localhost:3000`, which is Supabase's default.

### Where the content lives

Supabase project **Ed White Tuition** (`mmcghrsbugsakxhpehvg`, London). One row
in `site_content` holds every override as JSON; uploaded photos go to the
`site-images` storage bucket.

The `window.EDW_SAVED` block at the top of `content.js` is a fallback, not the
source of truth. It is applied instantly so the page never flashes, then the
live content arrives and replaces it. If Supabase is ever unreachable the site
falls back to that, and to the original wording in the HTML underneath.

The API key in `content.js` is the publishable key and is meant to be public —
it grants read access and nothing else. Row-level security is what stops writes.

## Publishing

Live at **https://edtutors.telfardo.com**, served by **Netlify** from `main`.
Any push redeploys it within a minute or two:

```
git add -A
git commit -m "Update copy"
git push
```

That redeploys the *code* only. Ed's content edits do not go through git at
all any more — they are live the moment he presses Publish.

### There is a second copy

GitHub Pages is also still switched on and serving this same repository at
https://telfardo.github.io/ed-white-tuition/. It is a full duplicate of the
site at a different address.

It is not harmful — both copies read their content from the same Supabase row,
so they show the same thing — but two public copies of the same site split
search rankings between them, and it is one more URL that can be shared by
mistake and then go stale in someone's bookmarks.

To switch it off: repository **Settings → Pages → Source → None**.

`.nojekyll` exists for that Pages copy, to stop GitHub running the files
through Jekyll. It can go at the same time.

## Tweaking the look

Everything visual lives in the `:root` block at the top of `styles.css`:

- `--accent` — the warm terracotta used for buttons and highlights
- `--paper` / `--paper-warm` — the two background tones
- `--serif` / `--sans` — heading and body fonts

The fonts are Source Serif 4 and Inter, loaded from Google Fonts in the `<head>`
of each page.
