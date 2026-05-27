**Google Apps Script — Drive Proxy & Consolidation**

This folder contains `DriveProxy.gs`, a Google Apps Script used by the KNFC website to read CSV files from a Drive folder and to consolidate a weekly `reports_inventory_listings_assets.csv` into `inventory.csv` automatically.

Purpose
- Serve CSV files to the website at a simple web endpoint
- Auto-build `inventory.csv` from the weekly `reports_inventory_listings_assets.csv` using archived department CSVs in the same Drive folder

Quick checklist
- Edit `DriveProxy.gs` and set `FOLDER_ID` to your Drive folder ID.
- Deploy the script as a Web App and copy the deployment URL into `js/inventory.js` as `GOOGLE_DRIVE_API_URL`.
- Add a time-driven trigger for `periodicProcessReports` to run regularly.

1) Folder setup
- Create a Drive folder and upload these files:
  - Your department CSVs (one file per department). Recommended: create a `departments/` subfolder and place all department CSV files there (e.g. `departments/Beverages.csv`, `departments/Milk.csv`).
    The Apps Script prefers a `departments/` subfolder but will fall back to scanning the folder root if the subfolder is not present.
  - `reports_inventory_listings_assets.csv` (weekly report you upload each week)
  - (optional) other CSVs used by the site: `announcements.csv`, `sales.csv`, etc.
- Share the folder (optional) as "Anyone with the link can view" if you want the website to fetch files without OAuth. If you prefer more control, keep the folder private and use Apps Script to run as the script owner (deploy Execute as: Me) and only allow the script URL to fetch content.

2) Configure the script
- Open `google-apps-script/DriveProxy.gs` in the Apps Script editor.
- Edit the top `FOLDER_ID` constant and replace with your folder ID (the long string in the Drive folder URL).

3) Deploy as Web App
- In the Apps Script editor: Deploy > New deployment > Select "Web app".
  - Execute as: Me
  - Who has access: Anyone (or choose a more restrictive option if you control auth)
- Copy the Web App URL (example: `https://script.google.com/macros/s/DEPLOY_ID/exec`).
- Paste this URL into `js/inventory.js` as `GOOGLE_DRIVE_API_URL` (keep the `?file=` usage as the code expects).

4) Manual test endpoints
- List files: open in browser:
  `https://.../exec?action=list`
- Manually run consolidation (builds/overwrites `inventory.csv`):
  `https://.../exec?action=consolidate&file=reports_inventory_listings_assets.csv`
- Or use curl:
  ```bash
  curl "https://.../exec?action=consolidate&file=reports_inventory_listings_assets.csv"
  ```

5) Install periodic trigger (recommended)
- In Apps Script editor: Triggers (left menu) > Add Trigger
  - Choose function: `periodicProcessReports`
  - Deployment: Head
  - Event source: Time-driven
  - Type of time-based trigger: Minutes timer (or Hourly)
  - Select interval (e.g. Every 15 minutes)
- The trigger checks the last-updated timestamp of `reports_inventory_listings_assets.csv` and runs consolidation only when it changes.

6) Troubleshooting & logs
- Use View > Executions and View > Logs in the Apps Script editor to inspect errors and Logger output.
- If consolidation returns an error in the browser, check that:
  - `FOLDER_ID` is correct and the script owner has access to the folder
  - The reports file name matches exactly (including capitalization)
  - Department CSVs have a header row containing a UPC-like column (header names like "UPC", "EAN", "Barcode", "SKU" are detected)

7) Security notes
- Deploying with "Anyone" allows anonymous access to the script endpoint; the script runs as the owner (so it can read the folder). If you need higher security, restrict access and add an authentication layer or keep the folder private and use a server-side proxy.

8) Optional improvements
- Use a checksum (MD5) instead of lastUpdated for stronger change detection.
- Add an Apps Script UI or email notification when consolidation completes/fails.
- Move department CSVs into a `departments/` subfolder and adjust `buildDepartmentMap` to read that folder only.

If you want, I can:
- Create a short GitHub Actions workflow that uploads the weekly report to Drive automatically (requires Drive API credentials), or
- Convert the Apps Script to watch a `departments/` subfolder and make matching logic more strict.
