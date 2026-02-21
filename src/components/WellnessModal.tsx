/**
 * WellnessModal
 *
 * A multi-section wellness overlay triggered by behavior alerts or manually.
 * Sections: Breathing Exercises | Desk Stretches | Eye Rest (20-20-20)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wind, Dumbbell, Eye, ChevronRight, ChevronLeft, RotateCcw, Check, PlayCircle, StopCircle } from 'lucide-react';
import { WellnessType } from '../hooks/useBehaviorAlerts';

// ─── Types ────────────────────────────────────────────────────────────────────

type BreathPhase = 'idle' | 'inhale' | 'hold1' | 'exhale' | 'hold2';

interface BreathingExercise {
    id: string;
    name: string;
    description: string;
    benefit: string;
    phases: { name: string; phase: BreathPhase; duration: number }[];
    totalCycles: number;
    color: string;
}

interface StretchExercise {
    id: string;
    name: string;
    description: string;
    duration: number; // seconds
    emoji: string;
    instructions: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BREATHING_EXERCISES: BreathingExercise[] = [
    {
        id: '4-7-8',
        name: '4-7-8 Breathing',
        description: 'A calming technique that activates the parasympathetic nervous system.',
        benefit: 'Reduces anxiety & promotes sleep',
        phases: [
            { name: 'Inhale', phase: 'inhale', duration: 4 },
            { name: 'Hold', phase: 'hold1', duration: 7 },
            { name: 'Exhale', phase: 'exhale', duration: 8 },
        ],
        totalCycles: 4,
        color: 'blue',
    },
    {
        id: 'box',
        name: 'Box Breathing',
        description: 'Used by Navy SEALs to maintain calm under pressure. Equal phases.',
        benefit: 'Improves focus & stress control',
        phases: [
            { name: 'Inhale', phase: 'inhale', duration: 4 },
            { name: 'Hold', phase: 'hold1', duration: 4 },
            { name: 'Exhale', phase: 'exhale', duration: 4 },
            { name: 'Hold', phase: 'hold2', duration: 4 },
        ],
        totalCycles: 4,
        color: 'purple',
    },
    {
        id: 'deep',
        name: 'Deep Belly Breathing',
        description: 'Slow diaphragmatic breathing to quickly lower cortisol.',
        benefit: 'Resets nervous system fast',
        phases: [
            { name: 'Inhale deeply', phase: 'inhale', duration: 5 },
            { name: 'Hold', phase: 'hold1', duration: 2 },
            { name: 'Exhale slowly', phase: 'exhale', duration: 7 },
        ],
        totalCycles: 5,
        color: 'teal',
    },
];

const STRETCH_EXERCISES: StretchExercise[] = [
    {
        id: 'neck',
        name: 'Neck Rolls',
        description: 'Relieve tension from staring at screens.',
        duration: 30,
        emoji: '🧘',
        instructions: [
            'Drop your chin to your chest',
            'Slowly roll your head to the right',
            'Tilt back slightly, then roll to the left',
            'Complete 3 full, slow rotations each direction',
        ],
    },
    {
        id: 'shoulder',
        name: 'Shoulder Rolls',
        description: 'Release upper-back and shoulder tension.',
        duration: 30,
        emoji: '🏋️',
        instructions: [
            'Sit upright in your chair',
            'Roll both shoulders forward in a large circle x5',
            'Then roll backwards x5',
            'Finish with a shoulder squeeze — hold 5 seconds',
        ],
    },
    {
        id: 'wrist',
        name: 'Wrist & Finger Stretch',
        description: 'Prevent carpal tunnel from typing.',
        duration: 30,
        emoji: '🤲',
        instructions: [
            'Extend one arm, palm facing out',
            'Gently pull fingers back with other hand — hold 15s',
            'Then curl fingers forward — hold 15s',
            'Repeat on other hand',
        ],
    },
    {
        id: 'chest',
        name: 'Chest Opener',
        description: 'Counteract the forward hunch from sitting.',
        duration: 30,
        emoji: '💪',
        instructions: [
            'Clasp hands behind your back',
            'Straighten arms and lift them slightly',
            'Open chest wide, look upward',
            'Hold for 20 seconds, breathe deeply',
        ],
    },
    {
        id: 'hip',
        name: 'Seated Hip Flexor',
        description: 'Reduce tightness from prolonged sitting.',
        duration: 40,
        emoji: '🪑',
        instructions: [
            'Sit at the edge of your chair',
            'Slide one foot back behind you',
            'Sit tall and feel the stretch in hip front',
            'Hold 20 seconds each side',
        ],
    },
];

// ─── Colour helpers ───────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { ring: string; fill: string; text: string; bg: string }> = {
    blue:   { ring: 'stroke-blue-500',   fill: 'fill-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/30' },
    purple: { ring: 'stroke-purple-500', fill: 'fill-purple-500/10', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    teal:   { ring: 'stroke-teal-500',   fill: 'fill-teal-500/10',   text: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-50 dark:bg-teal-900/30' },
};

// ─── Breathing Section ────────────────────────────────────────────────────────

function BreathingSection() {
    const [selectedEx, setSelectedEx] = useState<BreathingExercise>(BREATHING_EXERCISES[0]);
    const [isRunning, setIsRunning] = useState(false);
    const [phaseIdx, setPhaseIdx] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const [cycleCount, setCycleCount] = useState(0);
    const [done, setDone] = useState(false);

    const timerRef = useRef<number | null>(null);

    const currentPhase = selectedEx.phases[phaseIdx];
    const colors = COLOR_MAP[selectedEx.color] ?? COLOR_MAP.blue;
    const isInhale = currentPhase?.phase === 'inhale';
    const circleScale = isRunning
        ? (currentPhase?.phase === 'inhale' ? 1.35 : currentPhase?.phase === 'exhale' ? 0.75 : 1)
        : 1;

    const stop = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRunning(false);
        setPhaseIdx(0);
        setRemaining(0);
        setCycleCount(0);
        setDone(false);
    }, []);

    const start = useCallback(() => {
        setDone(false);
        setCycleCount(0);
        setPhaseIdx(0);
        setRemaining(selectedEx.phases[0].duration);
        setIsRunning(true);
    }, [selectedEx]);

    useEffect(() => {
        if (!isRunning) return;
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = window.setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    // Advance phase
                    setPhaseIdx(pi => {
                        const next = pi + 1;
                        if (next >= selectedEx.phases.length) {
                            // Completed one cycle
                            setCycleCount(cc => {
                                const newCc = cc + 1;
                                if (newCc >= selectedEx.totalCycles) {
                                    // All cycles done
                                    setTimeout(() => {
                                        setIsRunning(false);
                                        setDone(true);
                                        setPhaseIdx(0);
                                    }, 0);
                                    return newCc;
                                }
                                return newCc;
                            });
                            // Go back to first phase
                            setTimeout(() => {
                                setRemaining(selectedEx.phases[0].duration);
                                setPhaseIdx(0);
                            }, 0);
                            return 0;
                        }
                        setRemaining(selectedEx.phases[next].duration);
                        return next;
                    });
                    return prev - 1;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning, selectedEx]);

    // When exercise changes, reset
    useEffect(() => {
        stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEx.id]);

    return (
        <div className="space-y-6">
            {/* Exercise Selector */}
            <div className="flex gap-2 flex-wrap">
                {BREATHING_EXERCISES.map(ex => {
                    const c = COLOR_MAP[ex.color] ?? COLOR_MAP.blue;
                    return (
                        <button
                            key={ex.id}
                            onClick={() => setSelectedEx(ex)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                selectedEx.id === ex.id
                                    ? `${c.bg} ${c.text} border-current`
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            {ex.name}
                        </button>
                    );
                })}
            </div>

            {/* Main area */}
            <div className="flex flex-col lg:flex-row gap-8 items-center">
                {/* Animated Circle */}
                <div className="flex-shrink-0 flex flex-col items-center gap-4">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                        {/* Background ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700" />
                        {/* Animated breathing circle */}
                        <motion.div
                            className={`absolute rounded-full ${colors.bg} border-2 border-current ${colors.text}`}
                            animate={{ width: `${circleScale * 130}px`, height: `${circleScale * 130}px` }}
                            transition={{ duration: isRunning ? (currentPhase?.duration ?? 4) : 0.4, ease: 'easeInOut' }}
                        />
                        {/* Center text */}
                        <div className="relative z-10 text-center">
                            {done ? (
                                <div className="flex flex-col items-center gap-1">
                                    <Check size={28} className="text-green-500" />
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400">Done!</span>
                                </div>
                            ) : isRunning ? (
                                <>
                                    <p className={`text-3xl font-black ${colors.text}`}>{Math.max(0, remaining)}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                        {currentPhase?.name}
                                    </p>
                                </>
                            ) : (
                                <Wind size={28} className="text-slate-400" />
                            )}
                        </div>
                    </div>

                    {/* Cycle tracker */}
                    {!done && (
                        <div className="flex gap-1.5">
                            {Array.from({ length: selectedEx.totalCycles }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i < cycleCount ? colors.text.replace('text-', 'bg-').split(' ')[0] :
                                        'bg-slate-200 dark:bg-slate-700'
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex gap-3">
                        {!isRunning && !done && (
                            <button
                                onClick={start}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
                            >
                                <PlayCircle size={16} /> Begin
                            </button>
                        )}
                        {isRunning && (
                            <button
                                onClick={stop}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-full text-sm font-semibold transition-all"
                            >
                                <StopCircle size={16} /> Stop
                            </button>
                        )}
                        {done && (
                            <button
                                onClick={start}
                                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-green-500/20"
                            >
                                <RotateCcw size={16} /> Again
                            </button>
                        )}
                    </div>
                </div>

                {/* Info panel */}
                <div className="flex-1 space-y-4">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">{selectedEx.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedEx.description}</p>
                        <p className={`text-xs font-semibold mt-2 ${colors.text}`}>✦ {selectedEx.benefit}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase Breakdown</p>
                        {selectedEx.phases.map((ph, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                isRunning && phaseIdx === i
                                    ? `${colors.bg} border border-current ${colors.text.split(' ')[0].replace('text-', 'border-')}`
                                    : 'bg-slate-50 dark:bg-slate-800'
                            }`}>
                                <span className={`text-[10px] font-bold uppercase w-16 ${colors.text}`}>{ph.name}</span>
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${colors.bg.replace('/30', '').replace('dark:bg-', 'bg-').split(' ')[0]}`}
                                        style={{ width: `${(ph.duration / 10) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-slate-500">{ph.duration}s</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Stretch Section ──────────────────────────────────────────────────────────

function StretchSection() {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const timerRef = useRef<number | null>(null);

    const current = STRETCH_EXERCISES[currentIdx];

    const startTimer = useCallback(() => {
        setTimeLeft(current.duration);
        setIsRunning(true);
    }, [current.duration]);

    useEffect(() => {
        if (!isRunning) return;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(timerRef.current!);
                    setIsRunning(false);
                    setCompleted(c => new Set([...c, current.id]));
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, current.id]);

    return (
        <div className="space-y-6">
            {/* Progress indicators */}
            <div className="flex gap-2 flex-wrap">
                {STRETCH_EXERCISES.map((ex, i) => (
                    <button
                        key={ex.id}
                        onClick={() => { setCurrentIdx(i); setTimeLeft(null); setIsRunning(false); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                            currentIdx === i
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                                : completed.has(ex.id)
                                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent'
                        }`}
                    >
                        {completed.has(ex.id) && <Check size={10} />}
                        {ex.emoji} {ex.name}
                    </button>
                ))}
            </div>

            {/* Current stretch card */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <span className="text-3xl">{current.emoji}</span>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-1">{current.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{current.description}</p>
                    </div>
                    {/* Timer display */}
                    {timeLeft !== null && (
                        <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${
                            isRunning ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-green-100 dark:bg-green-900/40'
                        }`}>
                            {timeLeft === 0 ? (
                                <Check size={24} className="text-green-600 dark:text-green-400" />
                            ) : (
                                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{timeLeft}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <ol className="space-y-2 mb-6">
                    {current.instructions.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                            </span>
                            {step}
                        </li>
                    ))}
                </ol>

                {/* Action buttons */}
                <div className="flex gap-3 items-center">
                    {!isRunning && timeLeft !== 0 && (
                        <button
                            onClick={startTimer}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
                        >
                            <PlayCircle size={16} />
                            {timeLeft === null ? `Start ${current.duration}s Timer` : 'Resume'}
                        </button>
                    )}
                    {isRunning && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Hold the stretch…
                        </div>
                    )}
                    {/* Navigation */}
                    <div className="ml-auto flex gap-2">
                        <button
                            disabled={currentIdx === 0}
                            onClick={() => { setCurrentIdx(i => i - 1); setTimeLeft(null); setIsRunning(false); }}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            disabled={currentIdx === STRETCH_EXERCISES.length - 1}
                            onClick={() => { setCurrentIdx(i => i + 1); setTimeLeft(null); setIsRunning(false); }}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {completed.size === STRETCH_EXERCISES.length && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center"
                >
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">🎉 Full stretch routine complete! Great job.</p>
                </motion.div>
            )}
        </div>
    );
}

// ─── Eye Rest Section (20-20-20 rule) ────────────────────────────────────────

function EyeRestSection() {
    const [phase, setPhase] = useState<'idle' | 'resting' | 'done'>('idle');
    const [timeLeft, setTimeLeft] = useState(20);
    const [rounds, setRounds] = useState(0);
    const timerRef = useRef<number | null>(null);

    const start = () => {
        setPhase('resting');
        setTimeLeft(20);
    };

    const reset = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('idle');
        setTimeLeft(20);
        setRounds(0);
    };

    useEffect(() => {
        if (phase !== 'resting') return;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    setRounds(r => r + 1);
                    setPhase('done');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase]);

    return (
        <div className="space-y-6">
            {/* Rule explanation */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { num: '20', label: 'minutes', desc: 'After every 20 minutes of screen use' },
                    { num: '20', label: 'feet', desc: 'Look at something 20 feet (~6m) away' },
                    { num: '20', label: 'seconds', desc: 'For at least 20 seconds' },
                ].map((item, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-200 dark:border-slate-700">
                        <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{item.num}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">{item.desc}</div>
                    </div>
                ))}
            </div>

            {/* Timer area */}
            <div className="flex flex-col items-center gap-6 py-4">
                <AnimatePresence mode="wait">
                    {phase === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-center space-y-2"
                        >
                            <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center mx-auto">
                                <Eye size={36} className="text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Ready to rest your eyes?</p>
                        </motion.div>
                    )}
                    {phase === 'resting' && (
                        <motion.div
                            key="resting"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="text-center space-y-3"
                        >
                            <motion.div
                                className="w-32 h-32 rounded-full border-4 border-teal-400 dark:border-teal-500 flex items-center justify-center mx-auto bg-teal-50 dark:bg-teal-900/30"
                                animate={{ borderColor: ['#2dd4bf', '#0ea5e9', '#2dd4bf'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <span className="text-4xl font-black text-teal-600 dark:text-teal-400">{timeLeft}</span>
                            </motion.div>
                            <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">Look at something far away…</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Relax your eye muscles completely</p>
                        </motion.div>
                    )}
                    {phase === 'done' && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="text-center space-y-3"
                        >
                            <div className="w-32 h-32 rounded-full border-4 border-green-400 bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                                <Check size={40} className="text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-sm font-bold text-green-700 dark:text-green-400">Eyes rested! (Round {rounds})</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-3">
                    {phase === 'idle' && (
                        <button
                            onClick={start}
                            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-teal-500/20"
                        >
                            <Eye size={16} /> Start Eye Rest
                        </button>
                    )}
                    {phase === 'done' && (
                        <>
                            <button
                                onClick={start}
                                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-sm font-semibold transition-all"
                            >
                                <RotateCcw size={14} /> Again
                            </button>
                            <button
                                onClick={reset}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-full text-sm font-semibold transition-all"
                            >
                                Reset
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tip */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">Pro tip:</span> Blink slowly 10 times after the eye rest to re-moisturise your eyes — especially important in dry office environments.
                </p>
            </div>
        </div>
    );
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

type TabKey = 'breathing' | 'stretch' | 'eyeRest';

const TABS: { key: TabKey; label: string; icon: React.ElementType; wellnessTypes: WellnessType[] }[] = [
    { key: 'breathing', label: 'Breathing',  icon: Wind,     wellnessTypes: ['breathing', 'break'] },
    { key: 'stretch',   label: 'Stretches',  icon: Dumbbell, wellnessTypes: ['stretch'] },
    { key: 'eyeRest',   label: 'Eye Rest',   icon: Eye,      wellnessTypes: ['eyeRest'] },
];

function wellnessTypeToTab(type: WellnessType): TabKey {
    if (type === 'breathing' || type === 'break') return 'breathing';
    if (type === 'stretch') return 'stretch';
    if (type === 'eyeRest') return 'eyeRest';
    return 'breathing';
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export interface WellnessModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: WellnessType;
}

export function WellnessModal({ isOpen, onClose, initialTab }: WellnessModalProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('breathing');

    // When opened from an alert, jump to the right tab
    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(wellnessTypeToTab(initialTab));
        }
    }, [isOpen, initialTab]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.94, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 20 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[720px] md:max-h-[85vh] z-50 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Wellness Station</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Take a moment to reset your mind & body</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-8 pt-4 flex-shrink-0">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                                            activeTab === tab.key
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {activeTab === 'breathing' && <BreathingSection />}
                                    {activeTab === 'stretch'   && <StretchSection />}
                                    {activeTab === 'eyeRest'   && <EyeRestSection />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
