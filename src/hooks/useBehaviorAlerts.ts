/**
 * useBehaviorAlerts
 * 
 * Monitors Stats for abnormal behavioral patterns and emits typed alerts.
 * Each alert type has its own cooldown to prevent notification spam.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stats } from '../types';

// ─── Alert Types ──────────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'danger';
export type WellnessType = 'breathing' | 'stretch' | 'eyeRest' | 'break';

export interface BehaviorAlert {
    id: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    suggestion: string;
    ctaLabel: string;
    wellnessType: WellnessType;
    triggerKey: string; // used to prevent duplicate alerts
    createdAt: number;
}

// Per-alert-type cooldown in milliseconds
const COOLDOWNS: Record<string, number> = {
    score_danger:        5 * 60 * 1000,   // 5 min
    score_warning:      10 * 60 * 1000,   // 10 min
    tab_switching:       5 * 60 * 1000,   // 5 min
    erratic_mouse:       8 * 60 * 1000,   // 8 min
    anxious_scroll:      8 * 60 * 1000,   // 8 min
    typing_fatigue:     10 * 60 * 1000,   // 10 min
    click_accuracy:     10 * 60 * 1000,   // 10 min
    late_night:         30 * 60 * 1000,   // 30 min
    extended_session:   15 * 60 * 1000,   // 15 min
};

function uid() {
    return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Rule Definitions ────────────────────────────────────────────────────────

function evaluateAlerts(stats: Stats): Omit<BehaviorAlert, 'id' | 'createdAt'>[] {
    const alerts: Omit<BehaviorAlert, 'id' | 'createdAt'>[] = [];
    const f = stats.factors;

    // ── 1. Score dropped to danger zone
    if ((stats.focus_score ?? 100) < 35) {
        alerts.push({
            severity: 'danger',
            title: 'Focus Score Critical',
            message: `Your focus score has dropped to ${stats.focus_score}. Your cognitive state needs attention right now.`,
            suggestion: 'A 4-minute breathing exercise can help restore clarity.',
            ctaLabel: 'Start Breathing',
            wellnessType: 'breathing',
            triggerKey: 'score_danger',
        });
    } else if ((stats.focus_score ?? 100) < 55) {
        // ── 2. Score warning zone
        alerts.push({
            severity: 'warning',
            title: 'Focus Dropping',
            message: `Focus score is ${stats.focus_score} — below healthy range. Signs of cognitive load are building up.`,
            suggestion: 'Take a 2-minute break or stretch to reset.',
            ctaLabel: 'Take a Break',
            wellnessType: 'stretch',
            triggerKey: 'score_warning',
        });
    }

    // ── 3. Excessive tab switching
    const tabPenalty = f?.tabSwitching?.penalty ?? 0;
    const tabSwitches = f?.tabSwitching?.switches ?? 0;
    if (tabPenalty >= 15 || tabSwitches >= 8) {
        alerts.push({
            severity: 'warning',
            title: 'Too Much Tab Switching',
            message: `You've switched tabs ${tabSwitches} times in the last 2 minutes. This fragments your attention and increases cognitive load.`,
            suggestion: 'Close unused tabs and focus on one task at a time.',
            ctaLabel: 'Breathing Reset',
            wellnessType: 'breathing',
            triggerKey: 'tab_switching',
        });
    }

    // ── 4. Erratic mouse movement (cognitive overload signal)
    const mousePenalty = f?.erraticMouse?.penalty ?? 0;
    if (mousePenalty >= 7) {
        alerts.push({
            severity: 'info',
            title: 'Erratic Mouse Detected',
            message: 'Rapid, unfocused mouse movement suggests cognitive overload or anxiety. Your brain is working overtime.',
            suggestion: 'Rest your hands, close your eyes for 20 seconds.',
            ctaLabel: 'Eye Rest',
            wellnessType: 'eyeRest',
            triggerKey: 'erratic_mouse',
        });
    }

    // ── 5. Anxious / doom scrolling
    const scrollPenalty = f?.anxiousScroll?.penalty ?? 0;
    if (scrollPenalty >= 4) {
        alerts.push({
            severity: 'info',
            title: 'Doom Scrolling Detected',
            message: 'You\'re scrolling rapidly without pausing — a classic anxiety-browsing pattern that drains mental energy.',
            suggestion: 'Step away from the feed. Try a short breathing exercise.',
            ctaLabel: 'Calm Down',
            wellnessType: 'breathing',
            triggerKey: 'anxious_scroll',
        });
    }

    // ── 6. Typing fatigue
    const typingPenalty = f?.typingFatigue?.penalty ?? 0;
    if (typingPenalty >= 12) {
        alerts.push({
            severity: 'warning',
            title: 'Typing Fatigue',
            message: 'High error rate and irregular keystroke rhythm detected. Your fingers and focus are getting tired.',
            suggestion: 'Take a wrist and finger stretch break.',
            ctaLabel: 'Stretch Now',
            wellnessType: 'stretch',
            triggerKey: 'typing_fatigue',
        });
    }

    // ── 7. Poor click accuracy
    const clickPenalty = f?.clickAccuracy?.penalty ?? 0;
    if (clickPenalty >= 10) {
        alerts.push({
            severity: 'info',
            title: 'Click Hesitation Rising',
            message: 'You\'re hesitating before clicking more than usual — a sign of decision fatigue.',
            suggestion: 'A short break helps reset decision-making circuits.',
            ctaLabel: 'Take a Break',
            wellnessType: 'break',
            triggerKey: 'click_accuracy',
        });
    }

    // ── 8. Late night usage
    const lateNightPenalty = f?.lateNight?.penalty ?? 0;
    if (lateNightPenalty >= 8) {
        const hour = new Date().getHours();
        const timeStr = hour === 0 ? 'midnight' : `${hour}:00`;
        alerts.push({
            severity: 'warning',
            title: 'Late-Night Usage',
            message: `It's ${timeStr}. Working this late disrupts your circadian rhythm and tomorrow's cognitive performance.`,
            suggestion: 'Consider a digital sunset. Wrap up and rest.',
            ctaLabel: 'Wind Down',
            wellnessType: 'breathing',
            triggerKey: 'late_night',
        });
    }

    return alerts;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBehaviorAlerts(stats: Stats | null) {
    const [activeAlerts, setActiveAlerts] = useState<BehaviorAlert[]>([]);
    // Track when each triggerKey was last fired to enforce cooldowns
    const lastFiredRef = useRef<Record<string, number>>({});

    const dismissAlert = useCallback((id: string) => {
        setActiveAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setActiveAlerts([]);
    }, []);

    useEffect(() => {
        if (!stats) return;

        const now = Date.now();
        const candidates = evaluateAlerts(stats);

        const newAlerts: BehaviorAlert[] = [];
        for (const candidate of candidates) {
            const lastFired = lastFiredRef.current[candidate.triggerKey] ?? 0;
            const cooldown = COOLDOWNS[candidate.triggerKey] ?? 5 * 60 * 1000;

            if (now - lastFired >= cooldown) {
                // Check if this key is already actively displayed
                const alreadyShown = activeAlerts.some(a => a.triggerKey === candidate.triggerKey);
                if (!alreadyShown) {
                    lastFiredRef.current[candidate.triggerKey] = now;
                    newAlerts.push({ ...candidate, id: uid(), createdAt: now });
                }
            }
        }

        if (newAlerts.length > 0) {
            setActiveAlerts(prev => {
                // Keep at most 3 alerts visible at a time (newest first)
                const merged = [...newAlerts, ...prev];
                return merged.slice(0, 3);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stats?.focus_score, stats?.factors]);

    return { activeAlerts, dismissAlert, dismissAll };
}
