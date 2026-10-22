# field corp — fieldcorp.org

Static site: plain HTML/CSS/JS, no build step. Hosted on GitHub Pages.

```
index.html        page structure + copy
styles.css        look & feel — brand tokens live at the top in :root
main.js           interactions (grass field, typewriter, conditions, sun dial, table, vending machine)
assets/           logo + favicon
CNAME             custom domain for GitHub Pages
```

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy to GitHub Pages

1. Create a repo (e.g. `fieldcorp/fieldcorp.org`) and push these files to `main`.
2. Repo → Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Custom domain: `fieldcorp.org` (already in `CNAME`). Tick **Enforce HTTPS** once the certificate is issued.
4. At your DNS provider (move the domain off Carrd's DNS if needed):
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `<your-github-username>.github.io`

## Adding a branch

1. Copy a `<a class="plot">` block in `index.html` and set `data-branch="Name"`. The hero typewriter picks it up automatically.
2. Give it a grid span in `styles.css` (`.plot-name { grid-column: span 2; }`).
3. Optionally add a `<section class="branch" id="name">` with its own interactive piece.

## Swapping in the final brand

Change the tokens in `:root` at the top of `styles.css` (colors, font, radius) and replace `assets/field-logo.svg`. The logo is drawn as a CSS mask, so it always uses the `--ink` color.

## Copy still to write

Search the code for `TODO`. Missing pieces: a description of wayhome, descriptions for Craft and Post, the contact email, and the real Hub inventory (`ITEMS` in `main.js`).
