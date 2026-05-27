#!/usr/bin/env python3
"""
Build consolidated inventory from weekly reports and archived department files.

Usage:
  python scripts/build_consolidated_from_reports.py \
      --reports archive/data-backup/reports_inventory_listings_assets.csv \
      --departments archive/data-backup --output data/consolidated_inventory.csv

What it does:
- Reads the weekly reports CSV and extracts UPC, Item Name, Remaining, Sales Price.
- Scans department CSV files in the departments folder to build a UPC -> Department map.
- Joins reports rows to department by UPC; if missing, department becomes 'Uncategorized'.
- Writes a cleaned CSV with header: UPC, Item Name, Department, Remaining, Sales Price

This makes it easy to update weekly: only the reports CSV is required (you keep department files
archived once), then run this script to produce `consolidated_inventory.csv` suitable for the
website or upload to your Google Drive folder.
"""

import csv
import argparse
from pathlib import Path
from collections import defaultdict
import re


def find_upc_fieldnames(fieldnames):
    """Return possible UPC-like fieldnames from header list."""
    candidates = [f for f in fieldnames if re.search(r"upc|barcode|ean|sku|system id", f, re.I)]
    return candidates[0] if candidates else None


def find_price_fieldnames(fieldnames):
    candidates = [f for f in fieldnames if re.search(r"price|sale price|unit price|saleprice", f, re.I)]
    return candidates[0] if candidates else None


def find_item_fieldnames(fieldnames):
    candidates = [f for f in fieldnames if re.search(r"item|description|name", f, re.I)]
    return candidates[0] if candidates else None


def find_remaining_fieldnames(fieldnames):
    candidates = [f for f in fieldnames if re.search(r"remaining|qty|quantity|on hand|stock", f, re.I)]
    return candidates[0] if candidates else None


def build_department_map(dept_folder: Path):
    """Scan department CSVs and return upc->department mapping."""
    mapping = {}
    for p in dept_folder.iterdir():
        if p.is_file() and p.suffix.lower() == '.csv':
            # infer department name from filename (strip extension)
            dept_name = p.stem
            try:
                with p.open(newline='', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    if not reader.fieldnames:
                        continue
                    upc_field = find_upc_fieldnames(reader.fieldnames)
                    item_field = find_item_fieldnames(reader.fieldnames)
                    remaining_field = find_remaining_fieldnames(reader.fieldnames)
                    price_field = find_price_fieldnames(reader.fieldnames)

                    for row in reader:
                        upc = ''
                        if upc_field:
                            upc = row.get(upc_field, '').strip()
                        else:
                            # fallback: try common index positions by joining values
                            # skip if no upc
                            upc = row.get('UPC', '').strip()

                        if upc:
                            mapping[upc] = dept_name
            except Exception:
                # ignore malformed files but continue
                continue
    return mapping


def clean_reports(reports_path: Path, dept_map: dict, output_path: Path):
    """Read reports CSV and write cleaned consolidated CSV."""
    kept = []
    with reports_path.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        upc_field = find_upc_fieldnames(fieldnames)
        item_field = find_item_fieldnames(fieldnames)
        remaining_field = find_remaining_fieldnames(fieldnames)
        price_field = find_price_fieldnames(fieldnames)

        if not upc_field:
            # try common fallback names
            upc_field = 'UPC' if 'UPC' in fieldnames else (fieldnames[0] if fieldnames else None)

        for row in reader:
            upc = (row.get(upc_field, '') or '').strip()
            name = (row.get(item_field, '') or '').strip() if item_field else ''
            remaining = (row.get(remaining_field, '') or '').strip() if remaining_field else ''
            price = (row.get(price_field, '') or '').strip() if price_field else ''

            # Normalize values
            upc = upc.replace('"', '')
            name = name.replace('"', '')
            # Try to coerce numeric remaining
            try:
                remaining_num = int(float(re.sub(r'[^0-9.-]', '', remaining))) if remaining else 0
            except Exception:
                remaining_num = 0

            # Clean price to number-like string
            price_clean = re.sub(r'[^0-9.]', '', price) if price else ''

            dept = dept_map.get(upc, 'Uncategorized')

            kept.append([upc, name, dept, remaining_num, price_clean])

    # write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['UPC', 'Item Name', 'Department', 'Remaining', 'Sales Price'])
        writer.writerows(kept)

    print(f'Wrote {len(kept)} rows to {output_path}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--reports', required=True, help='Path to weekly reports CSV')
    ap.add_argument('--departments', required=True, help='Path to folder with department CSVs')
    ap.add_argument('--output', required=True, help='Output consolidated CSV path')
    args = ap.parse_args()

    reports_path = Path(args.reports)
    dept_folder = Path(args.departments)
    output_path = Path(args.output)

    if not reports_path.exists():
        print('Reports file not found:', reports_path)
        return
    if not dept_folder.exists() or not dept_folder.is_dir():
        print('Departments folder not found or not a directory:', dept_folder)
        return

    print('Building department map from', dept_folder)
    dept_map = build_department_map(dept_folder)
    print('Department map entries:', len(dept_map))

    print('Cleaning reports file and joining department...')
    clean_reports(reports_path, dept_map, output_path)


if __name__ == '__main__':
    main()
