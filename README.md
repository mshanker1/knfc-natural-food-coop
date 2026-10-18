# KNFC Website

The Kent Natural Foods Co-op website — static HTML, CSS, and vanilla JavaScript.
No build step, no framework, no npm. Edit a file, refresh the browser.

Local preview (needed for the inventory and content loaders, which can't read
`file://` URLs):

```bash
python -m http.server 8000   # then open http://localhost:8000
```

## Pages

| File | What it is |
|---|---|
| `index.html` | Home — hero, quick info, announcements |
| `about.html` | History and mission |
| `products.html` | Inventory browser with search and filters |
| `membership.html` | Membership benefits and how to join |
| `volunteer.html` | Volunteer opportunities |
| `special-requests.html` | Public form — customers request a product |
| `contact.html` | Contact form and location |
| `special-order-slip.html` | **Staff only.** Digital special order slip. Not in the nav; reached by link, behind a passcode. |

Header, nav, and footer are injected by `js/main.js` — edit them there, once, not
in each page.

## Shared code

| File | What it does |
|---|---|
| `css/styles.css` | All site styles; design tokens in `:root` |
| `css/slip.css` | Slip page only; built on the same tokens |
| `js/main.js` | Header/footer injection, `STORE_INFO`, sun mark, nav, mobile menu, form validation |
| `js/inventory.js` | Products page — reads `inventory.csv` from Drive |
| `js/content.js` | Announcements, sales, staff picks, education — same Drive folder |
| `js/slip.js` | The slip page. The field list at the top **is** the Sheet's column list |
| `js/slip-api.js` | Slip data layer; `SLIP_API_URL` at the top |

## Google Apps Script

Three independent scripts, three separate deployments. They share no data.

| Script | Backs | Setup |
|---|---|---|
| `DriveProxy.gs` | Inventory + site content CSVs, from a shared Drive folder | `google-apps-script/SETUP.md` |
| `FormHandler.gs` | The public special-requests form | `google-apps-script/SETUP.md` |
| `SlipHandler.gs` | The staff special order slip — its own Sheet in My Drive | `google-apps-script/SETUP-SLIP.md` |

After editing any `.gs` file you must redeploy a **new version** for the change to
take effect. The URL doesn't change.

## Design

Palette sampled from the storefront: maroon awning, marigold lettering, supporting
forest and rust. Type is DM Serif Display + Newsreader + DM Sans + DM Mono, from
Google Fonts. No emoji — monospace eyebrow labels instead. Founded 1971. Tagline:
*Local. Before local was cool.*

## For staff

- `BUYER_GUIDE.md` — how buyers update inventory, sales, announcements, and staff picks via Drive. Also `KNFC_Buyer_Guide.pdf`.
- `google-apps-script/SETUP-SLIP.md` — standing up or troubleshooting the slip.

## Still to fill in

Placeholders in the HTML are marked with square brackets — search for `[` to find them.

- `js/main.js` — `STORE_INFO.email` is a placeholder
- `membership.html` — tier pricing and member discount percentage
- `volunteer.html` — time commitment, age requirement, discount details
- `about.html` — board of directors names and bios
- `contact.html` — Google Maps embed
- Staff portraits for Staff Picks; a favicon from the sun mark (`SUN_MARK_SVG` in `js/main.js`)

## Constraints

No frameworks, no build tools, mobile-first, modern browsers only. `archive/` and
`archive_untracked/` hold superseded work — nothing live reads from them.

_Updated September 2026._
