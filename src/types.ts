export interface Settings {
    full_name: string;
    email: string;
    role?: string;
    daily_focus_target: number;
    max_tab_switches: number;
    digital_sunset: string;
    alert_sensitivity: string;
    auto_trigger_breathing?: number;
    block_notifications?: number;
    smart_breaks?: number;
    burnout_alerts_level?: number;
    micro_break_interval?: string;
}

export interface Activity {
    id: number;
    type: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    score_impact: number;
}

export interface EventLog {
    id: number;
    timestamp: string;
    event_type: string;
    message: string;
}

export interface BehavioralFactors {
    tabSwitching: {
        penalty: number;
        switches: number;
        maxWeight: number;
    };
    typingFatigue: {
        penalty: number;
        maxWeight: number;
    };
    idle: {
        penalty: number;
        state: string;
        maxWeight: number;
    };
    clickAccuracy: {
        penalty: number;
        maxWeight: number;
    };
    lateNight: {
        penalty: number;
        hour: number;
        maxWeight: number;
    };
    erraticMouse: {
        penalty: number;
        maxWeight: number;
    };
    anxiousScroll: {
        penalty: number;
        maxWeight: number;
    };
}

export interface Insight {
    type: 'warning' | 'alert' | 'info' | 'suggestion' | 'positive';
    icon: string;
    title: string;
    message: string;
}

export interface Stats {
    focus_score: number;
    active_time: string;
    idle_time: string;
    tab_switches: number;
    session_duration: string;
    score_improvement: number;
    interventions: number;
    burnout_trend: number[];
    distraction_peak: string;
    // New behavioral tracking fields
    currentScore?: number;
    factors?: BehavioralFactors;
    hourlyScores?: Array<{ hour: string; avgScore: number; count: number }>;
    trend?: number;
    insights?: Insight[];
    idleState?: string;
    // Mouse and scroll metrics
    mouseActivity?: {
        directionChanges: number;
        speed: number;
        penalty: number;
    };
    scrollActivity?: {
        rapidScrolls: number;
        penalty: number;
    };
    // Typing metrics
    typingMetrics?: {
        avgInterval: number;
        variance: number;
        errorRate: number;
        fatigued: boolean;
    };
    // Click metrics
    clickMetrics?: {
        hesitationRate: number;
        fatigued: boolean;
    };
}

// Goals and Daily Tracking Types
export interface DailyMetrics {
    date: string; // YYYY-MM-DD
    focusScore: number;
    activeMinutes: number;
    tabSwitches: number;
    interventions: number;
    physiologicalScore: number;
    timestamp: number;
}

export interface WeeklyTrend {
    improvement: number; // percentage change
    percentChange: number; // percentage change (alias for improvement)
    message: string; // descriptive message about the trend
    avgSessionIncrease: number; // minutes
    currentWeekAvg: number;
    previousWeekAvg: number;
    dailyScores: number[];
}

export interface RecoveryStreak {
    currentStreak: number; // consecutive days
    threshold: number; // minimum score to maintain streak
    dailyScores: Array<{
        date: string;
        dayOfWeek: string;
        score: number;
        achieved: boolean;
    }>;
}

export interface DailyProgress {
    activeHours: number;
    activeMinutes: number;
    targetHours: number;
    activePercentage: number;
    remainingMinutes: number;
    tabSwitches: number;
    tabSwitchLimit: number;
    tabSwitchPercentage: number;
    focusScore: number;
    scorePercentage: number;
}

export interface FocusInsight {
    icon: string;
    message: string;
    type: 'positive' | 'warning' | 'tip' | 'peak' | 'improvement';
}
