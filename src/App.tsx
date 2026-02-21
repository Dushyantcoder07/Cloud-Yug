/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { storageService } from './storage.js';
import { motion, AnimatePresence } from 'motion/react';
import { fetchExtensionBehavioralData, subscribeToExtensionUpdates } from './lib/extensionBridge';
import { useBehaviorAlerts } from './hooks/useBehaviorAlerts';
import { BehaviorAlertPopup } from './components/BehaviorAlertPopup';
import { WellnessModal } from './components/WellnessModal';
import type { WellnessType } from './hooks/useBehaviorAlerts';
import type { BehaviorAlert } from './hooks/useBehaviorAlerts';

// Import types
import { Settings, Activity, EventLog, Stats } from './types';

// Import components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import FatigueTracker from './components/FatigueTracker';
import { useFatigueDetection } from './hooks/useFatigueDetection';

// Import pages
import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/HistoryPage';
import { InsightsPage } from './pages/InsightsPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';

// Type declarations for Chrome extension API
declare const chrome: any;

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Wellness modal state
  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [wellnessInitialTab, setWellnessInitialTab] = useState<WellnessType>('breathing');

  // Initialize fatigue detection
  const fatigueDetection = useFatigueDetection();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode && JSON.parse(savedDarkMode)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Check if we're in extension popup context (small width)
  const [isExtensionPopup, setIsExtensionPopup] = useState(false);
  
  useEffect(() => {
    const checkExtensionContext = () => {
      // Check if window width is <= 600px (our extension breakpoint)
      setIsExtensionPopup(window.innerWidth <= 600);
    };
    
    checkExtensionContext();
    window.addEventListener('resize', checkExtensionContext);
    return () => window.removeEventListener('resize', checkExtensionContext);
  }, []);
  
  // Function to open full dashboard
  const openFullDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      // Extension context - open options page
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    } else {
      // Web context - open in new window
      window.open(window.location.href, '_blank', 'width=1200,height=800');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch data from chrome.storage instead of API
        const [settingsData, activitiesData, eventsData, statsData] = await Promise.all([
          storageService.getSettings(),
          storageService.getActivities(),
          storageService.getEvents(),
          storageService.getStats()
        ]);
        
        // Initialize with defaults if no settings exist
        if (settingsData) {
          setSettings(settingsData);
        } else {
          // Create default settings
          const defaultSettings: Settings = {
            daily_focus_target: 4,
            max_tab_switches: 15,
            digital_sunset: '22:00',
            alert_sensitivity: 'Balanced',
            full_name: 'User',
            email: 'user@example.com',
            role: 'Professional',
            auto_trigger_breathing: 0,
            block_notifications: 0,
            smart_breaks: 0,
            burnout_alerts_level: 50,
            micro_break_interval: '25m'
          };
          await storageService.updateSettings(defaultSettings);
          setSettings(defaultSettings);
        }
        
        // Load activities and events (no sample data)
        setActivities(activitiesData || []);
        setEvents(eventsData || []);
        
        // Merge stored stats with real-time behavioral data from extension
        const behavioralData = await fetchExtensionBehavioralData();
        const mergedStats = {
          ...(statsData || {}),
          ...(behavioralData || {})
        } as Stats;
        
        // Ensure we have a valid stats object
        if (mergedStats.focus_score !== undefined) {
          setStats(mergedStats);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Subscribe to real-time extension updates (push + polling built-in)
    const unsubscribe = subscribeToExtensionUpdates((behavioralData) => {
      setStats(prevStats => ({
        ...(prevStats || {}),
        ...behavioralData
      } as Stats));
    });

    // Additional explicit polling every 10 seconds as a safety net
    const pollInterval = setInterval(async () => {
      try {
        const behavioralData = await fetchExtensionBehavioralData();
        if (behavioralData) {
          setStats(prevStats => ({
            ...(prevStats || {}),
            ...behavioralData
          } as Stats));
        }
      } catch {/* silent */}
    }, 10000);
    
    // Listen for storage changes
    storageService.addChangeListener((changes) => {
      if (changes.settings) {
        setSettings(changes.settings.newValue);
      }
      if (changes.activities) {
        setActivities(changes.activities.newValue || []);
      }
      if (changes.events) {
        setEvents(changes.events.newValue || []);
      }
      if (changes.stats) {
        setStats(prevStats => ({
          ...(prevStats || {}),
          ...(changes.stats.newValue || {})
        } as Stats));
      }
    });
    
    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // ── Behavior alerts ────────────────────────────────────────────────────
  const { activeAlerts, dismissAlert } = useBehaviorAlerts(stats);

  const handleAlertAction = useCallback((alert: BehaviorAlert) => {
    setWellnessInitialTab(alert.wellnessType);
    setWellnessOpen(true);
    dismissAlert(alert.id);
  }, [dismissAlert]);

  const handleSaveSettings = async (newSettings: Settings) => {
    try {
      // Merge with existing settings to ensure all fields are preserved
      const mergedSettings = {
        ...settings,
        ...newSettings
      };
      await storageService.updateSettings(mergedSettings);
      setSettings(mergedSettings);
      alert("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">Initializing Focus Recovery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors">
      {/* Behavior alert toasts */}
      <BehaviorAlertPopup
        alerts={activeAlerts}
        onDismiss={dismissAlert}
        onAction={handleAlertAction}
      />

      {/* Wellness modal */}
      <WellnessModal
        isOpen={wellnessOpen}
        onClose={() => setWellnessOpen(false)}
        initialTab={wellnessInitialTab}
      />
      <Header activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} isExtensionPopup={isExtensionPopup} openFullDashboard={openFullDashboard} onWellnessOpen={() => setWellnessOpen(true)} />

      <main className="flex-1 w-full p-3 sm:p-6 md:p-10" style={{maxWidth: isExtensionPopup ? '100%' : '100%', paddingBottom: isExtensionPopup ? '80px' : undefined}}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'Dashboard' && <Dashboard stats={stats} fatigueMetrics={fatigueDetection.metrics} isTracking={fatigueDetection.isTracking} startTracking={fatigueDetection.startTracking} stopTracking={fatigueDetection.stopTracking} />}
            {activeTab === 'History' && <HistoryPage activities={activities} events={events} stats={stats} fatigueMetrics={fatigueDetection.metrics} />}
            {activeTab === 'Settings' && <SettingsPage settings={settings} onSave={handleSaveSettings} />}
            {activeTab === 'Insights' && <InsightsPage stats={stats} fatigueMetrics={fatigueDetection.metrics} isTracking={fatigueDetection.isTracking} />}
            {activeTab === 'FatigueTracker' && <FatigueTracker />}
            {activeTab === 'Goals' && <GoalsPage settings={settings} fatigueMetrics={fatigueDetection.metrics} isTracking={fatigueDetection.isTracking} stats={stats} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Extension Popup Bottom Navigation */}
      {isExtensionPopup && (
        <nav className="sticky bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around items-center shadow-lg">
          {[
            { tab: 'Dashboard', icon: '📊', label: 'Home' },
            { tab: 'History', icon: '📜', label: 'History' },
            { tab: 'Insights', icon: '📈', label: 'Stats' },
            { tab: 'Goals', icon: '🎯', label: 'Goals' },
            { tab: 'Settings', icon: '⚙️', label: 'Settings' }
          ].map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </nav>
      )}

      {!isExtensionPopup && <Footer />}
    </div>
  );
}
