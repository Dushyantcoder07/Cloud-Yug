// Background Service Worker for Cloud-Yug Focus Tracker
// Handles focus tracking, tab monitoring, and notifications

// State management
let focusState = {
  currentSession: null,
  lastActivity: Date.now(),
  tabSwitchCount: 0,
  lastTabSwitch: Date.now(),
  isInFocusMode: false,
  currentTabId: null,
  sessionStartTime: null,
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Cloud-Yug Focus Tracker installed:", details.reason);

  // Initialize storage with default settings
  const defaultSettings = {
    full_name: "Focus User",
    email: "",
    role: "Professional",
    daily_focus_target: 4.0,
    max_tab_switches: 15,
    digital_sunset: "10:00 PM",
    alert_sensitivity: "Balanced",
    auto_trigger_breathing: 1,
    block_notifications: 1,
    smart_breaks: 0,
    burnout_alerts_level: 70,
    micro_break_interval: "Every 50 minutes (Flow)",
  };

  const { settings } = await chrome.storage.local.get("settings");
  if (!settings) {
    await chrome.storage.local.set({
      settings: defaultSettings,
      activities: [],
      events: [],
      stats: {
        focus_score: 50,
        active_time: "0m",
        idle_time: "0m",
        tab_switches: 0,
        session_duration: "0m",
        score_improvement: 0,
        interventions: 0,
        burnout_trend: [50, 50, 50, 50, 50, 50, 50, 50],
        distraction_peak: "14:00",
      },
    });
  }

  // Set up alarms for periodic checks
  chrome.alarms.create("focusCheck", { periodInMinutes: 1 });
  chrome.alarms.create("statsUpdate", { periodInMinutes: 5 });
  chrome.alarms.create("breakReminder", { periodInMinutes: 50 });
});

// Tab monitoring - track switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const now = Date.now();
  const timeSinceLastSwitch = now - focusState.lastTabSwitch;

  focusState.tabSwitchCount++;
  focusState.lastTabSwitch = now;
  focusState.currentTabId = activeInfo.tabId;

  // Detect rapid switching (less than 5 seconds)
  if (timeSinceLastSwitch < 5000 && focusState.tabSwitchCount % 3 === 0) {
    await logEvent(
      "TAB_SWITCH_SPIKE",
      `Rapid tab switching detected (${focusState.tabSwitchCount} switches)`,
    );

    const { settings } = await chrome.storage.local.get("settings");
    if (settings?.auto_trigger_breathing) {
      sendNotification(
        "Take a Breath",
        "Frequent tab switching detected. Consider taking a moment to refocus.",
      );
    }
  }

  // Check if exceeding daily limit
  const { settings } = await chrome.storage.local.get("settings");
  if (focusState.tabSwitchCount > settings?.max_tab_switches) {
    await logEvent(
      "MAX_TAB_SWITCHES",
      `Exceeded daily tab switch limit (${settings.max_tab_switches})`,
    );
  }

  await updateStats();
});

// Monitor tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    focusState.lastActivity = Date.now();

    // Track URLs for distraction detection
    if (isDistractingSite(tab.url)) {
      await logActivity(
        "HIGH_DISTRACTION",
        `Distracting Site Visited`,
        `Visited: ${new URL(tab.url).hostname}`,
        new Date().toISOString(),
        new Date().toISOString(),
        -5,
      );
    }
  }
});

// Idle detection
chrome.idle.onStateChanged.addListener(async (newState) => {
  const now = new Date().toISOString();

  if (newState === "idle") {
    await logActivity(
      "IDLE_BREAK",
      "Break Time Detected",
      "User went idle. This is a good time for a break.",
      now,
      now,
      0,
    );
  } else if (newState === "active") {
    focusState.lastActivity = Date.now();

    // Check if returning from a long break
    if (focusState.currentSession) {
      await logEvent(
        "RETURN_FROM_BREAK",
        "User returned from break and resumed activity",
      );
    }
  }
});

// Alarm handlers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case "focusCheck":
      await checkFocusState();
      break;
    case "statsUpdate":
      await updateStats();
      break;
    case "breakReminder":
      await checkBreakReminder();
      break;
  }
});

// Message handler for popup/content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_FOCUS_STATE":
          sendResponse({ success: true, data: focusState });
          break;

        case "START_FOCUS_SESSION":
          focusState.isInFocusMode = true;
          focusState.sessionStartTime = Date.now();
          focusState.tabSwitchCount = 0;
          await logEvent("FOCUS_SESSION_START", "Focus mode activated");
          sendResponse({ success: true });
          break;

        case "END_FOCUS_SESSION":
          const duration = Date.now() - focusState.sessionStartTime;
          focusState.isInFocusMode = false;
          await logActivity(
            "FOCUS_BLOCK",
            "Focus Session Completed",
            `Duration: ${Math.round(duration / 60000)} minutes`,
            new Date(focusState.sessionStartTime).toISOString(),
            new Date().toISOString(),
            Math.round(duration / 60000), // 1 point per minute
          );
          focusState.sessionStartTime = null;
          sendResponse({ success: true });
          break;

        case "RESET_TAB_COUNT":
          focusState.tabSwitchCount = 0;
          sendResponse({ success: true });
          break;

        case "TRIGGER_BREAK":
          await triggerBreakExercise();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Helper functions
async function checkFocusState() {
  const idleTime = Date.now() - focusState.lastActivity;

  // If in focus mode and idle > 2 minutes, end session
  if (focusState.isInFocusMode && idleTime > 120000) {
    chrome.runtime.sendMessage({ type: "END_FOCUS_SESSION" });
  }

  // Update badge with tab switch count
  const settings = await chrome.storage.local.get("settings");
  const maxSwitches = settings.settings?.max_tab_switches || 15;
  const percentage = (focusState.tabSwitchCount / maxSwitches) * 100;

  let badgeColor = "#10b981"; // green
  if (percentage > 80)
    badgeColor = "#ef4444"; // red
  else if (percentage > 60) badgeColor = "#f59e0b"; // orange

  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  chrome.action.setBadgeText({ text: String(focusState.tabSwitchCount) });
}

async function updateStats() {
  const { activities = [], stats = {} } = await chrome.storage.local.get([
    "activities",
    "stats",
  ]);

  // Calculate focus score based on recent activities
  const recentActivities = activities.slice(-10);
  const totalImpact = recentActivities.reduce(
    (sum, act) => sum + (act.score_impact || 0),
    0,
  );
  const focusScore = Math.max(0, Math.min(100, 50 + totalImpact));

  // Calculate session duration
  const sessionDuration = focusState.sessionStartTime
    ? Math.round((Date.now() - focusState.sessionStartTime) / 60000)
    : 0;

  // Update stats
  const updatedStats = {
    ...stats,
    focus_score: Math.round(focusScore),
    tab_switches: focusState.tabSwitchCount,
    session_duration: `${sessionDuration}m`,
    interventions: activities.filter((a) => a.type === "HIGH_DISTRACTION")
      .length,
  };

  await chrome.storage.local.set({ stats: updatedStats });
}

async function checkBreakReminder() {
  if (focusState.isInFocusMode && focusState.sessionStartTime) {
    const duration = Date.now() - focusState.sessionStartTime;
    const minutes = Math.round(duration / 60000);

    // Remind every 50 minutes
    if (minutes > 0 && minutes % 50 === 0) {
      sendNotification(
        "Break Time! 🧘",
        "You've been focused for 50 minutes. Time for a micro-break.",
      );
      await logEvent(
        "BREAK_REMINDER",
        `Break reminder sent after ${minutes} minutes`,
      );
    }
  }
}

async function triggerBreakExercise() {
  await logEvent("BREATHING_EXERCISE", "User initiated breathing exercise");
  sendNotification(
    "Breathing Exercise 🌬️",
    "Follow the breathing pattern: Inhale (4s), Hold (4s), Exhale (4s)",
  );
}

function isDistractingSite(url) {
  const distractingSites = [
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "reddit.com",
    "youtube.com",
    "netflix.com",
    "tiktok.com",
  ];

  try {
    const hostname = new URL(url).hostname;
    return distractingSites.some((site) => hostname.includes(site));
  } catch {
    return false;
  }
}

async function logActivity(
  type,
  title,
  description,
  startTime,
  endTime,
  scoreImpact,
) {
  const { activities = [] } = await chrome.storage.local.get("activities");

  const newActivity = {
    id: Date.now(),
    type,
    title,
    description,
    start_time: startTime,
    end_time: endTime,
    score_impact: scoreImpact,
  };

  activities.push(newActivity);

  // Keep only last 100 activities
  const trimmedActivities = activities.slice(-100);

  await chrome.storage.local.set({ activities: trimmedActivities });
  await updateStats();
}

async function logEvent(eventType, message) {
  const { events = [] } = await chrome.storage.local.get("events");

  const newEvent = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    event_type: eventType,
    message,
  };

  events.push(newEvent);

  // Keep only last 50 events
  const trimmedEvents = events.slice(-50);

  await chrome.storage.local.set({ events: trimmedEvents });
}

function sendNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title,
    message,
    priority: 2,
  });
}

console.log("Cloud-Yug Focus Tracker background service worker initialized");
