# Icon Creation Instructions

## Required Icons

The browser extension requires **PNG format** icons in three sizes:

- `icon16.png` (16x16 pixels) - Favicon in toolbar
- `icon48.png` (48x48 pixels) - Extension management page
- `icon128.png` (128x128 pixels) - Chrome Web Store

## Quick Creation Methods

### Method 1: Online Tools (Easiest)

1. Visit https://www.favicon-generator.org/ or https://realfavicongenerator.net/
2. Upload any image (logo, photo, etc.)
3. Generate all sizes
4. Download and rename to icon16.png, icon48.png, icon128.png
5. Move files to `public/` folder

### Method 2: Convert SVG to PNG

We've created SVG placeholders in the `public/` folder. Convert them:

**Using ImageMagick:**

```bash
convert public/icon16.svg public/icon16.png
convert public/icon48.svg public/icon48.png
convert public/icon128.svg public/icon128.png
```

**Using Inkscape:**

```bash
inkscape public/icon16.svg --export-filename=public/icon16.png -w 16 -h 16
inkscape public/icon48.svg --export-filename=public/icon48.png -w 48 -h 48
inkscape public/icon128.svg --export-filename=public/icon128.png -w 128 -h 128
```

**Using Online SVG to PNG Converter:**

- Visit https://svgtopng.com/
- Upload each SVG file
- Set the correct size (16, 48, 128)
- Download PNG files

### Method 3: Design in Image Editor

**Using Photoshop, GIMP, Figma, etc:**

1. Create a new document (16x16, 48x48, or 128x128)
2. Design your icon (use brand colors: #3b82f6 blue, #8b5cf6 purple)
3. Keep it simple and recognizable
4. Export as PNG
5. Save to `public/` folder

## Design Guidelines

### Visual Style

- Use a gradient from blue (#3b82f6) to purple (#8b5cf6)
- Simple, clean design (recognizable at 16x16)
- High contrast for visibility
- Consider a focus/target/brain icon theme

### Suggested Icon Concepts

- 🎯 Target/bullseye (focus concept)
- 🧠 Brain outline (cognitive focus)
- ⚡ Lightning bolt (energy/productivity)
- 🔵 Concentric circles (meditation/focus)
- 📊 Minimal bar chart (tracking)

### Requirements

- **Format**: PNG with transparency
- **Color space**: RGB
- **Background**: Transparent or solid color
- **Style**: Flat design (no 3D effects)

## Testing Icons

After creating the icons:

1. Build the extension:

   ```bash
   npm run build:extension
   ```

2. Check that icons appear in:
   - Browser toolbar
   - Extension management page (chrome://extensions/)
   - Popup window

3. If icons don't appear:
   - Verify PNG files exist in `public/`
   - Check file names match exactly (icon16.png, icon48.png, icon128.png)
   - Rebuild the extension

## Temporary Solution

If you want to test the extension without creating icons right away:

1. The extension will still work
2. Browser will show a default/generic icon
3. You can add proper icons later

Just make sure to create them before publishing to web stores!

---

**Need help?** Check out the free icon creation tools above or use AI image generators like DALL-E, Midjourney, or Stable Diffusion to create custom icons.
