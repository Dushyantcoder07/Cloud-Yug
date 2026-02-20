import React from 'react';
import {
    ArrowRight,
    Terminal,
    Download,
    Brain,
    AlertTriangle,
    Moon,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    LayoutDashboard
} from 'lucide-react';
import { Activity, EventLog, Stats } from '../types';

export const HistoryPage = ({ activities, events, stats }: { activities: Activity[], events: EventLog[], stats: Stats | null }) => {
    if (!stats) return null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                        <span>History</span>
                        <ArrowRight size={12} />
                        <span className="text-slate-900 dark:text-slate-100">Behavior Timeline</span>
                    </nav>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Today's Performance</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button className="bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-bold rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">Export Logs</button>
                    <button className="bg-blue-600 text-white px-5 py-2.5 text-sm font-bold rounded-full shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-transform cursor-pointer">Live Tracking</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Active Time</p>
                        <div className="w-10 h-10 rounded-full bg-slate-100/50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{stats.active_time}</span>
                        <span className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">+12%</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Avg. Focus Score</p>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{stats.focus_score}</span>
                        <span className="text-sm font-bold text-slate-400">/100</span>
                        <span className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full ml-1">+5%</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Interventions</p>
                        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{stats.interventions}</span>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full ml-1">-2</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white">
                                <LayoutDashboard size={12} />
                            </div>
                            Behavior Timeline
                        </h3>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700 transition-colors">
                            <button className="px-5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-full shadow-sm cursor-pointer">All Activities</button>
                            <button className="px-5 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer">Alerts Only</button>
                        </div>
                    </div>
                    <div className="relative pl-12 before:content-[''] before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 space-y-10">
                        {activities.map((activity) => (
                            <div key={activity.id} className="relative">
                                <div className={`absolute -left-[32px] top-4 size-10 rounded-full bg-white dark:bg-slate-900 border-[3px] z-10 flex items-center justify-center shadow-sm ${activity.type === 'FOCUS_BLOCK' ? 'border-green-500 text-green-500' :
                                        activity.type === 'HIGH_DISTRACTION' ? 'border-amber-500 text-amber-500' : 'border-blue-500 text-blue-500'
                                    }`}>
                                    {activity.type === 'FOCUS_BLOCK' ? <Brain size={16} /> :
                                        activity.type === 'HIGH_DISTRACTION' ? <AlertTriangle size={16} /> : <Moon size={16} />}
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${activity.type === 'FOCUS_BLOCK' ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/30 border-green-200 dark:border-green-800' :
                                                activity.type === 'HIGH_DISTRACTION' ? 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' : 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                                            }`}>
                                            {activity.type.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                                            {new Date(activity.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                            {new Date(activity.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            <span className="ml-1 opacity-50">(90m)</span>
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">{activity.title}</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed max-w-xl">{activity.description}</p>
                                    {activity.score_impact !== 0 && (
                                        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg inline-flex bg-slate-50 dark:bg-slate-800 ${activity.score_impact > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                            {activity.score_impact > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {activity.score_impact > 0 ? '+' : ''}{activity.score_impact} Focus Score
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <aside className="w-full lg:w-96 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col h-fit sticky top-24 overflow-hidden transition-colors">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-slate-50">
                                <Terminal size={18} className="text-blue-600 dark:text-blue-400" />
                                Advanced Event Logs
                            </h3>
                            <span className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black px-2 py-0.5 rounded tracking-widest text-slate-400">LIVE</span>
                        </div>
                        <div className="p-6 space-y-6 max-h-[460px] overflow-y-auto font-mono text-[10px]">
                            {events.map((event) => (
                                <div key={event.id} className="flex gap-4">
                                    <span className="text-slate-400 shrink-0 tabular-nums pt-0.5">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <div>
                                        <p className={`font-bold mb-1 ${event.event_type.includes('SPIKE') || event.event_type.includes('ATTEMPT') ? 'text-amber-600' :
                                                event.event_type.includes('ACHIEVED') ? 'text-green-600' : 'text-blue-600'
                                            }`}>{event.event_type}</p>
                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-[200px]">{event.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full p-5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-50 dark:border-slate-800 flex items-center justify-center gap-2 cursor-pointer">
                            EXPORT_RAW_JSON
                            <Download size={14} />
                        </button>
                    </div>

                    <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-3xl p-6 shadow-xl shadow-blue-600/20 dark:shadow-blue-700/20 relative overflow-hidden group transition-colors">
                        <div className="absolute -right-10 -top-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Moon size={150} fill="currentColor" />
                        </div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest mb-4">
                                <Moon size={12} fill="currentColor" /> Recovery Tip
                            </div>
                            <h4 className="text-lg font-bold mb-2">Afternoon Slump Detected</h4>
                            <p className="text-blue-100 dark:text-blue-200 text-sm mb-6 leading-relaxed">
                                You tend to lose focus around 2:30 PM. We recommend a 10-minute non-digital break to recover focus.
                            </p>
                            <button className="w-full bg-white text-blue-600 dark:text-blue-700 font-bold py-3 rounded-full hover:bg-slate-50 transition-colors cursor-pointer">
                                Start Recovery Break
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
