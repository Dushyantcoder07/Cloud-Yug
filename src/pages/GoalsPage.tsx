import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, ArrowRight, Clock, LayoutDashboard, Moon, Bell, CheckCircle2, Info, Lightbulb, AlertTriangle, Eye, Gauge, Activity, MousePointer, ScrollText } from 'lucide-react';
import { Settings, Stats } from '../types';
import { PhysiologicalMetrics } from '../hooks/useFatigueDetection';
import { useGoalsTracking } from '../hooks/useGoalsTracking';
import { storageService } from '../storage.js';

interface GoalsPageProps {
    settings: Settings | null;
    fatigueMetrics: PhysiologicalMetrics;
    isTracking: boolean;
    stats?: Stats | null;
}

export const GoalsPage = ({ settings, fatigueMetrics, isTracking, stats }: GoalsPageProps) => {
    // Load goals tracking data
    const goalsData = useGoalsTracking(stats || null, settings, fatigueMetrics);
    
    // Local state for interactive controls
    const [focusTarget, setFocusTarget] = useState(settings?.daily_focus_target || 4);
    const [tabSwitchLimit, setTabSwitchLimit] = useState(settings?.max_tab_switches || 15);
    const [digitalSunset, setDigitalSunset] = useState(settings?.digital_sunset || '22:00');
    const [alertSensitivity, setAlertSensitivity] = useState(settings?.alert_sensitivity || 'Balanced');
    
    // Sync with settings when they change
    useEffect(() => {
        if (settings) {
            setFocusTarget(settings.daily_focus_target);
            setTabSwitchLimit(settings.max_tab_switches);
            setDigitalSunset(settings.digital_sunset);
            setAlertSensitivity(settings.alert_sensitivity);
        }
    }, [settings]);
    
    // Use default values if settings are null
    const displaySettings = settings || {
        daily_focus_target: 4,
        max_tab_switches: 15,
        digital_sunset: '22:00',
        alert_sensitivity: 'Balanced',
        full_name: 'User',
        email: 'user@example.com'
    };
    
    // Handler to update settings
    const updateSettings = async (updates: Partial<Settings>) => {
        if (!settings) return;
        const newSettings = { ...settings, ...updates };
        await storageService.updateSettings(newSettings);
    };
    
    // Calculate health goals progress
    const blinkHealthPercent = isTracking ? Math.max(0, 100 - fatigueMetrics.blinkRateScore) : 0;
    const postureHealthPercent = isTracking ? Math.max(0, 100 - fatigueMetrics.postureScore) : 0;
    const eyeHealthPercent = isTracking ? Math.max(0, 100 - fatigueMetrics.earScore) : 0;

    return (
        <div className="w-full max-w-[90rem] mx-auto space-y-8">
            {/* Weekly Trend Banner */}
            {goalsData.weeklyTrend ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-10 transition-colors">
                    <div className="absolute right-[-20%] top-[-20%] w-[60%] h-[140%] opacity-[0.03] dark:opacity-[0.05] pointer-events-none transition-transform group-hover:scale-105 duration-700">
                        <TrendingUp className={goalsData.weeklyTrend.percentChange >= 0 ? "text-green-500" : "text-amber-500"} fill="currentColor" size={400} />
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${goalsData.weeklyTrend.percentChange >= 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'} text-[10px] font-black uppercase tracking-widest rounded-full mb-6`}>
                            <TrendingUp size={14} /> Weekly Performance
                        </div>
                        <h2 className="text-4xl font-black mb-4 tracking-tight text-slate-900 dark:text-slate-50">
                            {goalsData.weeklyTrend.message}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed font-medium">
                            {goalsData.motivationalMessage}
                        </p>
                    </div>
                    <div className="relative z-10 shrink-0">
                        <div className={`text-center ${goalsData.weeklyTrend.percentChange >= 0 ? 'text-green-500' : 'text-amber-500'}`}>
                            <div className="text-5xl font-black">
                                {goalsData.weeklyTrend.percentChange >= 0 ? '+' : ''}{goalsData.weeklyTrend.percentChange.toFixed(1)}%
                            </div>
                            <div className="text-xs font-bold uppercase tracking-widest mt-2">
                                vs last week
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex items-center justify-center gap-3 transition-colors">
                    <Info className="text-slate-400" size={20} />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Start tracking to see your weekly performance trends
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400 flex items-center justify-center">
                                    <Target size={20} />
                                </div>
                                Focus Recovery Goals
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 pb-1 transition-colors">Behavior Design Layer</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Daily Focus Target</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Target hours of deep work</p>
                                    </div>
                                    <Clock className="text-slate-400" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{focusTarget}.0 <span className="text-xs font-semibold text-slate-400">hrs</span></span>
                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Daily Target</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="12"
                                        step="1"
                                        value={focusTarget}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            setFocusTarget(value);
                                            updateSettings({ daily_focus_target: value });
                                        }}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-green-500"
                                        style={{
                                            background: `linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(34, 197, 94) ${((focusTarget - 1) / 11) * 100}%, rgb(226, 232, 240) ${((focusTarget - 1) / 11) * 100}%, rgb(226, 232, 240) 100%)`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Max Tab Switches</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Threshold for context switching</p>
                                    </div>
                                    <LayoutDashboard className="text-slate-400" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{tabSwitchLimit} <span className="text-xs font-semibold text-slate-400">switches</span></span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            goalsData.dailyProgress.tabSwitches <= tabSwitchLimit / 2 ? 'text-green-500' : 
                                            goalsData.dailyProgress.tabSwitches <= tabSwitchLimit ? 'text-amber-500' : 
                                            'text-rose-500'
                                        }`}>
                                            {goalsData.dailyProgress.tabSwitches <= tabSwitchLimit / 2 ? 'Low friction' : 
                                             goalsData.dailyProgress.tabSwitches <= tabSwitchLimit ? 'Moderate' : 
                                             'High friction'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        step="5"
                                        value={tabSwitchLimit}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            setTabSwitchLimit(value);
                                            updateSettings({ max_tab_switches: value });
                                        }}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-green-500"
                                        style={{
                                            background: `linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(34, 197, 94) ${((tabSwitchLimit - 5) / 45) * 100}%, rgb(226, 232, 240) ${((tabSwitchLimit - 5) / 45) * 100}%, rgb(226, 232, 240) 100%)`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Digital Sunset</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Auto-cutoff for all screens</p>
                                    </div>
                                    <Moon className="text-slate-400" size={18} />
                                </div>
                                <div className="flex items-center gap-4 mt-8">
                                    <input
                                        type="time"
                                        value={digitalSunset}
                                        onChange={(e) => {
                                            setDigitalSunset(e.target.value);
                                            updateSettings({ digital_sunset: e.target.value });
                                        }}
                                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-lg px-4 py-3 flex-1 flex justify-between items-center shadow-sm transition-colors cursor-pointer text-slate-900 dark:text-slate-50"
                                    />
                                    <button 
                                        className="w-12 h-12 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-md shadow-green-500/20 cursor-pointer transition-colors"
                                        onClick={() => {
                                            // Notification functionality can be added here
                                            alert(`Notification set for ${digitalSunset}`);
                                        }}
                                    >
                                        <Bell size={20} fill="currentColor" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Alert Sensitivity</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Recovery nudge frequency</p>
                                    </div>
                                    <Bell size={18} className="text-slate-400" />
                                </div>
                                <div className="flex gap-2 mt-8">
                                    {['Quiet', 'Balanced', 'Active'].map((s) => (
                                        <button 
                                            key={s} 
                                            onClick={() => {
                                                setAlertSensitivity(s);
                                                updateSettings({ alert_sensitivity: s });
                                            }}
                                            className={`flex-1 py-3 text-[10px] font-black rounded-xl border transition-colors uppercase tracking-widest cursor-pointer ${
                                                alertSensitivity === s
                                                    ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-500/20'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="font-bold flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                                        <TrendingUp size={20} />
                                    </div>
                                    Recovery Streak
                                </h4>
                                {goalsData.recoveryStreak ? (
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <span className="text-slate-900 dark:text-slate-100 text-sm">{goalsData.recoveryStreak.currentStreak} days</span> above {goalsData.recoveryStreak.threshold} score
                                    </p>
                                ) : (
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wide">No streak yet</p>
                                )}
                            </div>
                            {goalsData.recoveryStreak && goalsData.recoveryStreak.currentStreak > 0 ? (
                                <div className="flex justify-between items-center gap-2 max-w-xl mx-auto">
                                    {Array.from({ length: Math.min(9, goalsData.recoveryStreak.currentStreak + 2) }).map((_, i) => {
                                        const isComplete = i < goalsData.recoveryStreak!.currentStreak;
                                        const isCurrent = i === goalsData.recoveryStreak!.currentStreak;
                                        const isFuture = i > goalsData.recoveryStreak!.currentStreak;
                                        const dayLabel = ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T'][i];
                                        
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs ${
                                                    isComplete ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 
                                                    isCurrent ? 'bg-green-50 dark:bg-green-900/30 text-green-500 border border-green-200 dark:border-green-800' : 
                                                    'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'
                                                }`}>
                                                    {dayLabel}
                                                </div>
                                                {isComplete ? (
                                                    <CheckCircle2 className="text-green-500" size={16} fill="currentColor" />
                                                ) : isCurrent ? (
                                                    <div className="size-4 rounded-full border-[3px] border-green-200 dark:border-green-800" />
                                                ) : (
                                                    <div className="size-4 rounded-full border-[3px] border-slate-200 dark:border-slate-700" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Maintain a focus score above 75 for consecutive days to start your streak
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Physiological Health Goals */}
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                                    <Activity size={20} />
                                </div>
                                Physiological Health Goals
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 pb-1 transition-colors">
                                {isTracking ? 'Live Tracking' : 'Not Tracking'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Blink Health</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Optimal: 15-20 blinks/min</p>
                                    </div>
                                    <Eye className="text-cyan-500" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">
                                            {isTracking ? fatigueMetrics.blinksPerMin : '--'} 
                                            <span className="text-xs font-semibold text-slate-400 ml-1">/min</span>
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            blinkHealthPercent > 70 ? 'text-green-500' : 'text-amber-500'
                                        }`}>
                                            {isTracking ? `${Math.round(blinkHealthPercent)}% healthy` : 'Start tracking'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <div className="h-full bg-cyan-500 rounded-full relative transition-all" style={{ width: `${blinkHealthPercent}%` }}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-[3px] border-cyan-500 rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Posture Quality</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Maintain good head position</p>
                                    </div>
                                    <Gauge className="text-purple-500" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className={`text-3xl font-black ${
                                            isTracking && (fatigueMetrics.isSlumping || fatigueMetrics.isForwardHead) 
                                                ? 'text-purple-500' 
                                                : 'text-emerald-500'
                                        }`}>
                                            {isTracking ? (fatigueMetrics.isSlumping || fatigueMetrics.isForwardHead ? 'Poor' : 'Good') : '--'}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            postureHealthPercent > 70 ? 'text-green-500' : 'text-amber-500'
                                        }`}>
                                            {isTracking ? `${Math.round(postureHealthPercent)}% healthy` : 'Start tracking'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <div className="h-full bg-purple-500 rounded-full relative transition-all" style={{ width: `${postureHealthPercent}%` }}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-[3px] border-purple-500 rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Eye Health</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Minimize eye strain</p>
                                    </div>
                                    <Eye className="text-amber-500" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className={`text-3xl font-black ${
                                            isTracking && fatigueMetrics.eyeFatigue ? 'text-amber-500' : 'text-emerald-500'
                                        }`}>
                                            {isTracking ? (fatigueMetrics.eyeFatigue ? 'Strain' : 'Healthy') : '--'}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            eyeHealthPercent > 70 ? 'text-green-500' : 'text-amber-500'
                                        }`}>
                                            {isTracking ? `${Math.round(eyeHealthPercent)}% healthy` : 'Start tracking'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <div className="h-full bg-amber-500 rounded-full relative transition-all" style={{ width: `${eyeHealthPercent}%` }}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-[3px] border-amber-500 rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!isTracking && (
                            <div className="mt-6 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl flex items-center gap-3 transition-colors">
                                <Lightbulb className="text-indigo-500 dark:text-indigo-400" size={18} fill="currentColor" />
                                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">Go to Dashboard and start CV tracking to see your real-time physiological health metrics.</p>
                            </div>
                        )}
                    </section>

                    {/* Behavioral Tracking Goals */}
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                                    <MousePointer size={20} />
                                </div>
                                Behavioral Tracking Goals
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 pb-1 transition-colors">
                                {stats?.factors ? 'Live Data' : 'No Data'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tab Switching Goal */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Tab Switches</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Target: &lt; {displaySettings.max_tab_switches}/hr</p>
                                    </div>
                                    <LayoutDashboard className="text-blue-500" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">
                                            {stats?.tab_switches ?? '--'}
                                            <span className="text-xs font-semibold text-slate-400 ml-1">switches</span>
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            stats?.factors?.tabSwitching 
                                                ? (stats.factors.tabSwitching.penalty > stats.factors.tabSwitching.maxWeight * 0.5 
                                                    ? 'text-rose-500' 
                                                    : 'text-green-500')
                                                : 'text-slate-400'
                                        }`}>
                                            {stats?.factors?.tabSwitching 
                                                ? `${Math.round((1 - stats.factors.tabSwitching.penalty / stats.factors.tabSwitching.maxWeight) * 100)}% on target`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <div 
                                            className={`h-full rounded-full relative transition-all ${
                                                stats?.factors?.tabSwitching
                                                    ? (stats.factors.tabSwitching.penalty > stats.factors.tabSwitching.maxWeight * 0.5 
                                                        ? 'bg-rose-500' 
                                                        : 'bg-green-500')
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                            style={{ width: `${stats?.factors?.tabSwitching ? Math.min(100, (1 - stats.factors.tabSwitching.penalty / stats.factors.tabSwitching.maxWeight) * 100) : 0}%` }}
                                        >
                                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-[3px] rounded-full shadow-sm ${
                                                stats?.factors?.tabSwitching
                                                    ? (stats.factors.tabSwitching.penalty > stats.factors.tabSwitching.maxWeight * 0.5 
                                                        ? 'border-rose-500' 
                                                        : 'border-green-500')
                                                    : 'border-slate-300 dark:border-slate-600'
                                            }`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Typing Fatigue Goal */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Typing Fatigue</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Maintain typing consistency</p>
                                    </div>
                                    <Activity className="text-purple-500" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className={`text-3xl font-black ${
                                            stats?.factors?.typingFatigue
                                                ? (stats.factors.typingFatigue.penalty > stats.factors.typingFatigue.maxWeight * 0.6 
                                                    ? 'text-purple-500' 
                                                    : 'text-emerald-500')
                                                : 'text-slate-400'
                                        }`}>
                                            {stats?.factors?.typingFatigue 
                                                ? (stats.factors.typingFatigue.penalty > stats.factors.typingFatigue.maxWeight * 0.6 
                                                    ? 'Fatigued' 
                                                    : 'Good')
                                                : 'N/A'}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            stats?.factors?.typingFatigue
                                                ? (stats.factors.typingFatigue.penalty > stats.factors.typingFatigue.maxWeight * 0.5 
                                                    ? 'text-amber-500' 
                                                    : 'text-green-500')
                                                : 'text-slate-400'
                                        }`}>
                                            {stats?.factors?.typingFatigue 
                                                ? `${Math.round((1 - stats.factors.typingFatigue.penalty / stats.factors.typingFatigue.maxWeight) * 100)}% healthy`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <div 
                                            className={`h-full rounded-full relative transition-all ${
                                                stats?.factors?.typingFatigue
                                                    ? (stats.factors.typingFatigue.penalty > stats.factors.typingFatigue.maxWeight * 0.5 
                                                        ? 'bg-amber-500' 
                                                        : 'bg-emerald-500')
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                            style={{ width: `${stats?.factors?.typingFatigue ? Math.min(100, (1 - stats.factors.typingFatigue.penalty / stats.factors.typingFatigue.maxWeight) * 100) : 0}%` }}
                                        >
                                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-[3px] rounded-full shadow-sm ${
                                                stats?.factors?.typingFatigue
                                                    ? (stats.factors.typingFatigue.penalty > stats.factors.typingFatigue.maxWeight * 0.5 
                                                        ? 'border-amber-500' 
                                                        : 'border-emerald-500')
                                                    : 'border-slate-300 dark:border-slate-600'
                                            }`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mouse Activity Goal */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Mouse Stability</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Minimize erratic movements</p>
                                    </div>
                                    <MousePointer className="text-cyan-500" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className={`text-3xl font-black ${
                                            stats?.factors?.erraticMouse
                                                ? (stats.factors.erraticMouse.penalty > stats.factors.erraticMouse.maxWeight * 0.6 
                                                    ? 'text-cyan-500' 
                                                    : 'text-emerald-500')
                                                : 'text-slate-400'
                                        }`}>
                                            {stats?.factors?.erraticMouse 
                                                ? (stats.factors.erraticMouse.penalty > stats.factors.erraticMouse.maxWeight * 0.6 
                                                    ? 'Erratic' 
                                                    : 'Smooth')
                                                : 'N/A'}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            stats?.factors?.erraticMouse
                                                ? (stats.factors.erraticMouse.penalty > stats.factors.erraticMouse.maxWeight * 0.5 
                                                    ? 'text-amber-500' 
                                                    : 'text-green-500')
                                                : 'text-slate-400'
                                        }`}>
                                            {stats?.factors?.erraticMouse 
                                                ? `${Math.round((1 - stats.factors.erraticMouse.penalty / stats.factors.erraticMouse.maxWeight) * 100)}% stable`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <div 
                                            className={`h-full rounded-full relative transition-all ${
                                                stats?.factors?.erraticMouse
                                                    ? (stats.factors.erraticMouse.penalty > stats.factors.erraticMouse.maxWeight * 0.5 
                                                        ? 'bg-amber-500' 
                                                        : 'bg-emerald-500')
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                            style={{ width: `${stats?.factors?.erraticMouse ? Math.min(100, (1 - stats.factors.erraticMouse.penalty / stats.factors.erraticMouse.maxWeight) * 100) : 0}%` }}
                                        >
                                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-[3px] rounded-full shadow-sm ${
                                                stats?.factors?.erraticMouse
                                                    ? (stats.factors.erraticMouse.penalty > stats.factors.erraticMouse.maxWeight * 0.5 
                                                        ? 'border-amber-500' 
                                                        : 'border-emerald-500')
                                                    : 'border-slate-300 dark:border-slate-600'
                                            }`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scroll Activity Goal */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 tracking-tight">Scroll Pattern</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Avoid anxious scrolling</p>
                                    </div>
                                    <ScrollText className="text-orange-500" size={18} />
                                </div>
                                <div className="mt-8 mb-2">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className={`text-3xl font-black ${
                                            stats?.factors?.anxiousScroll
                                                ? (stats.factors.anxiousScroll.penalty > stats.factors.anxiousScroll.maxWeight * 0.6 
                                                    ? 'text-orange-500' 
                                                    : 'text-emerald-500')
                                                : 'text-slate-400'
                                        }`}>
                                            {stats?.factors?.anxiousScroll 
                                                ? (stats.factors.anxiousScroll.penalty > stats.factors.anxiousScroll.maxWeight * 0.6 
                                                    ? 'Anxious' 
                                                    : 'Calm')
                                                : 'N/A'}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            stats?.factors?.anxiousScroll
                                                ? (stats.factors.anxiousScroll.penalty > stats.factors.anxiousScroll.maxWeight * 0.5 
                                                    ? 'text-amber-500' 
                                                    : 'text-green-500')
                                                : 'text-slate-400'
                                        }`}>
                                            {stats?.factors?.anxiousScroll 
                                                ? `${Math.round((1 - stats.factors.anxiousScroll.penalty / stats.factors.anxiousScroll.maxWeight) * 100)}% calm`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                                        <div 
                                            className={`h-full rounded-full relative transition-all ${
                                                stats?.factors?.anxiousScroll
                                                    ? (stats.factors.anxiousScroll.penalty > stats.factors.anxiousScroll.maxWeight * 0.5 
                                                        ? 'bg-amber-500' 
                                                        : 'bg-emerald-500')
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                            style={{ width: `${stats?.factors?.anxiousScroll ? Math.min(100, (1 - stats.factors.anxiousScroll.penalty / stats.factors.anxiousScroll.maxWeight) * 100) : 0}%` }}
                                        >
                                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-[3px] rounded-full shadow-sm ${
                                                stats?.factors?.anxiousScroll
                                                    ? (stats.factors.anxiousScroll.penalty > stats.factors.anxiousScroll.maxWeight * 0.5 
                                                        ? 'border-amber-500' 
                                                        : 'border-emerald-500')
                                                    : 'border-slate-300 dark:border-slate-600'
                                            }`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(!stats || !stats.factors) && (
                            <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center gap-3 transition-colors">
                                <Info className="text-blue-500 dark:text-blue-400" size={18} fill="currentColor" />
                                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Extension behavioral tracking data will appear here when available. Make sure the Chrome extension is running.</p>
                            </div>
                        )}
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 sticky top-24 shadow-sm transition-colors">
                        <h3 className="text-xl font-bold mb-8">Daily Standing</h3>
                        
                        {/* Deep Work Progress */}
                        <div className="mb-8">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deep Work</span>
                                <span className="text-sm font-black text-slate-900 dark:text-slate-50">
                                    {goalsData.dailyProgress.activeHours}h {goalsData.dailyProgress.activeMinutes}m / {displaySettings.daily_focus_target}.0 hrs
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${
                                        goalsData.dailyProgress.activePercentage >= 100 ? 'bg-green-500' : 
                                        goalsData.dailyProgress.activePercentage >= 70 ? 'bg-green-500' : 
                                        'bg-amber-500'
                                    }`} 
                                    style={{ width: `${Math.min(100, goalsData.dailyProgress.activePercentage)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1.5 font-medium">
                                {goalsData.dailyProgress.activePercentage >= 100 ? (
                                    <>
                                        <CheckCircle2 size={12} className="text-green-500" />
                                        Daily goal achieved!
                                    </>
                                ) : (
                                    <>
                                        <Info size={12} />
                                        {goalsData.dailyProgress.remainingMinutes} mins remaining to hit daily goal
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Tab Switches Progress */}
                        <div className="mb-8">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Context Switches</span>
                                <span className={`text-sm font-black ${
                                    goalsData.dailyProgress.tabSwitches > displaySettings.max_tab_switches ? 'text-rose-500' : 'text-green-500'
                                }`}>
                                    {goalsData.dailyProgress.tabSwitches} / {displaySettings.max_tab_switches} limit
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${
                                        goalsData.dailyProgress.tabSwitches > displaySettings.max_tab_switches ? 'bg-rose-500' : 'bg-green-500/40'
                                    }`} 
                                    style={{ width: `${Math.min(100, (goalsData.dailyProgress.tabSwitches / displaySettings.max_tab_switches) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1.5 font-medium">
                                {goalsData.dailyProgress.tabSwitches <= displaySettings.max_tab_switches / 2 ? (
                                    <>
                                        <CheckCircle2 size={12} className="text-green-500" />
                                        Highly stable behavior today
                                    </>
                                ) : goalsData.dailyProgress.tabSwitches <= displaySettings.max_tab_switches ? (
                                    <>
                                        <Info size={12} />
                                        Moderate context switching
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={12} className="text-rose-500" />
                                        High context switching detected
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Attention Score */}
                        <div className="mb-10">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Attention Score</span>
                                <span className="text-sm font-black text-slate-900 dark:text-slate-50">
                                    {Math.round(goalsData.dailyProgress.focusScore)} / 100
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${
                                        goalsData.dailyProgress.focusScore >= 75 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                                        goalsData.dailyProgress.focusScore >= 50 ? 'bg-amber-500' : 
                                        'bg-rose-500'
                                    }`} 
                                    style={{ width: `${goalsData.dailyProgress.focusScore}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Focus Insights */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Focus Insights</p>
                            {goalsData.insights.length > 0 ? (
                                <ul className="space-y-6">
                                    {goalsData.insights.map((insight, idx) => (
                                        <li key={idx} className="flex gap-4">
                                            <div className={`w-8 h-8 rounded-full ${
                                                insight.type === 'peak' ? 'bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400' : 
                                                insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400' : 
                                                'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'
                                            } flex items-center justify-center shrink-0`}>
                                                {insight.type === 'peak' && <Lightbulb size={14} fill="currentColor" />}
                                                {insight.type === 'warning' && <AlertTriangle size={14} fill="currentColor" />}
                                                {insight.type === 'improvement' && <TrendingUp size={14} />}
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                {insight.message}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                    Continue tracking to unlock personalized insights
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
