/**
 * BehaviorAlertPopup
 *
 * A centered modal-style alert card with backdrop.
 * Shows the highest-priority alert; dismiss queues the next one.
 * Follows the app's blue/slate design language with dark-mode support.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X,
    AlertTriangle,
    Info,
    AlertCircle,
    Wind,
    Dumbbell,
    Eye,
    Coffee,
} from 'lucide-react';
import { BehaviorAlert, AlertSeverity, WellnessType } from '../hooks/useBehaviorAlerts';

// ─── Config ───────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, {
    gradient: string;
    iconBg: string;
    iconColor: string;
    badge: string;
    badgeText: string;
    ctaClass: string;
    Icon: React.ElementType;
}> = {
    info: {
        gradient: 'from-blue-500 to-blue-600',
        iconBg: 'bg-blue-100 dark:bg-blue-900/50',
        iconColor: 'text-blue-600 dark:text-blue-300',
        badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
        badgeText: 'Heads Up',
        ctaClass: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30',
        Icon: Info,
    },
    warning: {
        gradient: 'from-amber-500 to-orange-500',
        iconBg: 'bg-amber-100 dark:bg-amber-900/50',
        iconColor: 'text-amber-600 dark:text-amber-300',
        badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
        badgeText: 'Warning',
        ctaClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-400/30',
        Icon: AlertTriangle,
    },
    danger: {
        gradient: 'from-red-500 to-rose-600',
        iconBg: 'bg-red-100 dark:bg-red-900/50',
        iconColor: 'text-red-600 dark:text-red-300',
        badge: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300',
        badgeText: 'Action Needed',
        ctaClass: 'bg-red-600 hover:bg-red-700 shadow-red-500/30',
        Icon: AlertCircle,
    },
};

const WELLNESS_ICONS: Record<WellnessType, React.ElementType> = {
    breathing: Wind,
    stretch: Dumbbell,
    eyeRest: Eye,
    break: Coffee,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface BehaviorAlertPopupProps {
    alerts: BehaviorAlert[];
    onDismiss: (id: string) => void;
    onAction: (alert: BehaviorAlert) => void;
}

export function BehaviorAlertPopup({ alerts, onDismiss, onAction }: BehaviorAlertPopupProps) {
    // Only show the first (highest-priority) alert at a time
    const alert = alerts[0];

    return (
        <AnimatePresence mode="wait">
            {alert && (
                <div key={alert.id} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => onDismiss(alert.id)}
                    />

                    {/* Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.88, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88, y: 24 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                        {/* Top gradient accent */}
                        {(() => {
                            const cfg = SEVERITY_CONFIG[alert.severity];
                            const SeverityIcon = cfg.Icon;
                            const WellnessIcon = WELLNESS_ICONS[alert.wellnessType] ?? Wind;
                            return (
                                <>
                                    <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />

                                    <div className="p-8">
                                        {/* Badge + close */}
                                        <div className="flex items-center justify-between mb-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                                                <SeverityIcon size={11} />
                                                {cfg.badgeText}
                                            </span>
                                            <button
                                                onClick={() => onDismiss(alert.id)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                aria-label="Dismiss"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>

                                        {/* Icon + Title */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${cfg.iconBg}`}>
                                                <SeverityIcon size={22} className={cfg.iconColor} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
                                                    {alert.title}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                    {alert.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Suggestion */}
                                        <div className="ml-16 mb-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">💡 Suggestion: </span>
                                                {alert.suggestion}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3 ml-16">
                                            <button
                                                onClick={() => onAction(alert)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 ${cfg.ctaClass} text-white text-sm font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]`}
                                            >
                                                <WellnessIcon size={15} />
                                                {alert.ctaLabel}
                                            </button>
                                            <button
                                                onClick={() => onDismiss(alert.id)}
                                                className="px-5 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                                            >
                                                Later
                                            </button>
                                        </div>

                                        {/* Queue indicator */}
                                        {alerts.length > 1 && (
                                            <p className="text-center text-[10px] text-slate-400 mt-4">
                                                +{alerts.length - 1} more alert{alerts.length > 2 ? 's' : ''} queued
                                            </p>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

