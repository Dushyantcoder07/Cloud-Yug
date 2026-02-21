/**
 * Goals Tracking Hook
 * Automatically tracks and calculates goals-related metrics
 */

import { useState, useEffect } from 'react';
import { Settings, Stats, WeeklyTrend, RecoveryStreak, DailyProgress, FocusInsight } from '../types';
import { PhysiologicalMetrics } from './useFatigueDetection';
import {
    calculateWeeklyTrend,
    calculateRecoveryStreak,
    calculateDailyProgress,
    generateFocusInsights,
    getMotivationalMessage
} from '../lib/goalsCalculations';
import { updateTodayMetrics,cleanupOldMetrics } from '../lib/goalsStorage';

export interface GoalsTrackingData {
    weeklyTrend: WeeklyTrend | null;
    recoveryStreak: RecoveryStreak | null;
    dailyProgress: DailyProgress;
    insights: FocusInsight[];
    motivationalMessage: string;
    isLoading: boolean;
}

export function useGoalsTracking(
    stats: Stats | null,
    settings: Settings | null,
    fatigueMetrics?: PhysiologicalMetrics
): GoalsTrackingData {
    const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend | null>(null);
    const [recoveryStreak, setRecoveryStreak] = useState<RecoveryStreak | null>(null);
    const [dailyProgress, setDailyProgress] = useState<DailyProgress>(
        calculateDailyProgress(null, null)
    );
    const [insights, setInsights] = useState<FocusInsight[]>([]);
    const [motivationalMessage, setMotivationalMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Load goals data on mount and when stats change
    useEffect(() => {
        async function loadGoalsData() {
            setIsLoading(true);
            
            try {
                // Calculate all metrics in parallel
                const [trend, streak, currentInsights] = await Promise.all([
                    calculateWeeklyTrend(),
                    calculateRecoveryStreak(),
                    generateFocusInsights(stats, fatigueMetrics)
                ]);
                
                const progress = calculateDailyProgress(stats, settings);
                
                setWeeklyTrend(trend);
                setRecoveryStreak(streak);
                setDailyProgress(progress);
                setInsights(currentInsights);
                setMotivationalMessage(getMotivationalMessage(progress, trend));
                
            } catch (error) {
                console.error('Failed to load goals data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        
        loadGoalsData();
        
        // Cleanup old metrics (keep last 30 days)
        cleanupOldMetrics(30);
    }, [stats, settings, fatigueMetrics]);

    // Auto-save today's metrics every minute
    useEffect(() => {
        if (!stats) return;

        async function saveCurrentMetrics() {
            try {
                const progress = calculateDailyProgress(stats, settings);
                
                await updateTodayMetrics({
                    focusScore: stats.focus_score || 0,
                    activeMinutes: progress.activeHours * 60 + progress.activeMinutes,
                    tabSwitches: stats.tab_switches || 0,
                    interventions: stats.interventions || 0,
                    physiologicalScore: fatigueMetrics?.physiologicalScore || 0
                });
            } catch (error) {
                console.error('Failed to save current metrics:', error);
            }
        }

        // Save immediately
        saveCurrentMetrics();

        // Then save every minute
        const interval = setInterval(saveCurrentMetrics, 60000);

        return () => clearInterval(interval);
    }, [stats, settings, fatigueMetrics]);

    return {
        weeklyTrend,
        recoveryStreak,
        dailyProgress,
        insights,
        motivationalMessage,
        isLoading
    };
}
