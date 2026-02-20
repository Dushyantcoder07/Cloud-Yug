import React from 'react';
import { Bolt, Settings as SettingsIcon, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { Stats } from '../types';

export const NavItem = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold transition-all relative ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
    stats
}: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    stats: Stats | null;
}) => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                            <Bolt size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight leading-none">Focus Recovery</h1>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
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
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 rounded-full border border-blue-600/20">
                        <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                        <span className="text-xs font-bold text-blue-600 tracking-wide uppercase">SCORE: {stats?.focus_score}</span>
                    </div>
                    <button
                        onClick={() => setActiveTab('Settings')}
                        className={`p-2 transition-colors rounded-lg ${activeTab === 'Settings' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <SettingsIcon size={20} />
                    </button>
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-slate-100 cursor-pointer">
                        <img src="https://picsum.photos/seed/user/100" alt="Profile" className="h-full w-full object-cover" />
                    </div>
                </div>
            </div>
        </header>
    );
};
