/**
 * Goals Calculations
 * Utility functions for calculating goals-related metrics
 */

import { DailyMetrics, WeeklyTrend, RecoveryStreak, DailyProgress, FocusInsight, Settings, Stats } from '../types';
import { PhysiologicalMetrics } from '../hooks/useFatigueDetection';
import { getLastNDaysMetrics } from './goalsStorage';

/**
 * Calculate weekly trend comparing current week to previous week
 */
export async function calculateWeeklyTrend(): Promise<WeeklyTrend> {
    const last14Days = await getLastNDaysMetrics(14);
    
    if (last14Days.length < 7) {
        return {
            improvement: 0,
            percentChange: 0,
            message: 'Not enough data yet. Keep tracking!',
            avgSessionIncrease: 0,
            currentWeekAvg: 0,
            previousWeekAvg: 0,
            dailyScores: []
        };
    }
    
    // Split into current week (last 7 days) and previous week (days 7-14)
    const currentWeek = last14Days.slice(-7);
    const previousWeek = last14Days.slice(0, Math.min(7, last14Days.length - 7));
    
    // Calculate averages
    const currentWeekAvg = currentWeek.reduce((sum, day) => sum + day.focusScore, 0) / currentWeek.length;
    const previousWeekAvg = previousWeek.length > 0
        ? previousWeek.reduce((sum, day) => sum + day.focusScore, 0) / previousWeek.length
        : currentWeekAvg;
    
    const currentAvgSession = currentWeek.reduce((sum, day) => sum + day.activeMinutes, 0) / currentWeek.length;
    const previousAvgSession = previousWeek.length > 0
        ? previousWeek.reduce((sum, day) => sum + day.activeMinutes, 0) / previousWeek.length
        : currentAvgSession;
    
    // Calculate improvements
    const improvement = previousWeekAvg > 0
        ? Math.round(((currentWeekAvg - previousWeekAvg) / previousWeekAvg) * 100)
        : 0;
    
    const avgSessionIncrease = Math.round(currentAvgSession - previousAvgSession);
    
    // Generate message
    let message = '';
    if (improvement > 10) {
        message = `Focus score improved by ${improvement}% this week`;
    } else if (improvement > 0) {
        message = `Steady progress with ${improvement}% improvement`;
    } else if (improvement === 0) {
        message = 'Maintaining consistent focus levels';
    } else {
        message = `Focus score declined by ${Math.abs(improvement)}% this week`;
    }
    
    return {
        improvement,
        percentChange: improvement, // alias for compatibility
        message,
        avgSessionIncrease,
        currentWeekAvg: Math.round(currentWeekAvg),
        previousWeekAvg: Math.round(previousWeekAvg),
        dailyScores: currentWeek.map(day => day.focusScore)
    };
}

/**
 * Calculate recovery streak (consecutive days above threshold)
 */
export async function calculateRecoveryStreak(threshold: number = 75): Promise<RecoveryStreak> {
    const last9Days = await getLastNDaysMetrics(9);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const dailyScores = last9Days.map(day => {
        const date = new Date(day.date);
        return {
            date: day.date,
            dayOfWeek: dayNames[date.getDay()],
            score: day.focusScore,
            achieved: day.focusScore >= threshold
        };
    });
    
    // Calculate current streak from the end
    let currentStreak = 0;
    for (let i = dailyScores.length - 1; i >= 0; i--) {
        if (dailyScores[i].achieved) {
            currentStreak++;
        } else {
            break;
        }
    }
    
    return {
        currentStreak,
        threshold,
        dailyScores
    };
}

/**
 * Calculate daily progress towards goals
 */
export function calculateDailyProgress(stats: Stats | null, settings: Settings | null): DailyProgress {
    if (!stats || !settings) {
        return {
            activeHours: 0,
            activeMinutes: 0,
            targetHours: settings?.daily_focus_target || 4,
            activePercentage: 0,
            remainingMinutes: settings ? settings.daily_focus_target * 60 : 240,
            tabSwitches: 0,
            tabSwitchLimit: settings?.max_tab_switches || 15,
            tabSwitchPercentage: 0,
            focusScore: 0,
            scorePercentage: 0
        };
    }
    
    // Parse active_time (format: "Xh Ym" or "Xm")
    const activeMinutes = parseTimeString(stats.active_time);
    const activeHours = Math.floor(activeMinutes / 60);
    const targetMinutes = settings.daily_focus_target * 60;
    const activePercentage = Math.min(100, Math.round((activeMinutes / targetMinutes) * 100));
    const remainingMinutes = Math.max(0, targetMinutes - activeMinutes);
    
    // Tab switches
    const tabSwitches = stats.tab_switches || 0;
    const tabSwitchLimit = settings.max_tab_switches;
    const tabSwitchPercentage = Math.min(100, Math.round((tabSwitches / tabSwitchLimit) * 100));
    
    // Focus score
    const focusScore = stats.focus_score || 0;
    const scorePercentage = focusScore;
    
    return {
        activeHours,
        activeMinutes: activeMinutes % 60,
        targetHours: settings.daily_focus_target,
        activePercentage,
        remainingMinutes,
        tabSwitches,
        tabSwitchLimit,
        tabSwitchPercentage,
        focusScore,
        scorePercentage
    };
}

/**
 * Parse time string like "3h 20m" or "45m" to minutes
 */
function parseTimeString(timeStr: string): number {
    let minutes = 0;
    
    // Match hours
    const hoursMatch = timeStr.match(/(\d+)h/);
    if (hoursMatch) {
        minutes += parseInt(hoursMatch[1]) * 60;
    }
    
    // Match minutes
    const minutesMatch = timeStr.match(/(\d+)m/);
    if (minutesMatch) {
        minutes += parseInt(minutesMatch[1]);
    }
    
    return minutes;
}

/**
 * Generate personalized focus insights based on patterns
 */
export async function generateFocusInsights(
    stats: Stats | null,
    fatigueMetrics?: PhysiologicalMetrics | null
): Promise<FocusInsight[]> {
    const insights: FocusInsight[] = [];
    
    if (!stats) {
        return [{
            icon: 'lightbulb',
            message: 'Start tracking to receive personalized focus insights based on your patterns.',
            type: 'tip'
        }];
    }
    
    // Analyze hourly scores for peak times
    if (stats.hourlyScores && stats.hourlyScores.length > 0) {
        const sortedHours = [...stats.hourlyScores].sort((a, b) => b.avgScore - a.avgScore);
        const peakHour = sortedHours[0];
        
        if (peakHour && peakHour.avgScore > 70) {
            const startHour = parseInt(peakHour.hour);
            const endHour = startHour + 2;
            insights.push({
                icon: 'lightbulb',
                message: `Your attention peaks between ${formatHour(startHour)} and ${formatHour(endHour)}. Schedule deep work here.`,
                type: 'positive'
            });
        }
    }
    
    // Analyze tab switching patterns
    if (stats.factors?.tabSwitching) {
        const switches = stats.factors.tabSwitching.switches;
        const penalty = stats.factors.tabSwitching.penalty;
        const maxWeight = stats.factors.tabSwitching.maxWeight;
        
        if (penalty > maxWeight * 0.6) {
            insights.push({
                icon: 'alert-triangle',
                message: `High tab switching frequency detected (${switches} switches). This fragments attention and reduces deep work capacity.`,
                type: 'warning'
            });
        }
    }
    
    // Analyze late night patterns
    if (stats.factors?.lateNight && stats.factors.lateNight.penalty > 0) {
        const hour = stats.factors.lateNight.hour;
        insights.push({
            icon: 'alert-triangle',
            message: `Late-night activity detected (after ${hour}:00). This can impact next-day focus and recovery.`,
            type: 'warning'
        });
    }
    
    // Analyze physiological metrics if available
    if (fatigueMetrics) {
        if (fatigueMetrics.eyeFatigue) {
            insights.push({
                icon: 'lightbulb',
                message: 'Eye strain detected. Try the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.',
                type: 'tip'
            });
        }
        
        if (fatigueMetrics.isSlumping || fatigueMetrics.isForwardHead) {
            insights.push({
                icon: 'lightbulb',
                message: 'Poor posture detected. Adjust your screen height and sit upright to reduce neck strain.',
                type: 'tip'
            });
        }
    }
    
    // Positive reinforcement
    if (stats.focus_score >= 80) {
        insights.push({
            icon: 'lightbulb',
            message: `Excellent focus score today (${stats.focus_score}/100)! Maintain this rhythm for optimal productivity.`,
            type: 'positive'
        });
    }
    
    // Return max 3 insights, prioritizing warnings
    return insights
        .sort((a, b) => {
            const order = { warning: 0, tip: 1, positive: 2 };
            return order[a.type] - order[b.type];
        })
        .slice(0, 3);
}

/**
 * Format hour number to 12-hour format
 */
function formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
}

/**
 * Calculate if daily goal is achieved
 */
export function isDailyGoalAchieved(dailyProgress: DailyProgress): boolean {
    return dailyProgress.activePercentage >= 100;
}

/**
 * Get motivational message based on progress
 */
export function getMotivationalMessage(dailyProgress: DailyProgress, weeklyTrend: WeeklyTrend): string {
    if (dailyProgress.activePercentage >= 100) {
        return `🎉 Daily goal achieved! You've completed ${dailyProgress.activeHours}h ${dailyProgress.activeMinutes}m of focused work.`;
    }
    
    if (weeklyTrend.improvement > 0) {
        return `📈 You're ${weeklyTrend.improvement}% more focused than last week. Keep up the momentum!`;
    }
    
    if (dailyProgress.activePercentage >= 75) {
        return `💪 Almost there! Just ${dailyProgress.remainingMinutes} more minutes to reach your goal.`;
    }
    
    if (dailyProgress.activePercentage >= 50) {
        return `🔥 Halfway to your daily target. Stay focused!`;
    }
    
    return `🎯 ${dailyProgress.remainingMinutes} minutes remaining to hit today's focus goal.`;
}
