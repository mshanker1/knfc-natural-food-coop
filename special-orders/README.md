# Special Orders — prototype

A working prototype of a digital special-order system for Kent Natural Foods Co-op.
Not connected to the POS. Not linked from the site nav. Safe to leave in place.

## How to add this to the site

Copy this whole `special-orders/` folder into the root of the `knfc-website` repo:

```
knfc-website/
├── index.html
├── products.html
├── ...
└── special-orders/        ← this folder
    ├── index.html
    ├── so.css
    ├── so-data.js
    ├── so-pricing.js
    └── so-app.js
```

Commit and push. It goes live at `<your-domain>/special-orders/`.

Nothing needs to be added to the nav, and nothing in the existing site
changes — this folder is entirely self-contained. It loads only Google
Fonts (DM Serif Display, DM Sans, DM Mono), already used by the site.

To take it down, delete the folder.

## What testers can and can't check

**Can:** whether the screens match how a shift actually runs; whether the
markup options offered are the right ones; whether intake asks for the right
things; whether writing the order number on a tag works at the register.

**Can't yet:** the shared-record behaviour. Orders are stored in each
person's own browser, so **everyone sees their own private copy** — two
staff cannot see the same order. That needs the Apps Script backend and is
the next build step. Tell testers this up front or the first feedback will
be "it didn't show up on my screen."

There is a **Reset demo data** button on the All orders tab if a tester
wants to start clean.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell, topbar, script tags. Uses the real `SUN_MARK_SVG` from the site's `js/main.js`. |
| `so.css` | Styles, built on the site's own `:root` tokens (maroon / marigold / forest, DM type stack). |
| `so-data.js` | **The only file that touches storage.** Mock members, mock inventory, orders in `localStorage`. This is the swap point for the real backend. |
| `so-pricing.js` | The pricing rule tree, as confirmed by the buyers. No UI — readable as an audit document. |
| `so-app.js` | All six screens and event handling. Vanilla JS, no framework, per the site's `CLAUDE.md`. |

## The pricing rules encoded here

Confirmed with the buyers, August 2026:

1. **Not a case or bulk order** → no special-order markup at all. Priced at
   the item's normal department markup. Member may use their regular
   discount at checkout; nonmember gets none.
2. **Case or bulk, member** → markup over wholesale by distributor:
   25% (no shipping), 27% Kehe, 30% UNFI / Frankferd Farms, calculated per
   order for others. The member discount does **not** apply on top.
3. **Case or bulk, nonmember** → that item's department markup **less 10
   points** (bulk herbs 100→90, packaged 55→45, packaged H&B 75→65).
4. **Staff order** → 10% over wholesale, plus shipping when applicable.

Members and nonmembers are priced off two different bases: the member rate
depends on the distributor, the nonmember rate depends on the department.

**Unconfirmed rates:** only bulk herbs, packaged goods, and packaged health
& beauty were confirmed by name. The other department markups in
`so-pricing.js` are placeholders and are flagged as such in the Rate table
screen. A buyer needs to fill in the real numbers before go-live.

## Member matching

Not every Lightspeed customer record has the custom member-number field
filled in, so the prototype never depends on it. It matches on a fallback
chain — **member number → phone → name** — and reports which method
matched. An unmatched customer still works: staff type the details and set
member status by hand. The Rate table screen shows how many member records
are missing a number, which doubles as a backfill list.

## Known limitations

- Orders live in `localStorage`, so they are per-browser and per-device.
- Member and inventory tables are mock data, not the real POS export.
- No authentication. Do not put real customer data into it.
- "Enter manually" markup uses a browser prompt; the real build should use
  a proper field.
