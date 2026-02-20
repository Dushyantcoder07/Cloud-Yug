import React, { useState, useEffect } from 'react';
import { Bolt, Settings as SettingsIcon, Bell, Moon, Sun, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { Stats } from '../types';

export const NavItem = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold transition-all relative cursor-pointer ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
            }`}
    >
        {label}
        {active && (
            <motion.div
                layoutId="nav-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
            />
        )}
    </button>
);

export const Header = ({
    activeTab,
    setActiveTab,
    stats,
    isExtensionPopup,
    openFullDashboard
}: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    stats: Stats | null;
    isExtensionPopup?: boolean;
    openFullDashboard?: () => void;
}) => {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : false;
    });

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        setDarkMode(newValue);
        localStorage.setItem('darkMode', JSON.stringify(newValue));
        if (newValue) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('darkModeChange', { detail: newValue }));
    };

    // Listen for dark mode changes from other components (like Settings page)
    useEffect(() => {
        const handleDarkModeChange = () => {
            const saved = localStorage.getItem('darkMode');
            if (saved) {
                const isDark = JSON.parse(saved);
                setDarkMode(isDark);
                // Apply or remove dark class
                if (isDark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        };
        
        window.addEventListener('darkModeChange', handleDarkModeChange);
        return () => window.removeEventListener('darkModeChange', handleDarkModeChange);
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 transition-colors">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                            <Bolt size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight leading-none">Focus Recovery</h1>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                    <NavItem label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
                    <NavItem label="History" active={activeTab === 'History'} onClick={() => setActiveTab('History')} />
                    <NavItem label="Insights" active={activeTab === 'Insights'} onClick={() => setActiveTab('Insights')} />
                    <NavItem label="Goals" active={activeTab === 'Goals'} onClick={() => setActiveTab('Goals')} />
                </nav>

                <div className="flex items-center gap-4">
                    {isExtensionPopup && openFullDashboard && (
                        <button 
                            onClick={openFullDashboard}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-all hover:shadow-sm"
                            title="Open full dashboard in new tab"
                        >
                            <ExternalLink size={14} />
                            Full View
                        </button>
                    )}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 dark:bg-blue-600/20 rounded-full border border-blue-600/20 dark:border-blue-600/30 transition-colors">
                        <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">SCORE: {stats?.focus_score}</span>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 transition-all rounded-lg cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110"
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button
                        onClick={() => setActiveTab('Settings')}
                        className={`p-2 transition-colors rounded-lg cursor-pointer ${activeTab === 'Settings' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <SettingsIcon size={20} />
                    </button>
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700 cursor-pointer transition-colors">
                        <img src="https://picsum.photos/seed/user/100" alt="Profile" className="h-full w-full object-cover" />
                    </div>
                </div>
            </div>
        </header>
    );
};
