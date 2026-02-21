import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Clock, Moon, Zap, Lightbulb, Brain, Eye, Gauge, TrendingUp as TrendingUpIcon, Activity, CheckCircle2, Sparkles, Target, Shield } from 'lucide-react';
import { Stats } from '../types';
import { PhysiologicalMetrics } from '../hooks/useFatigueDetection';
import { calculateExhaustionIndex, predictFatigueTrajectory, detectExhaustionPattern } from '../lib/exhaustionEngine';
import { useAIPredictions } from '../hooks/useAIPredictions';
import { CombinedMetrics } from '../lib/ai-prediction-engine';

interface InsightsPageProps {
    stats: Stats | null;
    fatigueMetrics: PhysiologicalMetrics;
    isTracking: boolean;
}

export const InsightsPage = ({ stats, fatigueMetrics, isTracking }: InsightsPageProps) => {
    const [exhaustionData, setExhaustionData] = useState<any>(null);
    const [pattern, setPattern] = useState<any>(null);
    const [metricsHistory, setMetricsHistory] = useState<CombinedMetrics[]>([]);
    
    // Initialize AI predictions
    const aiPredictions = useAIPredictions();
    
    useEffect(() => {
        if (isTracking && stats) {
            // Use real behavioral data from extension (no mock fallback)
            if (!stats.factors) {
                return; // Wait for real data from extension
            }
            
            const behavioralMetrics = {
                tabSwitchScore: stats.factors.tabSwitching?.penalty || 0,
                typingFatigueScore: stats.factors.typingFatigue?.penalty || 0,
                clickAccuracyScore: stats.factors.clickAccuracy?.penalty || 0,
                mouseErraticScore: stats.factors.erraticMouse?.penalty || 0,
                scrollAnxietyScore: stats.factors.anxiousScroll?.penalty || 0,
                timeOfDayScore: stats.factors.lateNight?.penalty || 0,
                idleTimeScore: stats.factors.idle?.penalty || 0
            };
            
            const physiologicalMetrics = {
                eyeFatigueScore: fatigueMetrics.earScore,
                blinkRateScore: fatigueMetrics.blinkRateScore,
                earScore: fatigueMetrics.earScore,
                stressLevel: (fatigueMetrics.stressLevel / 15) * 100
            };
            
            const result = calculateExhaustionIndex(behavioralMetrics, physiologicalMetrics);
            setExhaustionData(result);
            
            const detectedPattern = detectExhaustionPattern(result.factors);
            setPattern(detectedPattern);

            // Create combined metrics snapshot
            const currentMetrics: CombinedMetrics = {
                timestamp: Date.now(),
                behavioral: behavioralMetrics,
                physiological: physiologicalMetrics,
                exhaustionScore: result.totalScore
            };

            // Add to history (keep last 120 minutes)
            setMetricsHistory(prev => {
                const updated = [...prev, currentMetrics];
                return updated.slice(-120); // Keep last 2 hours
            });

            // Store metrics for AI training (every minute)
            if (aiPredictions.isReady) {
                aiPredictions.storeMetrics(currentMetrics);

                // Generate prediction if we have enough data
                if (metricsHistory.length >= 60) {
                    aiPredictions.predict([...metricsHistory, currentMetrics]);
                    aiPredictions.generateInsight([...metricsHistory, currentMetrics]);
                }
            }
        }
    }, [isTracking, fatigueMetrics, stats?.factors, aiPredictions.isReady]);
    
    if (!stats) return null;
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-full">Analytics Engine</span>
                    </div>
                    <h1 className="text-slate-900 dark:text-slate-50 text-3xl font-black leading-tight tracking-tight">Pattern Intelligence</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Deep dive into your cognitive focus and recovery trends.</p>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                    <button className="px-6 py-2 text-[11px] font-black rounded-full transition-all text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 uppercase tracking-widest cursor-pointer">Day</button>
                    <button className="px-6 py-2 text-[11px] font-black rounded-full bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100 uppercase tracking-widest cursor-pointer">Week</button>
                    <button className="px-6 py-2 text-[11px] font-black rounded-full transition-all text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 uppercase tracking-widest cursor-pointer">Month</button>
                </div>
            </div>

            {/* AI Prediction Section */}
            {isTracking && aiPredictions.isReady && aiPredictions.currentPrediction && (
                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 rounded-3xl p-10 border border-violet-100 dark:border-violet-800 shadow-lg transition-colors">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                    AI Prediction Engine
                                    {aiPredictions.currentPrediction.confidence > 0.7 && (
                                        <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                                            {Math.round(aiPredictions.currentPrediction.confidence * 100)}% confidence
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">30-minute predictive analysis using LSTM neural network</p>
                            </div>
                        </div>
                        {aiPredictions.status && (
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase tracking-widest">Training Data</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{aiPredictions.status.metricsCount} samples</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                        {/* Predicted Score */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="text-violet-500" size={20} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Predicted in 30min</p>
                            </div>
                            <div className="text-center">
                                <div className={`text-5xl font-black mb-2 ${
                                    aiPredictions.currentPrediction.predictedScore > 70 ? 'text-emerald-500' :
                                    aiPredictions.currentPrediction.predictedScore > 50 ? 'text-amber-500' :
                                    'text-rose-500'
                                }`}>
                                    {aiPredictions.currentPrediction.predictedScore}
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    {aiPredictions.currentPrediction.trend === 'improving' && (
                                        <TrendingUpIcon className="text-emerald-500" size={16} />
                                    )}
                                    {aiPredictions.currentPrediction.trend === 'declining' && (
                                        <TrendingUpIcon className="text-rose-500 rotate-180" size={16} />
                                    )}
                                    <span className={`text-xs font-bold uppercase tracking-widest ${
                                        aiPredictions.currentPrediction.trend === 'improving' ? 'text-emerald-600 dark:text-emerald-400' :
                                        aiPredictions.currentPrediction.trend === 'declining' ? 'text-rose-600 dark:text-rose-400' :
                                        aiPredictions.currentPrediction.trend === 'critical' ? 'text-rose-600 dark:text-rose-400' :
                                        'text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {aiPredictions.currentPrediction.trend}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Time to Exhaustion */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="text-fuchsia-500" size={20} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time to Threshold</p>
                            </div>
                            <div className="text-center">
                                <div className={`text-5xl font-black mb-2 ${
                                    aiPredictions.currentPrediction.timeToExhaustion === Infinity ? 'text-emerald-500' :
                                    aiPredictions.currentPrediction.timeToExhaustion > 60 ? 'text-amber-500' :
                                    'text-rose-500'
                                }`}>
                                    {aiPredictions.currentPrediction.timeToExhaustion === Infinity 
                                        ? '∞' 
                                        : `${Math.round(aiPredictions.currentPrediction.timeToExhaustion)}m`}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Until score {'<'} 40</p>
                            </div>
                        </div>

                        {/* Risk Level */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="text-blue-500" size={20} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Level</p>
                            </div>
                            <div className="text-center">
                                <div className={`text-4xl font-black mb-2 uppercase ${
                                    aiPredictions.currentPrediction.riskLevel === 'critical' ? 'text-rose-500' :
                                    aiPredictions.currentPrediction.riskLevel === 'high' ? 'text-orange-500' :
                                    aiPredictions.currentPrediction.riskLevel === 'medium' ? 'text-amber-500' :
                                    'text-emerald-500'
                                }`}>
                                    {aiPredictions.currentPrediction.riskLevel}
                                </div>
                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                                    aiPredictions.currentPrediction.riskLevel === 'critical' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' :
                                    aiPredictions.currentPrediction.riskLevel === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                    aiPredictions.currentPrediction.riskLevel === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    AI Forecast
                                </div>
                            </div>
                        </div>

                        {/* AI Actions */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="text-amber-500" size={20} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Model Status</p>
                            </div>
                            {aiPredictions.isTraining ? (
                                <div className="text-center">
                                    <div className="text-blue-600 dark:text-blue-400 mb-2">
                                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        <p className="text-sm font-bold">Training...</p>
                                    </div>
                                    {aiPredictions.trainingProgress && (
                                        <p className="text-xs text-slate-500">Epoch {aiPredictions.trainingProgress.epoch + 1}/20</p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => aiPredictions.trainModel(true)}
                                    className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer"
                                >
                                    Train Model
                                </button>
                            )}
                        </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-start gap-4">
                            <Lightbulb className="text-amber-500 flex-shrink-0 mt-1" size={24} fill="currentColor" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">AI Recommendation</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
                                    {aiPredictions.currentPrediction.recommendation}
                                </p>
                                {aiPredictions.currentInsight && aiPredictions.currentInsight.actions.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Suggested Actions:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {aiPredictions.currentInsight.actions.map((action, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <CheckCircle2 className="text-violet-500 flex-shrink-0 mt-0.5" size={16} />
                                                    <span>{action}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Not Ready Message */}
            {isTracking && !aiPredictions.isReady && (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center transition-colors">
                    <Sparkles className="mx-auto mb-4 text-slate-400" size={48} />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">AI Engine Initializing...</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
                        Setting up TensorFlow.js and loading prediction models. This will only take a moment.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-10 flex flex-col justify-between group transition-colors">
                    <div className="absolute top-10 right-10 opacity-20 dark:opacity-10 pointer-events-none">
                        <AlertTriangle className="text-rose-500" fill="currentColor" size={160} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-extrabold uppercase tracking-widest text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5">
                                <AlertTriangle size={10} fill="currentColor" /> Critical Insight
                            </span>
                        </div>
                        <h3 className="text-slate-900 dark:text-slate-50 text-3xl font-extrabold mb-4 tracking-tight">Approaching Burnout</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mb-10 leading-relaxed font-medium">
                            Warning: Rising tab switching frequency (+42%) and late-night usage detected over the last 72 hours. Your cognitive load is exceeding recommended recovery limits.
                        </p>
                    </div>
                    <div className="relative z-10 flex flex-wrap gap-6 items-center">
                        <button className="bg-rose-600 text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer">
                            <Zap size={16} fill="currentColor" />
                            Start Guided Recovery
                        </button>
                        <span className="text-rose-600/80 dark:text-rose-400/80 text-[11px] font-bold italic tracking-wide">Peak drop detected: 2:00 PM - 4:00 PM</span>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 flex flex-col items-center justify-center text-center shadow-sm transition-colors">
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
                            <span className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">HIGH</span>
                            <span className="text-emerald-500 font-bold text-sm">+5.2%</span>
                        </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-[200px] font-medium">
                        Your focus depth remains resilient despite increased interruptions.
                    </p>
                </div>
            </div>

            {/* Unified Exhaustion Analysis */}
            {isTracking && exhaustionData && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-3xl p-10 border border-purple-100 dark:border-purple-800 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center">
                            <Brain size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Unified Exhaustion Analysis</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">AI-powered pattern detection combining behavioral + physiological signals</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Exhaustion Score</p>
                                <div className={`text-6xl font-black mb-2 ${
                                    exhaustionData.totalScore > 70 ? 'text-rose-500' :
                                    exhaustionData.totalScore > 50 ? 'text-amber-500' :
                                    'text-emerald-500'
                                }`}>
                                    {Math.round(exhaustionData.totalScore)}
                                </div>
                                <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                                    exhaustionData.level === 'critical' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' :
                                    exhaustionData.level === 'severe' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                    exhaustionData.level === 'moderate' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                    exhaustionData.level === 'mild' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    {exhaustionData.level}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Exhaustion Pattern</p>
                            <div className="flex items-center gap-3 mb-4">
                                {pattern?.pattern === 'cognitive' && <Brain className="text-purple-500" size={32} />}
                                {pattern?.pattern === 'physical' && <Gauge className="text-orange-500" size={32} />}
                                {pattern?.pattern === 'visual' && <Eye className="text-cyan-500" size={32} />}
                                {pattern?.pattern === 'mixed' && <Activity className="text-rose-500" size={32} />}
                                {pattern?.pattern === 'none' && <CheckCircle2 className="text-emerald-500" size={32} />}
                                <div>
                                    <p className="font-bold text-lg text-slate-900 dark:text-slate-50 capitalize">{pattern?.pattern}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round((pattern?.confidence || 0) * 100)}% confidence</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {pattern?.causes.map((cause: string, i: number) => (
                                    <div key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        {cause}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recommendation</p>
                            <div className="flex items-start gap-3">
                                <Lightbulb className="text-amber-500 flex-shrink-0 mt-1" size={20} fill="currentColor" />
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {exhaustionData.recommendation}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Top Contributing Factors</p>
                        <div className="space-y-3">
                            {exhaustionData.factors.slice(0, 5).map((factor: any, i: number) => (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="text-sm text-slate-600 dark:text-slate-400 w-48 truncate">{factor.metric}</span>
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${
                                                factor.severity === 'high' ? 'bg-rose-500' :
                                                factor.severity === 'medium' ? 'bg-amber-500' :
                                                'bg-emerald-500'
                                            }`}
                                            style={{ width: `${factor.contribution}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-16 text-right">
                                        {Math.round(factor.contribution)}%
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider w-16 text-right ${
                                        factor.severity === 'high' ? 'text-rose-500' :
                                        factor.severity === 'medium' ? 'text-amber-500' :
                                        'text-emerald-500'
                                    }`}>
                                        {factor.severity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!isTracking && (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center transition-colors">
                    <Activity className="mx-auto mb-4 text-slate-400" size={48} />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Start CV Tracking for Deep Insights</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
                        Enable computer vision tracking on the Dashboard to see comprehensive exhaustion analysis, pattern detection, and personalized recommendations.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-6 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Most Distracted Hours</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">2:00 PM — 4:00 PM</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium leading-relaxed">Strategy: Schedule a "Deep Focus Block" at 2:15 PM to mitigate natural energy drop-off.</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-6 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Moon size={20} fill="currentColor" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Late-Night Impact</p>
                        <p className="text-2xl font-black text-rose-500 tracking-tight">-18% Next Day</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium leading-relaxed">Activity post-11 PM correlates with significantly lower morning attention scores.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-10 flex flex-col shadow-sm transition-colors">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-slate-900 dark:text-slate-50 text-lg font-bold tracking-tight">Weekly Cognitive Trend</h3>
                        <div className="flex gap-6 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-blue-600"></div> Focus Score
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 border-b-2 border-dashed border-slate-300 dark:border-slate-600"></div> Interventions
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-end justify-between px-10 pt-16 pb-6 border border-slate-100 dark:border-slate-700 transition-colors">
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

                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-10 flex flex-col shadow-sm transition-colors">
                    <h3 className="text-slate-900 dark:text-slate-50 text-lg font-bold tracking-tight mb-10">Recovery Lift</h3>
                    <div className="flex flex-col gap-10 flex-1 justify-center">
                        {[
                            { label: 'Focus Blocks', val: 88, color: 'emerald' },
                            { label: 'Stretching', val: 62, color: 'blue' },
                            { label: 'Deep Breathing', val: 45, color: 'blue' },
                        ].map((r, i) => (
                            <div key={i} className="flex flex-col gap-3">
                                <div className="flex justify-between items-center font-bold text-sm">
                                    <span className="text-slate-700 dark:text-slate-300">{r.label}</span>
                                    <span className={`text-${r.color}-500`}>+{r.val}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${r.val}%` }}
                                        className="h-full bg-blue-600 rounded-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 mt-10">
                        <p className="text-[11px] text-slate-400 italic leading-relaxed font-medium">
                            "Focus Blocks" are your optimal recovery protocol for cognitive fatigue this week.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm transition-colors">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-xl shadow-blue-600/30">
                        <Lightbulb size={24} fill="currentColor" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-50 mb-1 leading-none text-lg">Predictive Insight</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">By shifting your morning deep work 30 minutes earlier, we predict a <span className="font-bold text-blue-600 dark:text-blue-400">12% boost</span> in energy stability.</p>
                    </div>
                </div>
                <button className="bg-white dark:bg-slate-900 border text-sm border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-6 py-3 rounded-full font-bold shadow-sm shrink-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Apply Suggestion</button>
            </div>

        </div>
    );
};
