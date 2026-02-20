import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Clock, Moon, Zap, Lightbulb } from 'lucide-react';
import { Stats } from '../types';

export const InsightsPage = ({ stats }: { stats: Stats | null }) => {
    if (!stats) return null;
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 bg-blue-100/50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full">Analytics Engine</span>
                    </div>
                    <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight">Pattern Intelligence</h1>
                    <p className="text-slate-500 text-sm font-medium">Deep dive into your cognitive focus and recovery trends.</p>
                </div>
                <div className="flex items-center bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-sm">
                    <button className="px-6 py-2 text-[11px] font-black rounded-full transition-all text-slate-500 hover:text-slate-900 uppercase tracking-widest">Day</button>
                    <button className="px-6 py-2 text-[11px] font-black rounded-full bg-white shadow text-slate-900 uppercase tracking-widest">Week</button>
                    <button className="px-6 py-2 text-[11px] font-black rounded-full transition-all text-slate-500 hover:text-slate-900 uppercase tracking-widest">Month</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-rose-50 border border-rose-100 p-10 flex flex-col justify-between group">
                    <div className="absolute top-10 right-10 opacity-20 pointer-events-none">
                        <AlertTriangle className="text-rose-500" fill="currentColor" size={160} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="bg-rose-100 text-rose-600 font-extrabold uppercase tracking-widest text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5">
                                <AlertTriangle size={10} fill="currentColor" /> Critical Insight
                            </span>
                        </div>
                        <h3 className="text-slate-900 text-3xl font-extrabold mb-4 tracking-tight">Approaching Burnout</h3>
                        <p className="text-slate-600 text-sm max-w-lg mb-10 leading-relaxed font-medium">
                            Warning: Rising tab switching frequency (+42%) and late-night usage detected over the last 72 hours. Your cognitive load is exceeding recommended recovery limits.
                        </p>
                    </div>
                    <div className="relative z-10 flex flex-wrap gap-6 items-center">
                        <button className="bg-rose-600 text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20">
                            <Zap size={16} fill="currentColor" />
                            Start Guided Recovery
                        </button>
                        <span className="text-rose-600/80 text-[11px] font-bold italic tracking-wide">Peak drop detected: 2:00 PM - 4:00 PM</span>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-10 flex flex-col items-center justify-center text-center shadow-sm">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-10">Focus Stability</p>
                    <div className="relative flex items-center justify-center size-48 mb-8">
                        <svg className="size-full" viewBox="0 0 100 100">
                            <circle className="text-slate-50" cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="12"></circle>
                            <motion.circle
                                className="text-blue-600"
                                cx="50" cy="50" fill="none" r="45"
                                stroke="currentColor"
                                strokeWidth="12"
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: 282.7 }}
                                animate={{ strokeDashoffset: 70 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{
                                    strokeDasharray: 282.7,
                                    transform: 'rotate(-90deg)',
                                    transformOrigin: 'center',
                                }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-slate-900 tracking-tighter">HIGH</span>
                            <span className="text-emerald-500 font-bold text-sm">+5.2%</span>
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-[200px] font-medium">
                        Your focus depth remains resilient despite increased interruptions.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex items-start gap-6">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Most Distracted Hours</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">2:00 PM — 4:00 PM</p>
                        <p className="text-sm text-slate-500 mt-3 font-medium leading-relaxed">Strategy: Schedule a "Deep Focus Block" at 2:15 PM to mitigate natural energy drop-off.</p>
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex items-start gap-6">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                        <Moon size={20} fill="currentColor" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Late-Night Impact</p>
                        <p className="text-2xl font-black text-rose-500 tracking-tight">-18% Next Day</p>
                        <p className="text-sm text-slate-500 mt-3 font-medium leading-relaxed">Activity post-11 PM correlates with significantly lower morning attention scores.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-100 p-10 flex flex-col shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-slate-900 text-lg font-bold tracking-tight">Weekly Cognitive Trend</h3>
                        <div className="flex gap-6 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-blue-600"></div> Focus Score
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 border-b-2 border-dashed border-slate-300"></div> Interventions
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-slate-50 rounded-2xl flex items-end justify-between px-10 pt-16 pb-6 border border-slate-100">
                        {[70, 50, 85, 40, 65, 95, 60].map((h, i) => (
                            <div key={i} className="flex flex-col items-center gap-4 w-10 h-full justify-end">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    className="w-3 bg-blue-600 rounded-full relative"
                                />
                                <span className="text-[10px] font-bold text-slate-400 tracking-widest">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl bg-white border border-slate-100 p-10 flex flex-col shadow-sm">
                    <h3 className="text-slate-900 text-lg font-bold tracking-tight mb-10">Recovery Lift</h3>
                    <div className="flex flex-col gap-10 flex-1 justify-center">
                        {[
                            { label: 'Focus Blocks', val: 88, color: 'emerald' },
                            { label: 'Stretching', val: 62, color: 'blue' },
                            { label: 'Deep Breathing', val: 45, color: 'blue' },
                        ].map((r, i) => (
                            <div key={i} className="flex flex-col gap-3">
                                <div className="flex justify-between items-center font-bold text-sm">
                                    <span className="text-slate-700">{r.label}</span>
                                    <span className={`text-${r.color}-500`}>+{r.val}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${r.val}%` }}
                                        className="h-full bg-blue-600 rounded-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="pt-8 border-t border-slate-100 mt-10">
                        <p className="text-[11px] text-slate-400 italic leading-relaxed font-medium">
                            "Focus Blocks" are your optimal recovery protocol for cognitive fatigue this week.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-xl shadow-blue-600/30">
                        <Lightbulb size={24} fill="currentColor" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 mb-1 leading-none text-lg">Predictive Insight</h4>
                        <p className="text-slate-600 text-sm font-medium">By shifting your morning deep work 30 minutes earlier, we predict a <span className="font-bold text-blue-600">12% boost</span> in energy stability.</p>
                    </div>
                </div>
                <button className="bg-white border text-sm border-slate-200 text-slate-900 px-6 py-3 rounded-full font-bold shadow-sm shrink-0">Apply Suggestion</button>
            </div>

        </div>
    );
};
