# Kent Natural Foods Co-op Website

A simple, responsive website for Kent Natural Foods Co-op (KNFC) in Kent, Ohio.

## Features

- **Home Page**: Hero section, quick info cards, announcements
- **About Page**: History, mission, cooperative principles, board members
- **Products Page**: Searchable inventory with category/stock filtering
- **Membership Page**: Membership tiers, benefits, FAQ
- **Volunteer Page**: Volunteer opportunities and signup info
- **Contact Page**: Contact form, hours, location

## Project Structure

```
knfc-website/
├── index.html          # Home page
├── about.html          # About the co-op
├── products.html       # Product inventory
├── membership.html     # Membership information
├── volunteer.html      # Volunteer opportunities
├── contact.html        # Contact information
├── css/
│   └── styles.css      # All site styles
├── js/
│   ├── main.js         # General site JavaScript
│   └── inventory.js    # Inventory loading/display
├── data/
│   └── inventory.csv   # Sample inventory file
└── images/             # (Add your images here)
```

## Setup Instructions

### Option 1: GitHub Pages (Recommended - Free)

1. Create a GitHub account at github.com
2. Create a new repository named `knfc-website`
3. Upload all files from this folder to the repository
4. Go to Settings > Pages
5. Under "Source", select "main" branch
6. Your site will be live at: `https://yourusername.github.io/knfc-website`

### Option 2: Netlify (Free)

1. Create a Netlify account at netlify.com
2. Drag and drop this entire folder onto the Netlify dashboard
3. Netlify will deploy your site and give you a URL
4. You can connect a custom domain later

### Option 3: Local Testing

Open `index.html` in a web browser. Note: The inventory feature won't work locally due to browser security restrictions. Use a local server:

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

## Customizing the Content

### Updating Placeholder Text

Search for `[` throughout the HTML files to find placeholders:
- `[YEAR]` - Year the co-op was founded
- `[Street Address]` - Store address
- `[ZIP]` - ZIP code
- `[PHONE]` - Phone number
- `[EMAIL]` - Email address
- `[Hours]` - Store hours
- `[X]` - Various numbers (percentages, prices, etc.)

### Changing Colors

Edit the CSS variables at the top of `css/styles.css`:

```css
:root {
    --color-primary: #2d5a27;      /* Main green */
    --color-primary-light: #4a7c43;
    --color-secondary: #8b6914;     /* Accent gold */
    /* ... etc */
}
```

### Adding Images

1. Place images in the `images/` folder
2. Reference them in HTML: `<img src="images/your-image.jpg" alt="Description">`

## Setting Up Inventory

The inventory page can pull product data from Google Sheets (recommended) or a local CSV file.

### Google Sheets Setup (Recommended)

1. **Create a Google Sheet** with these columns:
   - Column A: Product Name
   - Column B: Category
   - Column C: Brand
   - Column D: Price (e.g., 4.99)
   - Column E: Quantity (number)
   - Column F: Last Updated (optional)

2. **Publish the Sheet**:
   - Go to File > Share > Publish to web
   - Under "Link", select your sheet and choose "Comma-separated values (.csv)"
   - Click "Publish"
   - Copy the URL provided

3. **Configure the Website**:
   - Open `js/inventory.js`
   - Find the line: `const GOOGLE_SHEET_CSV_URL = 'YOUR_GOOGLE_SHEETS_PUBLISHED_CSV_URL_HERE';`
   - Replace with your published CSV URL

4. **Weekly Update Process**:
   - Export inventory from your POS system as CSV
   - Open Google Sheets
   - Delete all rows except the header
   - Paste new data from POS export
   - The website will automatically use the updated data

### Local CSV Setup (Alternative)

1. Export inventory from your POS system as CSV
2. Format with columns: Product Name, Category, Brand, Price, Quantity, Last Updated
3. Save as `data/inventory.csv`
4. In `js/inventory.js`, change: `const DATA_SOURCE = 'local';`

## Contact Form Setup

The contact form needs a backend to process submissions. Free options:

### Formspree (Recommended)

1. Go to formspree.io and create a free account
2. Create a new form
3. Copy your form endpoint URL
4. In `contact.html`, update the form action:
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

### Netlify Forms (If hosting on Netlify)

1. Add `netlify` attribute to the form:
   ```html
   <form name="contact" method="POST" netlify>
   ```
2. Netlify will automatically handle submissions

## Adding a Google Map

1. Go to Google Maps and find your location
2. Click "Share" > "Embed a map"
3. Copy the iframe code
4. In `contact.html`, replace `[Google Map embed goes here]` with the iframe

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Maintenance Tips

1. **Keep announcements fresh**: Update the announcement cards on the home page regularly
2. **Update inventory weekly**: Export from POS > Update Google Sheet
3. **Test on mobile**: Always check changes on a phone
4. **Backup regularly**: Keep a copy of your files locally

## Getting Help

- For website issues, check the browser console (F12) for errors
- For hosting issues, consult GitHub Pages or Netlify documentation
- For general questions, contact the person who set up the site

## License

This website template was created for Kent Natural Foods Co-op.
