import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("focus.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
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

  INSERT OR IGNORE INTO settings (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- 'FOCUS_BLOCK', 'HIGH_DISTRACTION', 'IDLE_BREAK'
    title TEXT,
    description TEXT,
    start_time DATETIME,
    end_time DATETIME,
    score_impact INTEGER
  );

  CREATE TABLE IF NOT EXISTS event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT,
    message TEXT
  );
`);

// Seed some data if empty
const activityCount = db
  .prepare("SELECT COUNT(*) as count FROM activity_log")
  .get();
if (activityCount.count === 0) {
  const now = new Date();
  const seedActivities = [
    [
      "FOCUS_BLOCK",
      "Visual Design - Mobile App Prototype",
      "Deep work state maintained. System blocked 4 notifications.",
      new Date(now.getTime() - 4 * 3600000).toISOString(),
      new Date(now.getTime() - 2.5 * 3600000).toISOString(),
      15,
    ],
    [
      "HIGH_DISTRACTION",
      "Multitasking Incident",
      "Frequent context switching detected between Browser and Email.",
      new Date(now.getTime() - 2.2 * 3600000).toISOString(),
      new Date(now.getTime() - 1.8 * 3600000).toISOString(),
      -8,
    ],
    [
      "IDLE_BREAK",
      "Intentional Rest",
      "System detected lack of user input. Walk and Stretch accepted.",
      new Date(now.getTime() - 1.7 * 3600000).toISOString(),
      new Date(now.getTime() - 1.4 * 3600000).toISOString(),
      0,
    ],
    [
      "FOCUS_BLOCK",
      "Development - API Integration",
      "Steady focus in VS Code. Zero distractions recorded.",
      new Date(now.getTime() - 1.3 * 3600000).toISOString(),
      new Date(now.getTime() - 0.5 * 3600000).toISOString(),
      22,
    ],
  ];
  const stmt = db.prepare(
    "INSERT INTO activity_log (type, title, description, start_time, end_time, score_impact) VALUES (?, ?, ?, ?, ?, ?)",
  );
  seedActivities.forEach((a) => stmt.run(a));

  const seedEvents = [
    ["TAB_SWITCH_SPIKE", "Detected 4 shifts in 12s. Recommendation: Pause."],
    [
      "INTERVENTION_TRIGGER",
      "Screen dimming applied. User focus waning detected via eye-tracking.",
    ],
    [
      "FLOW_STATE_ACHIEVED",
      "90% match with historical high-performance peaks.",
    ],
    ["BLOCKLIST_ATTEMPT", "Restricted URL accessed. Blocked successfully."],
  ];
  const eventStmt = db.prepare(
    "INSERT INTO event_logs (event_type, message) VALUES (?, ?)",
  );
  seedEvents.forEach((e) => eventStmt.run(e));
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", (req, res) => {
    try {
      const {
        full_name,
        email,
        role,
        daily_focus_target,
        max_tab_switches,
        digital_sunset,
        alert_sensitivity,
        auto_trigger_breathing,
        block_notifications,
        smart_breaks,
        burnout_alerts_level,
        micro_break_interval,
      } = req.body;

      db.prepare(
        `
        UPDATE settings SET 
          full_name = ?, email = ?, role = ?, daily_focus_target = ?, max_tab_switches = ?, 
          digital_sunset = ?, alert_sensitivity = ?, auto_trigger_breathing = ?, 
          block_notifications = ?, smart_breaks = ?, burnout_alerts_level = ?, 
          micro_break_interval = ?
        WHERE id = 1
      `,
      ).run(
        full_name,
        email,
        role,
        daily_focus_target,
        max_tab_switches,
        digital_sunset,
        alert_sensitivity,
        auto_trigger_breathing,
        block_notifications,
        smart_breaks,
        burnout_alerts_level,
        micro_break_interval,
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/activities", (req, res) => {
    try {
      const activities = db
        .prepare("SELECT * FROM activity_log ORDER BY start_time DESC")
        .all();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", (req, res) => {
    try {
      const { type, title, description, start_time, end_time, score_impact } =
        req.body;

      const result = db
        .prepare(
          "INSERT INTO activity_log (type, title, description, start_time, end_time, score_impact) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(type, title, description, start_time, end_time, score_impact);

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.get("/api/events", (req, res) => {
    try {
      const events = db
        .prepare("SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT 20")
        .all();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", (req, res) => {
    try {
      const { event_type, message } = req.body;

      const result = db
        .prepare("INSERT INTO event_logs (event_type, message) VALUES (?, ?)")
        .run(event_type, message);

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/stats", (req, res) => {
    try {
      // Calculate stats based on activity log
      const activities = db
        .prepare("SELECT * FROM activity_log ORDER BY start_time DESC")
        .all();

      // Calculate focus score
      const totalImpact = activities.reduce(
        (sum, activity) => sum + (activity.score_impact || 0),
        0,
      );
      const focusScore = Math.max(0, Math.min(100, 50 + totalImpact));

      // Calculate time metrics
      let totalActiveMs = 0;
      let totalIdleMs = 0;

      activities.forEach((activity) => {
        const start = new Date(activity.start_time).getTime();
        const end = new Date(activity.end_time).getTime();
        const duration = end - start;

        if (activity.type === "IDLE_BREAK") {
          totalIdleMs += duration;
        } else {
          totalActiveMs += duration;
        }
      });

      const formatDuration = (ms) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      };

      // Mock burnout trend (you can implement proper calculation based on your needs)
      const burnoutTrend = [130, 110, 120, 80, 100, 60, 40, 20];

      res.json({
        focus_score: Math.round(focusScore),
        active_time: formatDuration(totalActiveMs),
        idle_time: formatDuration(totalIdleMs),
        tab_switches: 124, // You can track this based on activity logs
        session_duration:
          activities.length > 0
            ? formatDuration(
                Date.now() -
                  new Date(
                    activities[activities.length - 1].start_time,
                  ).getTime(),
              )
            : "0m",
        score_improvement: Math.round(totalImpact * 0.5),
        interventions: activities.filter((a) => a.type === "HIGH_DISTRACTION")
          .length,
        burnout_trend: burnoutTrend,
        distraction_peak: "14:00",
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
      res.status(500).json({ error: "Failed to calculate stats" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`💾 Database: focus.db`);
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down gracefully...");
  db.close();
  process.exit(0);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
