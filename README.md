# PSF Quote Calculator (Modern Compact UI)

This folder contains a **drop‑in** quotation calculator with:
- **FBA / FBM** tabs
- Compact **one‑row per service** UI (slider marks + quantity stepper)
- Auto **tier pricing** for “Single Unit”
- Clean **PDF download** (text-based, not a screenshot)

## Files
- `index.html` – main calculator page
- `assets/styles.css` – styling (responsive + modern)
- `assets/app.js` – calculator logic + PDF export

## How to use on your website

### Option A (recommended): Upload and embed with an iframe
1. Upload this folder to your hosting, e.g.:
   - `/quote-calculator/index.html`
2. Embed it on your page:

```html
<iframe
  src="/quote-calculator/index.html"
  style="width:100%;max-width:1100px;height:900px;border:0;border-radius:16px;overflow:hidden;"
  loading="lazy"
  title="PSF Quote Calculator"
></iframe>
```

Then adjust the iframe `height` as needed (it will be shorter on mobile).

### Option B: Copy/paste into a page builder
If you’re using WordPress/Elementor/etc:
1. Add a “Custom HTML” block.
2. Paste the contents of `index.html`.
3. Upload `assets/styles.css` + `assets/app.js` to your media/hosting and update the `<link>` and `<script>` paths.

## Update pricing
Edit `assets/app.js` → `SERVICES`:
- **Tiered** example: `fba_single_unit` / `fbm_single_unit`
- **Flat** example: `fba_pack_2`, `fbm_pallet_handling`

## Notes
- The PDF is generated using `jsPDF` loaded from a CDN in `index.html`.
- The Summary shows **only items with quantity > 0** (to keep it short).









