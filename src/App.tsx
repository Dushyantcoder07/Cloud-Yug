import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings, Activity, EventLog, Stats } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/HistoryPage';
import { InsightsPage } from './pages/InsightsPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, aRes, eRes, stRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/activities'),
          fetch('/api/events'),
          fetch('/api/stats')
        ]);
        setSettings(await sRes.json());
        setActivities(await aRes.json());
        setEvents(await eRes.json());
        setStats(await stRes.json());
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveSettings = async (newSettings: Settings) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
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
      <Header activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

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
