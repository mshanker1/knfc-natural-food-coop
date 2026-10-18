# Special Order Slip — setup

Forty minutes, start to finish, and nothing to install. You'll make a spreadsheet,
paste in a script, and get back a web address the slip page talks to.

Do it in this order — each step needs the one before it. It's the same shape as the
inventory (`DriveProxy.gs`) and form (`FormHandler.gs`) scripts already running on
the site, so some of this will look familiar. **This is a separate Sheet and a
separate deployment from the inventory Drive folder — the two share nothing.**

## Before you start

- The Google account the co-op should **own** this in — not a personal one. Whoever owns it controls access later.
- The buyer's email address, for the new-order notification.
- A staff passcode you've decided on. Something staff can remember and say out loud, not a password worth protecting.
- `google-apps-script/SlipHandler.gs` open in a text editor so you can copy all of it.

---

## Part one — the spreadsheet

### 1. Make the sheet
Signed in to that account, go to <https://sheets.new>. Name it **KNFC Special Orders**.
Don't add any columns — the script builds them.

Copy the long ID out of the address bar — the part between `/d/` and `/edit`. You need
it in step 3.

### 2. Open the script editor
Go to <https://script.google.com> → **New project**. Delete the sample code in `Code.gs`.

A standalone project, not one attached to the Sheet — same as the existing
`DriveProxy` and `FormHandler` scripts.

### 3. Paste in the script and set the Sheet ID
Copy the entire contents of `SlipHandler.gs` into that empty editor. Then paste your
Sheet ID between the quotes on the first line of code:

```js
const SPREADSHEET_ID = '1a2b3c…';
```

Save. Name the project **KNFC Special Order Slips**.

### 4. Run `setUp` once
In the toolbar, the dropdown next to **Debug** lists the functions. Choose **setUp**,
then **Run**.

Google will stop you and ask for permission. This is normal and it looks alarming:

- **Review permissions** → pick your account
- "Google hasn't verified this app" → **Advanced** → **Go to KNFC Special Order Slips (unsafe)**
- **Allow**

It says unverified because you wrote it this morning, not because anything is wrong —
the same warning you clicked through for the inventory script. Back on the spreadsheet
you should now see four tabs: **Slips**, **Staff**, **Activity**, **Monthly**.

### 5. Fill in the Staff tab
Replace the three sample rows with everyone who takes or places special orders. Two
columns: the name as it should appear in the dropdown, and either `buyer` or `staff`.

The role only changes whether "(buyer)" shows next to a name. Anyone who picks their
name can fill in the buyer half — the point is recording who did, not stopping anyone.

---

## Part two — settings

### 6. Set the passcode and the buyer's email
In the script tab: **Project Settings** (gear, left side) → **Script properties** →
**Add script property**. Add these three:

| Property | Value |
|---|---|
| `PASSCODE` | The staff passcode. Leave this property out entirely and the page opens with no passcode at all. |
| `BUYER_EMAIL` | Where new-order notifications go. Several addresses work, separated by commas. |
| `PAGE_URL` | Where the slip page lives, so the email can link to it: `https://kentnaturalfoods.org/special-order-slip.html` |

**Save script properties.** To change the passcode later, come back here and edit it —
no code changes.

---

## Part three — publishing it

### 7. Deploy as a web app
**Deploy → New deployment.** Click the gear next to "Select type" and choose
**Web app**. Then:

- **Description:** anything — "v1" is fine
- **Execute as: Me** — this is what lets staff use it without Google accounts
- **Who has access: Anyone**

**Deploy**, approve again if asked, and copy the **Web app URL**. It's long and starts
with `https://script.google.com/macros/s/`.

> **Both settings matter.** "Execute as: Me" means the script touches the Sheet with
> your permission, so staff don't need any. "Who has access: Anyone" means the page
> can reach the script — the passcode is what keeps strangers out.

### 8. Paste the URL into the site
Open `js/slip-api.js` and put the URL between the quotes at the top:

```js
const SLIP_API_URL = 'https://script.google.com/macros/s/AKfy…/exec';
```

That's the only file you edit — same pattern as `GOOGLE_DRIVE_API_URL` in
`js/inventory.js`. Save and push.

### 9. Try it
Load `kentnaturalfoods.org/special-order-slip.html`. You should get the passcode box,
then an empty slip. Save a test slip and check three things: a row appears on the
**Slips** tab, lines appear on **Activity**, and the buyer gets an email.

Then open it on a second device and confirm the test slip is there. That's the whole
point of this phase — one slip, several people.

There's also `testSlipHandler()` in the script editor, which writes a test slip and
logs what it finds, the same way `testFormHandler()` does.

---

## When you change the script later

Edits don't go live on their own. After changing `SlipHandler.gs`:
**Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy.**
The URL stays the same, so nothing on the website needs touching.

This catches everyone once. If a change seems to do nothing, this is why.

## What each tab is for

| Tab | What it holds |
|---|---|
| Slips | One row per slip, one column per field on the card. Safe to read, sort, and filter. Editing cells by hand works but won't be logged — better to use the page. |
| Staff | The names in the dropdown. Add or remove anytime; the page picks it up on next load. |
| Activity | Every change: when, which slip, who, which field, what it was, what it became. The "who put that there?" tab. |
| Monthly | Slips taken per month, from a formula. It fills itself in. |

## If something doesn't work

**"That passcode didn't work" and you're sure it's right.** Nearly always a stray
space in the `PASSCODE` property. Retype the value and save.

**The page says there's no connection.** Paste the web app URL straight into a
browser. Expect a short line of text mentioning `needsPasscode`. If you get a Google
sign-in page instead, "Who has access" isn't set to **Anyone** — redeploy and fix it.
If you get nothing, the URL in `js/slip-api.js` is wrong or is missing the `/exec`
on the end.

**Slips save but no email arrives.** Check `BUYER_EMAIL` for typos, then the spam
folder. Apps Script allows about 100 emails a day on a free account, far more than the
co-op will send. An email failure never loses a slip — mail problems can't block a save.

**Two people typed on one slip at once.** The last save wins, and **Activity** shows
both changes with times and names, so you can see what happened and put it back. Rare
in practice — the counter, the buyer, and receiving touch a slip at different moments.

## What this doesn't do

No pricing math — that was the v2 prototype, deliberately dropped. No printing of the
dry-erase card; receiving reads the slip and writes the card by hand. No member
lookup: names and phone numbers are typed fresh each time, same as on paper.
