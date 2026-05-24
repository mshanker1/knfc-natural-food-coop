# KNFC Website — v2 Redesign (May 2026)

This folder contains a complete visual refresh of the KNFC website, built on top of your existing structure. **Drop these files into your `knfc-website/` folder, overwriting the matching files. No HTML structure or JavaScript hooks were broken — the inventory loader, content loader, contact forms, and Google Drive integration all still work.**

---

## What changed at a glance

- **New palette** sampled from the storefront — maroon awning, marigold yellow lettering, supporting forest + rust. Green moves to a supporting role.
- **New typography** — DM Serif Display + Newsreader + DM Sans + DM Mono (replacing Playfair + Nunito). Loaded from Google Fonts, no install needed.
- **A real sun mark** drawn from the emblem in the front window — now the brand anchor in the header lockup, footer, and as a backdrop in the dark "Why a co-op" section.
- **Photos in place of placeholders** — storefront in the hero, tote in the manifesto strip, eight department thumbnails using your real photos.
- **"Local. Before local was cool."** — your tagline from the totes is now the home page hero line and footer signature.
- **Emoji icons removed** — replaced with monospace eyebrow labels everywhere.
- **Founded date corrected to 1971** (matches the totes; the old README said 1972).
- **All pages refreshed** — same content, new chrome, slightly tightened copy with the co-op's voice.

---

## Files in this folder

| File | What to do |
| --- | --- |
| `index.html` | Replace `knfc-website/index.html` |
| `about.html` | Replace `knfc-website/about.html` |
| `products.html` | Replace `knfc-website/products.html` |
| `membership.html` | Replace `knfc-website/membership.html` |
| `volunteer.html` | Replace `knfc-website/volunteer.html` |
| `contact.html` | Replace `knfc-website/contact.html` |
| `special-requests.html` | Replace `knfc-website/special-requests.html` |
| `css/styles.css` | Replace `knfc-website/css/styles.css` |
| `js/main.js` | Replace `knfc-website/js/main.js` (header, footer, store info) |
| `js/content.js` | **Unchanged** — same file as your current one, included so the preview works. You can leave the live version alone. |
| `js/inventory.js` | **Unchanged** — same as above. |
| `images/` | A subset of the photos from `knfc-website/images/` used by the redesign. You already have these — no action needed. |

---

## Things to update before you publish

I left a few clearly-marked placeholders for content only you can provide. Search for `[` in the HTML files to find them quickly. Specifically:

1. **`js/main.js`** — `STORE_INFO.email` is set to a placeholder `hello@kentnaturalfoods.coop`. Update to your real address.
2. **`membership.html`** — pricing for each tier (`$[XX]`, `$[XXX]`) and the member discount percentage `[X]%`.
3. **`volunteer.html`** — time-commitment numbers, age requirements, discount details.
4. **`about.html`** — board of directors names and bios.
5. **`contact.html`** — paste the Google Maps embed iframe where it says "Google Map embed goes here".

---

## Things to add when you have them

These are real photos and real names that will make the site feel less placeholder. None are blockers:

- **Staff portraits** for the Staff Picks feature (the products page reads them from `highlights.csv`).
- **Real producer/farm names** in your sales and staff-picks CSVs. The redesign uses your existing CSV structure — just keep filling them in.
- **A Google Map embed** on the contact page (replace the placeholder).
- **A favicon** built from the sun mark. The SVG is in `js/main.js` (`SUN_MARK_SVG`) — easy to export as PNG/ICO at any size.

---

## If something breaks

The redesign reuses every class name, ID, and form field name from your current site, so existing JavaScript should keep working. If you see anything odd:

- **Inventory not loading?** Check `js/inventory.js` — unchanged from your current setup, including the Google Apps Script URL.
- **Announcements not appearing?** Same — `js/content.js` is untouched.
- **Header or footer missing?** The new `main.js` injects them. Make sure your HTML files still have `<div id="header-placeholder"></div>` and `<div id="footer-placeholder"></div>`.

Let me know if anything looks off — happy to fix.
