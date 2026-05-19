#!/usr/bin/env python3
"""
Consolidate Department CSV Files into Single Inventory File

This script reads all department CSV files and consolidates them into a single
CSV file with the format expected by the website:
UPC, Item Name, Department, Remaining, Sales Price

Usage:
    python consolidate_inventory.py

Output:
    Creates consolidated_inventory.csv in the same directory
"""

import csv
import os
from pathlib import Path

# Map of CSV files to department names
DEPARTMENT_FILES = {
    'Beverage.csv': 'Beverage',
    'Bulk_HB.csv': 'Bulk_HB',
    'Frozen.csv': 'Frozen',
    'Milk.csv': 'Milk',
    'Packaged_Dry.csv': 'Packaged_Dry',
    'Packaged_HB.csv': 'Packaged_HB',
    'Vitamins.csv': 'Vitamins'
}

# Column indices in source files (0-indexed)
# "System ID","UPC","EAN","Custom SKU","Manufact. SKU","Item","Remaining","Total Cost","Avg. Unit Cost","Sale Price","Margin"
SRC_UPC_COL = 1
SRC_ITEM_COL = 5
SRC_REMAINING_COL = 6
SRC_PRICE_COL = 9

def consolidate_inventory():
    """Consolidate all department CSV files into one."""
    script_dir = Path(__file__).parent
    output_file = script_dir / 'consolidated_inventory.csv'

    all_products = []

    # Read each department file
    for filename, department in DEPARTMENT_FILES.items():
        file_path = script_dir / filename

        if not file_path.exists():
            print(f"Warning: {filename} not found, skipping...")
            continue

        print(f"Processing {filename} ({department})...")

        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)  # Skip header

            for row in reader:
                if len(row) > SRC_PRICE_COL:
                    upc = row[SRC_UPC_COL].strip()
                    item_name = row[SRC_ITEM_COL].strip()
                    remaining = row[SRC_REMAINING_COL].strip()
                    sale_price = row[SRC_PRICE_COL].strip()

                    # Only add if we have essential data
                    if item_name and remaining and sale_price:
                        all_products.append([
                            upc,
                            item_name,
                            department,
                            remaining,
                            sale_price
                        ])

    # Write consolidated file
    print(f"\nWriting {len(all_products)} products to {output_file.name}...")

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Write header
        writer.writerow(['UPC', 'Item Name', 'Department', 'Remaining', 'Sales Price'])
        # Write all products
        writer.writerows(all_products)

    print(f"✓ Successfully created {output_file.name}")
    print(f"  Total products: {len(all_products)}")

    # Show department breakdown
    print("\nDepartment breakdown:")
    dept_counts = {}
    for product in all_products:
        dept = product[2]
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    for dept, count in sorted(dept_counts.items()):
        print(f"  {dept}: {count} products")

if __name__ == '__main__':
    consolidate_inventory()
