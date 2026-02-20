// Storage Service for Chrome Extension
// Provides a clean API for chrome.storage.local

// Check if chrome extensions APIs are available
const isExtensionContext = () => {
  return (
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local
  );
};

// Fallback storage for development/web mode
const fallbackStorage = {
  data: {},
  async get(key) {
    return { [key]: this.data[key] };
  },
  async set(items) {
    Object.assign(this.data, items);
  },
  async clear() {
    this.data = {};
  },
};

export const storageService = {
  // Get settings
  async getSettings() {
    try {
      if (!isExtensionContext()) {
        console.warn(
          "Chrome extension APIs not available, using fallback storage",
        );
        const result = await fallbackStorage.get("settings");
        return result.settings || null;
      }
      const result = await chrome.storage.local.get("settings");
      return result.settings || null;
    } catch (error) {
      console.error("Error getting settings:", error);
      return null;
    }
  },

  // Update settings
  async updateSettings(settings) {
    try {
      if (!isExtensionContext()) {
        await fallbackStorage.set({ settings });
        return { success: true };
      }
      await chrome.storage.local.set({ settings });
      return { success: true };
    } catch (error) {
      console.error("Error updating settings:", error);
      return { success: false, error: error.message };
    }
  },

  // Get activities
  async getActivities() {
    try {
      if (!isExtensionContext()) {
        const result = await fallbackStorage.get("activities");
        return result.activities || [];
      }
      const result = await chrome.storage.local.get("activities");
      return result.activities || [];
    } catch (error) {
      console.error("Error getting activities:", error);
      return [];
    }
  },

  // Add activity
  async addActivity(activity) {
    try {
      const activities = await this.getActivities();
      const newActivity = {
        id: Date.now(),
        ...activity,
      };
      activities.push(newActivity);

      // Keep only last 100 activities
      const trimmedActivities = activities.slice(-100);

      if (!isExtensionContext()) {
        await fallbackStorage.set({ activities: trimmedActivities });
      } else {
        await chrome.storage.local.set({ activities: trimmedActivities });
      }

      return { success: true, id: newActivity.id };
    } catch (error) {
      console.error("Error adding activity:", error);
      return { success: false, error: error.message };
    }
  },

  // Get events
  async getEvents() {
    try {
      if (!isExtensionContext()) {
        const result = await fallbackStorage.get("events");
        return result.events || [];
      }
      const result = await chrome.storage.local.get("events");
      return result.events || [];
    } catch (error) {
      console.error("Error getting events:", error);
      return [];
    }
  },

  // Add event
  async addEvent(eventType, message) {
    try {
      const events = await this.getEvents();
      const newEvent = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        event_type: eventType,
        message,
      };
      events.push(newEvent);

      // Keep only last 50 events
      const trimmedEvents = events.slice(-50);

      if (!isExtensionContext()) {
        await fallbackStorage.set({ events: trimmedEvents });
      } else {
        await chrome.storage.local.set({ events: trimmedEvents });
      }

      return { success: true, id: newEvent.id };
    } catch (error) {
      console.error("Error adding event:", error);
      return { success: false, error: error.message };
    }
  },

  // Get stats
  async getStats() {
    try {
      const defaultStats = {
        focus_score: 50,
        active_time: "0m",
        idle_time: "0m",
        tab_switches: 0,
        session_duration: "0m",
        score_improvement: 0,
        interventions: 0,
        burnout_trend: [50, 50, 50, 50, 50, 50, 50, 50],
        distraction_peak: "14:00",
      };

      if (!isExtensionContext()) {
        const result = await fallbackStorage.get("stats");
        return result.stats || defaultStats;
      }
      const result = await chrome.storage.local.get("stats");
      return result.stats || defaultStats;
    } catch (error) {
      console.error("Error getting stats:", error);
      return null;
    }
  },

  // Update stats
  async updateStats(stats) {
    try {
      if (!isExtensionContext()) {
        await fallbackStorage.set({ stats });
        return { success: true };
      }
      await chrome.storage.local.set({ stats });
      return { success: true };
    } catch (error) {
      console.error("Error updating stats:", error);
      return { success: false, error: error.message };
    }
  },

  // Clear all data
  async clearAllData() {
    try {
      if (!isExtensionContext()) {
        await fallbackStorage.clear();
        return { success: true };
      }
      await chrome.storage.local.clear();
      return { success: true };
    } catch (error) {
      console.error("Error clearing data:", error);
      return { success: false, error: error.message };
    }
  },

  // Listen to storage changes
  addChangeListener(callback) {
    if (!isExtensionContext()) {
      console.warn("Storage change listeners not available in fallback mode");
      return;
    }
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        callback(changes);
      }
    });
  },
};

// Background script communication
export const backgroundService = {
  // Send message to background script
  async sendMessage(message) {
    try {
      if (!isExtensionContext()) {
        console.warn("Background messaging not available in fallback mode");
        return { success: false, error: "Extension APIs not available" };
      }
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.error("Error sending message to background:", error);
      return { success: false, error: error.message };
    }
  },

  // Get focus state
  async getFocusState() {
    return this.sendMessage({ type: "GET_FOCUS_STATE" });
  },

  // Start focus session
  async startFocusSession() {
    return this.sendMessage({ type: "START_FOCUS_SESSION" });
  },

  // End focus session
  async endFocusSession() {
    return this.sendMessage({ type: "END_FOCUS_SESSION" });
  },

  // Reset tab count
  async resetTabCount() {
    return this.sendMessage({ type: "RESET_TAB_COUNT" });
  },

  // Trigger break exercise
  async triggerBreak() {
    return this.sendMessage({ type: "TRIGGER_BREAK" });
  },
};

// Export as default
export default storageService;
