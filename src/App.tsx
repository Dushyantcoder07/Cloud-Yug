/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { storageService } from './storage.js';
import { motion, AnimatePresence } from 'motion/react';

// Import types
import { Settings, Activity, EventLog, Stats } from './types';

// Import components
import { Header } from './components/Header';
import { Footer } from './components/Footer';

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

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode && JSON.parse(savedDarkMode)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Check if we're in extension popup context (small width)
  const isExtensionPopup = typeof window !== 'undefined' && window.innerWidth <= 500;
  
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
        
        if (settingsData) setSettings(settingsData);
        setActivities(activitiesData);
        setEvents(eventsData);
        if (statsData) setStats(statsData);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
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
        setStats(changes.stats.newValue);
      }
    });
  }, []);

  const handleSaveSettings = async (newSettings: Settings) => {
    try {
      await storageService.updateSettings(newSettings);
      setSettings(newSettings);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} isExtensionPopup={isExtensionPopup} openFullDashboard={openFullDashboard} />

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'Dashboard' && <Dashboard stats={stats} />}
            {activeTab === 'History' && <HistoryPage activities={activities} events={events} stats={stats} />}
            {activeTab === 'Settings' && <SettingsPage settings={settings} onSave={handleSaveSettings} />}
            {activeTab === 'Insights' && <InsightsPage stats={stats} />}
            {activeTab === 'Goals' && <GoalsPage settings={settings} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
