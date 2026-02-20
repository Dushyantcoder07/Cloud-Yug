# Cloud-Yug Focus Tracker 🎯

An AI-powered browser extension for focus tracking and productivity enhancement. Monitor your browsing habits, get smart interventions, and optimize your work sessions.

## 🚀 Quick Start

### As a Browser Extension (Recommended)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create icons** (optional, see [ICONS.md](ICONS.md))
   - Create PNG icons: icon16.png, icon48.png, icon128.png
   - Place them in the `public/` folder
   - Or skip for now and use default browser icons

3. **Build the extension**

   ```bash
   npm run build:extension
   ```

4. **Load in your browser**

   **Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist-extension` folder

   **Edge:**
   - Go to `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist-extension` folder

   **Firefox:**
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the `dist-extension` folder

5. **Start using it!**
   - Click the extension icon to open the dashboard
   - Start a focus session
   - Watch it track your activity automatically

### As a Web App (Alternative)

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## 📖 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide
- **[EXTENSION.md](EXTENSION.md)** - Complete extension documentation
- **[API.md](API.md)** - Backend API reference (for web app mode)
- **[ICONS.md](ICONS.md)** - How to create extension icons

## ✨ Features

### Core Tracking

- ⏱️ **Real-time focus tracking** - Monitor your concentration levels
- 🔄 **Tab switch detection** - Track and limit context switching
- 🎯 **Focus sessions** - Timed deep work periods
- 💤 **Idle detection** - Automatic break tracking
- 📊 **Activity logging** - Complete history of focus events

### Smart Interventions

- 🔔 **Break reminders** - Every 50 minutes (customizable)
- 🌬️ **Breathing exercises** - Automatic stress relief
- 🚫 **Distraction detection** - Alerts for time-wasting sites
- 🌙 **Digital sunset** - Wind-down time reminders
- 🔥 **Burnout prevention** - Early warning system

### Analytics Dashboard

- 📈 **Focus score** (0-100) - Real-time productivity metric
- ⏰ **Time tracking** - Active vs idle time
- 📊 **Statistics** - Comprehensive insights
- 📉 **Burnout trends** - 8-point trend analysis
- 🎨 **Visual charts** - Easy-to-read graphs

## 🏗️ Architecture

### Extension Mode (Browser Extension)

```
┌─────────────┐
│  Web Pages  │ ← content.js monitors activity
└──────┬──────┘
       │
┌──────▼──────────────┐
│ Background Worker   │ ← background.js tracks state
│ (Service Worker)    │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│  Chrome Storage     │ ← Local storage API
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│  React UI (Popup)   │ ← App.tsx + storage.js
└─────────────────────┘
```

### Web App Mode (Optional)

```
┌─────────────────┐
│  React Frontend │ ← App.tsx
└────────┬────────┘
         │
┌────────▼────────┐
│  Express API    │ ← server.js
└────────┬────────┘
         │
┌────────▼────────┐
│  SQLite DB      │ ← focus.db
└─────────────────┘
```

## 🛠️ Development

### Extension Development

```bash
# Start dev server with hot reload
npm run dev:extension

# Build for production
npm run build:extension

# Clean build artifacts
npm run clean
```

### Web App Development

```bash
# Start server (JavaScript)
npm run dev

# Start server (TypeScript)
npm run dev:ts

# Build frontend
npm run build

# Production mode
npm start
```

## 📦 Project Structure

```
Cloud-Yug/
├── public/
│   ├── manifest.json      # Extension manifest (MV3)
│   ├── background.js      # Service worker
│   ├── content.js         # Content script
│   └── icon*.png          # Extension icons (create these)
├── src/
│   ├── App.tsx           # Main React component
│   ├── main.tsx          # React entry point
│   ├── storage.js        # Chrome storage wrapper
│   └── index.css         # Styles
├── server.js             # Express backend (for web mode)
├── vite.config.ts        # Vite config (web app)
├── vite.config.extension.ts  # Vite config (extension)
└── package.json
```

## 🔒 Privacy

- ✅ **100% local** - All data stays in your browser
- ✅ **No tracking** - Zero analytics or telemetry
- ✅ **No servers** - No data sent anywhere
- ✅ **Open source** - You can audit the code
- ✅ **You own your data** - Export/delete anytime

## 🌐 Browser Compatibility

| Browser | Status       | Version |
| ------- | ------------ | ------- |
| Chrome  | ✅ Supported | 88+     |
| Edge    | ✅ Supported | 88+     |
| Firefox | ✅ Supported | 109+    |
| Brave   | ✅ Supported | Latest  |
| Opera   | ✅ Supported | 74+     |
| Safari  | ⚠️ Not yet   | -       |

## 🎨 Customization

### Change Colors

Edit `src/App.tsx` and modify Tailwind classes:

```tsx
className = "bg-blue-600"; // Change to your color
className = "text-purple-500"; // Change to your color
```

### Adjust Break Intervals

Edit `public/background.js`:

```javascript
chrome.alarms.create("breakReminder", {
  periodInMinutes: 50, // Change to your preference
});
```

### Modify Distracting Sites

Edit `public/background.js`, find `isDistractingSite()`:

```javascript
const distractingSites = [
  "facebook.com",
  "twitter.com",
  // Add your own...
];
```

### Change Focus Score Algorithm

Edit `public/background.js`, find `updateStats()` function.

## 🐛 Troubleshooting

### Extension won't load

- Ensure you ran `npm run build:extension`
- Check Chrome DevTools console for errors
- Verify all files are in `dist-extension/`

### Popup is blank

- Right-click extension → Inspect popup
- Check console for errors
- Verify React app compiled successfully

### Data not saving

- Check browser storage permissions
- Open chrome://extensions and verify permissions
- Try reloading the extension

### Badge not updating

- Check background service worker is running
- Go to chrome://extensions → Click "service worker"
- Look for errors in console

## 📝 Scripts Reference

| Script                    | Description                          |
| ------------------------- | ------------------------------------ |
| `npm run dev`             | Run web app with backend server      |
| `npm run dev:extension`   | Dev server for extension development |
| `npm run build`           | Build web app for production         |
| `npm run build:extension` | Build browser extension              |
| `npm run clean`           | Remove all build artifacts           |
| `npm run lint`            | TypeScript type checking             |
| `npm start`               | Production server (JavaScript)       |
| `npm run start:ts`        | Production server (TypeScript)       |

## 🚢 Publishing

### Chrome Web Store

1. Build: `npm run build:extension`
2. Zip `dist-extension/` folder
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. $5 one-time developer fee

### Firefox Add-ons

1. Build: `npm run build:extension`
2. Zip `dist-extension/` folder
3. Upload to [addons.mozilla.org](https://addons.mozilla.org)
4. Free submission

### Edge Add-ons

1. Build: `npm run build:extension`
2. Zip `dist-extension/` folder
3. Upload to [Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge)
4. Free submission

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

Apache 2.0 - See LICENSE file for details

## 🙏 Acknowledgments

- Built with React, Vite, and Tailwind CSS
- Icons by Lucide React
- Animations by Motion/Framer Motion

## 💬 Support

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Email**: [Your email here]

## 🗺️ Roadmap

- [ ] Website blocking during focus mode
- [ ] Pomodoro timer integration
- [ ] Weekly/monthly reports
- [ ] Cloud sync across devices
- [ ] Custom productivity goals
- [ ] Team/workspace features
- [ ] AI-powered insights
- [ ] Mobile companion app

---

**Made with ❤️ for focused productivity**

_Start your journey to better focus today!_ 🚀
