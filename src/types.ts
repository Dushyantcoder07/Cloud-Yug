export interface Settings {
    full_name: string;
    email: string;
    role: string;
    daily_focus_target: number;
    max_tab_switches: number;
    digital_sunset: string;
    alert_sensitivity: string;
    auto_trigger_breathing: number;
    block_notifications: number;
    smart_breaks: number;
    burnout_alerts_level: number;
    micro_break_interval: string;
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
}
