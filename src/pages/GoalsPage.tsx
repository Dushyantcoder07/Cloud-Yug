import React from 'react';
import { Target, TrendingUp, ArrowRight, Clock, LayoutDashboard, Moon, Bell, CheckCircle2, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import { Settings } from '../types';

export const GoalsPage = ({ settings }: { settings: Settings | null }) => {
    if (!settings) return null;
    return (
        <div className="space-y-8">
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="absolute right-[-20%] top-[-20%] w-[60%] h-[140%] opacity-[0.03] pointer-events-none transition-transform group-hover:scale-105 duration-700">
                    <TrendingUp className="text-green-500" fill="currentColor" size={400} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
                        <TrendingUp size={14} /> Weekly Performance
                    </div>
                    <h2 className="text-4xl font-black mb-4 tracking-tight text-slate-900">Stability improved by 12% this week</h2>
                    <p className="text-slate-500 text-base leading-relaxed font-medium">
                        Your cognitive baseline is stabilizing. You are regaining control over context switching, and your deep work endurance has increased by an average of <span className="text-green-500 font-bold">18 minutes</span> per session.
                    </p>
                </div>
                <div className="relative z-10 shrink-0">
                    <button className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-green-500/20 text-sm">
                        View Detailed Report
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                                    <Target size={20} />
                                </div>
                                Focus Recovery Goals
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 pb-1">Behavior Design Layer</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 leading-tight mb-1 tracking-tight">Daily Focus Target</p>
                                        <p className="text-[11px] text-slate-500">Target hours of deep work</p>
                                    </div>
                                    <Clock className="text-slate-400" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-3xl font-black text-slate-900">{settings.daily_focus_target}.0 <span className="text-xs font-semibold text-slate-400">hrs</span></span>
                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">+20% vs avg</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full">
                                        <div className="h-full bg-green-500 rounded-full relative" style={{ width: '50%' }}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-[3px] border-green-500 rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 leading-tight mb-1 tracking-tight">Max Tab Switches</p>
                                        <p className="text-[11px] text-slate-500">Threshold for context switching</p>
                                    </div>
                                    <LayoutDashboard className="text-slate-400" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-3xl font-black text-slate-900">{settings.max_tab_switches} <span className="text-xs font-semibold text-slate-400">switches</span></span>
                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Low friction</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full">
                                        <div className="h-full bg-green-500 rounded-full relative" style={{ width: '30%' }}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-[3px] border-green-500 rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 leading-tight mb-1 tracking-tight">Digital Sunset</p>
                                        <p className="text-[11px] text-slate-500">Auto-cutoff for all screens</p>
                                    </div>
                                    <Moon className="text-slate-400" size={18} />
                                </div>
                                <div className="flex items-center gap-4 mt-8">
                                    <div className="bg-white border border-slate-100 rounded-xl font-bold text-lg px-4 py-3 flex-1 flex justify-between items-center shadow-sm">
                                        {settings.digital_sunset}
                                        <ArrowRight size={16} className="text-slate-300" />
                                    </div>
                                    <button className="w-12 h-12 flex items-center justify-center bg-green-500 text-white rounded-xl shadow-md shadow-green-500/20">
                                        <Bell size={20} fill="currentColor" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 leading-tight mb-1 tracking-tight">Alert Sensitivity</p>
                                        <p className="text-[11px] text-slate-500">Recovery nudge frequency</p>
                                    </div>
                                    <Bell size={18} className="text-slate-400" />
                                </div>
                                <div className="flex gap-2 mt-8">
                                    {['Quiet', 'Balanced', 'Active'].map((s, i) => (
                                        <button key={s} className={`flex-1 py-3 text-[10px] font-black rounded-xl border transition-colors uppercase tracking-widest ${(settings.alert_sensitivity === s || (s === 'Balanced' && !settings.alert_sensitivity))
                                                ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-500/20'
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'
                                            }`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="font-bold flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                        <TrendingUp size={20} />
                                    </div>
                                    Recovery Streak
                                </h4>
                                <p className="text-[11px] font-bold text-slate-500 tracking-wide"><span className="text-slate-900 text-sm">8 days</span> above 75 score</p>
                            </div>
                            <div className="flex justify-between items-center gap-2 max-w-xl mx-auto">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T'].map((day, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs ${i < 4 ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : i === 4 ? 'bg-green-50 text-green-500 border border-green-200' : i < 6 ? 'bg-slate-50 text-slate-400 border border-slate-100' : 'bg-transparent text-slate-300'}`}>{day}</div>
                                        {i < 4 ? <CheckCircle2 className="text-green-500" size={16} fill="currentColor" /> : i === 4 ? <div className="size-4 rounded-full border-[3px] border-green-200" /> : i < 6 ? <div className="size-4 rounded-full border-[3px] border-slate-200" /> : <div className="size-0.5 rounded-full bg-slate-300" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="bg-white p-8 rounded-3xl border border-slate-100 sticky top-24 shadow-sm">
                        <h3 className="text-xl font-bold mb-8">Daily Standing</h3>
                        <div className="mb-8">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-xs font-semibold text-slate-500">Deep Work</span>
                                <span className="text-sm font-black text-slate-900">3.2 / 4.0 hrs</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: '80%' }}></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
                                <Info size={12} />
                                48 mins remaining to hit daily goal
                            </p>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-xs font-semibold text-slate-500">Context Switches</span>
                                <span className="text-sm font-black text-green-500">6 / 15 limit</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500/40 rounded-full" style={{ width: '40%' }}></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
                                <CheckCircle2 size={12} className="text-green-500" />
                                Highly stable behavior today
                            </p>
                        </div>

                        <div className="mb-10">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-xs font-semibold text-slate-500">Attention Score</span>
                                <span className="text-sm font-black text-slate-900">88 / 100</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" style={{ width: '88%' }}></div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-8">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Focus Insights</p>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                                        <Lightbulb size={14} fill="currentColor" />
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                        Your attention peaks between <span className="text-slate-900 font-bold">9 AM and 11 AM</span>. Schedule deep work here.
                                    </p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={14} fill="currentColor" />
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                        Email browsing after <span className="text-slate-900 font-bold">4 PM</span> significantly spikes context switching.
                                    </p>
                                </li>
                            </ul>
                        </div>

                        <button className="w-full mt-10 py-4 bg-slate-900 text-white text-xs font-bold rounded-2xl transition-all hover:bg-slate-800 active:scale-95 shadow-xl shadow-slate-900/20">
                            Download Weekly Summary
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};
