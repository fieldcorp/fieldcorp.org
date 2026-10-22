# field corp — fieldcorp.org

Static site: plain HTML/CSS/JS, no build step. Hosted on GitHub Pages at https://fieldcorp.org.

```
content/          editable content (JSON) — edited with Pages CMS
  site.json         tagline, about, quote, contact email
  branches.json     one entry per branch: plots, sections, typewriter words
  hub.json          vending machine objects (first 9, A1–C3)
  timelapse.json    Studio time-of-day photos
images/           uploaded photos (branches/, hub/, timelapse/)
.pages.yml        Pages CMS config: which fields the editor shows
index.html        layout + templates for the interactive pieces
styles.css        look & feel — brand tokens at the top in :root
main.js           loads content/ and runs the interactions
assets/           logo + favicon
CNAME             custom domain
```

## Editing content (no code)

1. Go to https://app.pagescms.org and sign in with GitHub as **fieldcorp**.
2. Open **fieldcorp/fieldcorp.org** (branch `main`).
3. Edit Branches, Hub objects, Studio timelapse or Site text, then **Save**.

Each save is a commit to `main`; the site updates in about a minute.

- **New branch:** Branches → add an entry. It gets a plot, joins the typewriter, and (if growing or sprouting) gets its own section.
- **Status:** growing / sprouting get a full section; seed is listed under "still in the ground".
- **Photos:** resize to ~2000px wide before uploading.
- **Timelapse:** upload the day's photos in order and set the first and last photo times. The slider switches from the drawing to the photos once there are at least 2.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening index.html directly won't load content/.)

## Swapping in the final brand

Change the tokens in `:root` at the top of `styles.css` and replace `assets/field-logo.svg` (drawn as a CSS mask, so it follows `--ink`).

## Hosting

- GitHub Pages: deploy from branch `main`, folder `/`. Custom domain fieldcorp.org, HTTPS enforced.
- DNS at Name.com: four `A` records for `@` (185.199.108–111.153), `www` CNAME to `fieldcorp.github.io`, plus a `_github-pages-challenge-fieldcorp` TXT record for domain verification.
- Email is iCloud (MX + TXT records at Name.com) — leave those alone.
