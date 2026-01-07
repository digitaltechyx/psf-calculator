# WordPress Embed Code

## Option 1: Iframe Embed (Recommended)

Add this code to a WordPress **HTML Block** or **Custom HTML widget**:

```html
<div style="width: 100%; max-width: 1100px; margin: 0 auto; padding: 20px 0;">
  <iframe
    src="https://yourdomain.com/quote-calculator/index.html"
    style="width: 100%; height: 1000px; border: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);"
    loading="lazy"
    title="PSF Quote Calculator"
    allow="fullscreen"
  ></iframe>
</div>
```

**Replace `https://yourdomain.com/quote-calculator/index.html`** with your actual file path.

---

## Option 2: Direct Embed (If files are in WordPress theme)

If you've uploaded the calculator files to your WordPress theme directory, use:

```html
<div style="width: 100%; max-width: 1100px; margin: 0 auto;">
  <iframe
    src="<?php echo get_template_directory_uri(); ?>/quote-calculator/index.html"
    style="width: 100%; height: 1000px; border: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);"
    loading="lazy"
    title="PSF Quote Calculator"
  ></iframe>
</div>
```

---

## Option 3: Shortcode (Add to functions.php)

Add this to your theme's `functions.php` file:

```php
function psf_calculator_shortcode() {
    $calculator_url = 'https://yourdomain.com/quote-calculator/index.html';
    return '<div style="width: 100%; max-width: 1100px; margin: 0 auto; padding: 20px 0;">
        <iframe
            src="' . esc_url($calculator_url) . '"
            style="width: 100%; height: 1000px; border: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);"
            loading="lazy"
            title="PSF Quote Calculator"
            allow="fullscreen"
        ></iframe>
    </div>';
}
add_shortcode('psf_calculator', 'psf_calculator_shortcode');
```

Then use `[psf_calculator]` anywhere in your WordPress content.

---

## Setup Instructions

1. **Upload Files to Your Server:**
   - Upload the entire calculator folder to your website
   - Recommended path: `/quote-calculator/` or `/wp-content/themes/your-theme/quote-calculator/`

2. **Update the URL:**
   - Replace `https://yourdomain.com/quote-calculator/index.html` with your actual file path

3. **Add to WordPress:**
   - Go to your page/post editor
   - Add a **Custom HTML** block
   - Paste the iframe code
   - Adjust the height if needed (currently 1000px)

4. **Mobile Responsive:**
   - The calculator is responsive and will adapt to mobile screens
   - The iframe height may need adjustment on smaller screens

---

## Quick Copy-Paste Code (Most Common Use)

```html
<iframe
  src="https://yourdomain.com/quote-calculator/index.html"
  style="width:100%;max-width:1100px;height:1000px;border:0;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);"
  loading="lazy"
  title="PSF Quote Calculator"
></iframe>
```

**Remember to replace `https://yourdomain.com/quote-calculator/index.html` with your actual file URL!**



