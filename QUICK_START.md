# Quick Start Guide for Browser Extension

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Extension Icons

You need to create three icon files in the `public/` folder:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Quick way to create icons:**

- Use any image editor (Photoshop, GIMP, Paint.NET, etc.)
- Create a simple logo with your app colors (blue/purple gradient)
- Export in three sizes above
- Or use an online icon generator: https://www.favicon-generator.org/

**Temporary solution:**
Download any placeholder icons and rename them, or the extension will use default icons.

### 3. Build the Extension

```bash
npm run build:extension
```

This creates a `dist-extension/` folder with all extension files.

### 4. Load in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **"Load unpacked"**
5. Select the `dist-extension` folder
6. Done! 🎉

### 5. Test the Extension

1. Click the extension icon in your browser toolbar
2. You should see the Cloud-Yug Focus Tracker dashboard
3. Click "Start Focus Session" to begin tracking
4. Open some tabs and switch between them
5. Watch the badge update with your tab switch count
6. Check notifications for break reminders

## 🔧 Development Mode

If you want to develop the extension:

```bash
# Start Vite dev server (hot reload)
npm run dev:extension
```

Then follow the same loading steps above. The extension will auto-reload when you make changes.

## 📱 What the Extension Does

### Automatically Tracks:

- Tab switches (shows count in badge)
- Time spent active vs idle
- Visits to distracting websites
- Focus session duration
- Scroll, click, and typing activity

### Smart Alerts:

- **Rapid tab switching** (more than 3 switches in 5 seconds)
- **Break reminders** (every 50 minutes)
- **Digital sunset** (customizable wind-down time)
- **Burnout warnings** (based on activity patterns)

### Dashboard Shows:

- Current focus score (0-100)
- Active time today
- Tab switch counter
- Recent activities
- Event log

## 🎯 First Time Use

1. **Click Settings** (gear icon in popup)
2. Enter your **name** and **email**
3. Set your **daily focus target** (hours)
4. Configure **max tab switches** threshold
5. Set your **digital sunset** time
6. Click **Save Settings**

## 🔒 Privacy Note

- All data stays in your browser (chrome.storage.local)
- No data sent to any server
- No tracking or analytics
- You own your data 100%

## 🐛 Common Issues

### "Extension failed to load"

- Make sure you ran `npm run build:extension`
- Check that all files are in `dist-extension/`

### "Popup is blank"

- Open Chrome DevTools (right-click popup → Inspect)
- Check for JavaScript errors in console

### "Badge not showing"

- Background service worker might not be running
- Go to `chrome://extensions/` and click "service worker" to see logs

### "Icons missing"

- Create icon files in `public/` folder
- Or the extension will use browser default icons

## 🎨 Customization

### Change Colors

Edit `src/App.tsx` - search for Tailwind classes like `bg-blue-600` or `text-purple-600`

### Change Break Interval

Edit `public/background.js` - find `chrome.alarms.create('breakReminder', { periodInMinutes: 50 })`

### Add Custom Distracting Sites

Edit `public/background.js` - update the `isDistractingSite()` function

### Modify Focus Score Calculation

Edit `public/background.js` - update the `updateStats()` function

## 📦 Publishing

### Chrome Web Store

1. Create a developer account ($5 one-time fee)
2. Zip the `dist-extension` folder
3. Upload to Chrome Web Store Developer Dashboard
4. Fill in store listing details
5. Submit for review

### Firefox Add-ons

1. Create Mozilla account (free)
2. Zip the `dist-extension` folder
3. Upload to addons.mozilla.org
4. Fill in listing details
5. Submit for review

### Edge Add-ons

1. Join Microsoft Partner Center (free)
2. Zip the `dist-extension` folder
3. Upload to Edge Add-ons portal
4. Complete listing
5. Submit for review

## 🆘 Need Help?

Check the full documentation: [EXTENSION.md](EXTENSION.md)

---

Happy focusing! 🧘‍♂️
