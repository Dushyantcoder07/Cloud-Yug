import React from 'react';
import { motion } from 'motion/react';
import {
    Shield,
    ArrowRight,
    TrendingUp,
    Zap,
    Clock,
    Moon,
    LayoutDashboard,
    Target,
    Lightbulb,
    Wind,
    Dumbbell,
    Ban
} from 'lucide-react';
import { Stats } from '../types';

export const Dashboard = ({ stats }: { stats: Stats | null }) => {
    if (!stats) return null;

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (stats.focus_score / 100) * circumference;

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-10">
                    <div className="relative flex-shrink-0">
                        <svg className="w-48 h-48" viewBox="0 0 192 192">
                            <circle
                                cx="96" cy="96" r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="12"
                                className="text-slate-100"
                            />
                            <motion.circle
                                cx="96" cy="96" r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="12"
                                className="text-blue-600"
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: offset }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                style={{
                                    strokeDasharray: circumference,
                                    transform: 'rotate(-90deg)',
                                    transformOrigin: 'center',
                                }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-extrabold text-slate-900">{stats.focus_score}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Safe</span>
                        </div>
                    </div>
                    <div className="space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 uppercase tracking-widest">
                            <Shield size={12} fill="currentColor" /> Stable Focus
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">Your current focus score is {stats.focus_score}.</h2>
                        <p className="text-slate-500 max-w-md text-sm leading-relaxed">Focus is currently stable, but high tab switching behavior was noted in the last hour. Consider closing inactive browser windows.</p>
                        <div className="pt-2">
                            <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 mx-auto md:mx-0">
                                View Detailed Analysis
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Recovery</p>
                            <TrendingUp className="text-green-500" size={18} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-green-600">+{stats.score_improvement}</span>
                            <span className="text-sm font-medium text-slate-500">Score Improvement</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mt-2">Boosted focus after your last 2-minute deep breathing intervention at 2:15 PM.</p>
                    </div>
                    <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-800 flex items-center justify-center text-teal-400">
                            <LayoutDashboard size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900 mb-0.5">Recovery Milestone</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Day 4 Streak Achieved</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: 'Active Time', value: stats.active_time, icon: Clock, color: 'blue' },
                    { label: 'Idle Time', value: stats.idle_time, icon: Moon, color: 'amber' },
                    { label: 'Tab Switches', value: stats.tab_switches, icon: LayoutDashboard, color: 'purple' },
                    { label: 'Session', value: stats.session_duration, icon: Target, color: 'green' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all group">
                        <div className="flex items-center mb-4">
                            <div className={`p-2.5 rounded-full ${i === 0 ? 'bg-blue-100 text-blue-600' : i === 1 ? 'bg-amber-100 text-amber-600' : i === 2 ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                <stat.icon size={16} fill="currentColor" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-none mb-1">7-Day Burnout Trend</h3>
                            <p className="text-xs font-medium text-slate-500">Focus health vs time</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-blue-500">Avg: 74</p>
                            <p className="text-[10px] font-bold text-green-500 tracking-wider uppercase mt-1">+5% improvement</p>
                        </div>
                    </div>
                    <div className="h-48 w-full relative z-10 flex items-end justify-between px-2">
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <path d="M0,80 Q15,75 25,60 T50,80 T75,30 T100,60" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="absolute w-full bottom-0 left-0 border-t border-slate-100 flex justify-between pt-2">
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                                <span key={i} className="text-[10px] font-semibold text-slate-400 tracking-widest">{day}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-none mb-1">Peak Distraction</h3>
                            <p className="text-xs font-medium text-slate-500">Intensity per hour today</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-amber-500">Peak: {stats.distraction_peak}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">12% decrease</p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-6 flex-1">
                        {[
                            { time: '09:00', val: 20 },
                            { time: '11:00', val: 50 },
                            { time: '14:00', val: 95 },
                            { time: '16:00', val: 15 },
                        ].map((d, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-slate-400 w-8">{d.time}</span>
                                <div className="h-2.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${d.val}%` }}
                                        className={`h-full rounded-full ${d.val > 80 ? 'bg-blue-600' : 'bg-blue-300'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center gap-3">
                        <Lightbulb className="text-amber-500" size={18} fill="currentColor" />
                        <p className="text-[11px] text-amber-700 font-medium">Distractions spiked at 2 PM. Try scheduling deep work before midday tomorrow.</p>
                    </div>
                </div>
            </div>

            {/* Quick Reset */}
            <div className="bg-slate-50 border border-dashed border-blue-200 rounded-3xl p-8">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Need a quick reset?</h3>
                        <p className="text-slate-500 text-sm">A 2-minute break can improve your focus score by up to 15%.</p>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-3">
                            <button className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-900 font-semibold text-sm rounded-full transition-all shadow-sm flex items-center gap-2">
                                <Wind className="text-blue-500" size={16} />
                                Start Breathing
                            </button>
                            <button className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-900 font-semibold text-sm rounded-full transition-all shadow-sm flex items-center gap-2">
                                <Dumbbell className="text-blue-500" size={16} />
                                Stretch
                            </button>
                        </div>
                        <button className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-full transition-all shadow-md shadow-blue-600/20 flex items-center gap-2">
                            <Ban size={16} />
                            Focus Block
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
