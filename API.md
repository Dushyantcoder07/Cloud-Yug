# Backend API Documentation

## Overview

This is a JavaScript/Node.js backend for the Cloud-Yug Focus Tracking application. It uses Express.js for the server and SQLite (better-sqlite3) for the database.

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: SQLite3 (better-sqlite3)
- **Dev Server**: Vite (integrated for hot reload)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your settings:

```bash
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_api_key_here
APP_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 4. Run Production Server

```bash
npm run build
npm start
```

## API Endpoints

### Settings

- **GET** `/api/settings` - Get user settings
- **POST** `/api/settings` - Update user settings
  ```json
  {
    "full_name": "string",
    "email": "string",
    "role": "string",
    "daily_focus_target": 4.0,
    "max_tab_switches": 15,
    "digital_sunset": "10:00 PM",
    "alert_sensitivity": "Balanced",
    "auto_trigger_breathing": 1,
    "block_notifications": 1,
    "smart_breaks": 0,
    "burnout_alerts_level": 70,
    "micro_break_interval": "Every 50 minutes (Flow)"
  }
  ```

### Activities

- **GET** `/api/activities` - Get all activity logs
- **POST** `/api/activities` - Create a new activity
  ```json
  {
    "type": "FOCUS_BLOCK | HIGH_DISTRACTION | IDLE_BREAK",
    "title": "string",
    "description": "string",
    "start_time": "ISO8601 datetime",
    "end_time": "ISO8601 datetime",
    "score_impact": 0
  }
  ```

### Events

- **GET** `/api/events` - Get recent event logs (last 20)
- **POST** `/api/events` - Create a new event
  ```json
  {
    "event_type": "string",
    "message": "string"
  }
  ```

### Statistics

- **GET** `/api/stats` - Get calculated statistics
  ```json
  {
    "focus_score": 78,
    "active_time": "6h 42m",
    "idle_time": "45m",
    "tab_switches": 124,
    "session_duration": "52m",
    "score_improvement": 8,
    "interventions": 12,
    "burnout_trend": [130, 110, 120, 80, 100, 60, 40, 20],
    "distraction_peak": "14:00"
  }
  ```

### Health Check

- **GET** `/api/health` - Server health status
  ```json
  {
    "status": "ok",
    "timestamp": "ISO8601 datetime"
  }
  ```

## Database Schema

### settings

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT DEFAULT 'Alex Johnson',
  email TEXT DEFAULT 'alex.johnson@example.com',
  role TEXT DEFAULT 'Product Designer & Lead Researcher',
  daily_focus_target REAL DEFAULT 4.0,
  max_tab_switches INTEGER DEFAULT 15,
  digital_sunset TEXT DEFAULT '10:00 PM',
  alert_sensitivity TEXT DEFAULT 'Balanced',
  auto_trigger_breathing INTEGER DEFAULT 1,
  block_notifications INTEGER DEFAULT 1,
  smart_breaks INTEGER DEFAULT 0,
  burnout_alerts_level INTEGER DEFAULT 70,
  micro_break_interval TEXT DEFAULT 'Every 50 minutes (Flow)'
);
```

### activity_log

```sql
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT, -- 'FOCUS_BLOCK', 'HIGH_DISTRACTION', 'IDLE_BREAK'
  title TEXT,
  description TEXT,
  start_time DATETIME,
  end_time DATETIME,
  score_impact INTEGER
);
```

### event_logs

```sql
CREATE TABLE event_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT,
  message TEXT
);
```

## Features

### Auto-Seeding

The database automatically seeds with sample data on first run if tables are empty.

### Error Handling

All endpoints include try-catch blocks with proper error responses.

### Graceful Shutdown

Server handles SIGINT and SIGTERM signals to close database connections properly.

### Development Mode

In development, Vite middleware is integrated for hot module replacement.

### Production Mode

In production, serves static files from the `dist` folder.

## Scripts

- `npm run dev` - Start development server (JavaScript)
- `npm run dev:ts` - Start development server (TypeScript)
- `npm run build` - Build frontend for production
- `npm start` - Start production server (JavaScript)
- `npm run start:ts` - Start production server (TypeScript)
- `npm run clean` - Remove build artifacts
- `npm run lint` - Type check TypeScript files

## Database File

The SQLite database is stored as `focus.db` in the project root.

## Notes

- Both TypeScript (`server.ts`) and JavaScript (`server.js`) versions are available
- By default, `npm run dev` now uses the JavaScript version
- The server binds to `0.0.0.0` to allow external connections
- Default port is 3000 (configurable via PORT environment variable)
