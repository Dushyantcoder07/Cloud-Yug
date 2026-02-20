# Cloud-Yug Focus Tracker - Browser Extension

## Overview

Cloud-Yug is an AI-powered focus tracking and productivity enhancement browser extension that helps you maintain deep work states, minimize distractions, and optimize your work sessions.

## Features

### 🎯 Core Features

- **Real-time Focus Tracking**: Monitors your browser activity and calculates focus scores
- **Tab Switch Detection**: Tracks and alerts on excessive tab switching
- **Distraction Detection**: Identifies visits to distracting websites
- **Idle Detection**: Monitors breaks and idle time
- **Focus Sessions**: Start timed focus sessions with tracking
- **Break Reminders**: Periodic reminders to take breaks (every 50 minutes)
- **Breathing Exercises**: Guided breathing prompts when distractions are detected
- **Activity Logging**: Comprehensive log of all focus-related activities
- **Statistics Dashboard**: Visual analytics of your focus patterns

### 🔔 Smart Interventions

- Automatic break reminders during long focus sessions
- Breathing exercise triggers on rapid tab switching
- Notification blocking during focus mode
- Digital sunset reminders
- Burnout prevention alerts

### 📊 Analytics

- Focus score (0-100)
- Active vs idle time tracking
- Tab switch counting
- Session duration tracking
- Score improvement trends
- Distraction peak time analysis

## Installation

### Development Installation

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Build the Extension**

   ```bash
   npm run build:extension
   ```

   This creates a `dist-extension` folder with your extension files.

3. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist-extension` folder

4. **Load in Firefox**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Navigate to `dist-extension` folder and select `manifest.json`

5. **Load in Edge**
   - Open Edge and navigate to `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist-extension` folder

### Production Build

For a production build:

```bash
npm run build:extension
```

Then package the `dist-extension` folder and submit to Chrome Web Store, Firefox Add-ons, or Edge Add-ons.

## Usage

### Getting Started

1. **Click the Extension Icon**
   - Opens the popup dashboard with your current stats

2. **Start a Focus Session**
   - Click the focus button to begin tracking
   - Extension monitors your activity automatically
   - Badge shows tab switch count

3. **View Dashboard**
   - Real-time focus score
   - Activity timeline
   - Recent events
   - Statistics overview

4. **Configure Settings**
   - Right-click extension icon → Options
   - Or click Settings in the popup
   - Customize focus targets, alerts, and preferences

### Key Settings

- **Daily Focus Target**: Hours of deep focus per day (default: 4.0)
- **Max Tab Switches**: Alert threshold for tab switching (default: 15)
- **Digital Sunset**: Wind-down time (default: 10:00 PM)
- **Alert Sensitivity**: Balanced, Gentle, or Aggressive
- **Auto-trigger Breathing**: Automatic breathing exercises on distraction
- **Block Notifications**: Block distracting notifications during focus
- **Smart Breaks**: AI-powered break scheduling
- **Burnout Alerts Level**: Threshold for burnout warnings (default: 70%)
- **Micro-break Interval**: Frequency of break reminders

## Architecture

### Extension Components

```
public/
├── manifest.json         # Extension manifest (MV3)
├── background.js         # Service worker (background tasks)
├── content.js           # Injected into web pages
├── icon16.png          # Extension icons
├── icon48.png
└── icon128.png

src/
├── App.tsx             # Main React UI (popup)
├── storage.js          # Chrome storage API wrapper
└── main.tsx            # React entry point

dist-extension/         # Built extension (after build)
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
└── assets/
```

### Data Flow

```
Web Page (content.js)
    ↓ (monitors activity)
Background Service Worker (background.js)
    ↓ (stores data)
Chrome Storage API
    ↓ (reads data)
React UI (App.tsx via storage.js)
```

### Background Worker Features

- Tab monitoring and switch detection
- Idle state tracking
- Focus session management
- Periodic stats updates (every 5 minutes)
- Break reminders (every 50 minutes)
- Activity and event logging
- Notification management

### Content Script Features

- Page activity monitoring (scrolls, clicks, keypresses)
- Doom scrolling detection
- Page engagement scoring
- Focus mode visual indicators
- Activity summaries on page unload

## API Reference

### Storage Service (`storage.js`)

```javascript
import { storageService, backgroundService } from "./storage.js";

// Settings
await storageService.getSettings();
await storageService.updateSettings(settings);

// Activities
await storageService.getActivities();
await storageService.addActivity(activity);

// Events
await storageService.getEvents();
await storageService.addEvent(eventType, message);

// Stats
await storageService.getStats();
await storageService.updateStats(stats);

// Background communication
await backgroundService.startFocusSession();
await backgroundService.endFocusSession();
await backgroundService.getFocusState();
await backgroundService.resetTabCount();
await backgroundService.triggerBreak();
```

### Message Types

**From Content Script:**

- `PAGE_ACTIVITY`: User activity on page
- `DOOM_SCROLLING_DETECTED`: Excessive scrolling detected
- `PAGE_SUMMARY`: Page engagement summary

**To Background:**

- `GET_FOCUS_STATE`: Get current focus state
- `START_FOCUS_SESSION`: Begin focus tracking
- `END_FOCUS_SESSION`: Stop focus tracking
- `RESET_TAB_COUNT`: Reset tab switch counter
- `TRIGGER_BREAK`: Manual break exercise

## Development

### Scripts

```bash
# Run as web app with backend
npm run dev

# Run as extension (development)
npm run dev:extension

# Build for production
npm run build

# Build extension
npm run build:extension

# Clean build artifacts
npm run clean

# Type checking
npm run lint
```

### Adding New Features

1. **Update Background Worker** (`public/background.js`)
   - Add new event listeners
   - Update state management
   - Add new message handlers

2. **Update Content Script** (`public/content.js`)
   - Add new page monitoring
   - Send messages to background

3. **Update Storage Service** (`src/storage.js`)
   - Add new storage methods
   - Expose new background functions

4. **Update React UI** (`src/App.tsx`)
   - Use storage service methods
   - Update components with new data

### Debugging

**Background Worker:**

- Chrome: `chrome://extensions/` → Click "service worker" under extension
- Firefox: `about:debugging#/runtime/this-firefox` → Inspect

**Popup:**

- Right-click extension icon → Inspect popup
- Or open DevTools while popup is open

**Content Script:**

- Open DevTools on any webpage
- Check Console for content script logs

## Permissions Explained

- **storage**: Store settings and activity data
- **tabs**: Monitor tab switches and URLs
- **alarms**: Periodic checks and reminders
- **notifications**: Break and distraction alerts
- **idle**: Detect idle/active states
- **activeTab**: Access current tab information
- **host_permissions (<all_urls>)**: Monitor activity on all websites

## Privacy & Data

- **All data is stored locally** in your browser (chrome.storage.local)
- **No data is sent to external servers**
- **No tracking or analytics**
- **Content scripts only monitor activity patterns, not content**
- **You can clear all data at any time** from the settings

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 109+ (with Manifest V3 support)
- ✅ Opera 74+
- ✅ Brave (Chromium-based)

## Troubleshooting

### Extension not loading

- Ensure you built the extension: `npm run build:extension`
- Check for errors in the Extensions page
- Verify manifest.json is valid

### Badge not updating

- Check if background service worker is running
- Look for errors in service worker console

### Data not persisting

- Verify storage permissions are enabled
- Check browser storage quotas

### High memory usage

- Extension stores last 100 activities and 50 events
- Use "Clear All Data" in settings to reset

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test in multiple browsers
5. Submit a pull request

## License

Apache 2.0

## Support

For issues or questions:

- Check existing issues on GitHub
- Create a new issue with details
- Include browser version and extension version

## Roadmap

- [ ] Focus mode website blocking
- [ ] Pomodoro timer integration
- [ ] Weekly/monthly reports
- [ ] Sync across devices
- [ ] Custom distraction site lists
- [ ] Productivity streaks
- [ ] Focus music integration
- [ ] AI-powered insights
- [ ] Team/workspace features

---

Made with ❤️ for focused productivity
