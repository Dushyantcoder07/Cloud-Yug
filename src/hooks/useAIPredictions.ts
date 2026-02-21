/**
 * React Hook for AI Predictions
 * Provides interface to AI worker for real-time predictions
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CombinedMetrics, AIInsight, PredictionResult } from '../lib/ai-prediction-engine';

interface AIWorkerStatus {
    isInitialized: boolean;
    modelLoaded: boolean;
    metricsCount: number;
    lastTraining: any | null;
}

export function useAIPredictions() {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [status, setStatus] = useState<AIWorkerStatus | null>(null);
    const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
    const [currentInsight, setCurrentInsight] = useState<AIInsight | null>(null);
    const [isTraining, setIsTraining] = useState(false);
    const [trainingProgress, setTrainingProgress] = useState<{ epoch: number; loss?: number } | null>(null);

    // Initialize worker
    useEffect(() => {
        // Create worker
        const worker = new Worker(
            new URL('../workers/ai-worker.ts', import.meta.url),
            { type: 'module' }
        );

        workerRef.current = worker;

        // Handle worker messages
        worker.onmessage = (event) => {
            const { type, payload, success, error } = event.data;

            switch (type) {
                case 'INITIALIZED':
                    setIsReady(success);
                    if (success) {
                        console.log('[AI Hook] Worker initialized');
                        // Get initial status
                        worker.postMessage({ type: 'GET_STATUS' });
                    }
                    break;

                case 'PREDICTION':
                    setCurrentPrediction(payload);
                    break;

                case 'INSIGHT':
                    setCurrentInsight(payload);
                    break;

                case 'STATUS':
                    setStatus(payload);
                    break;

                case 'TRAINING_COMPLETE':
                    setIsTraining(false);
                    setTrainingProgress(null);
                    console.log('[AI Hook] Training complete:', payload);
                    // Refresh status
                    worker.postMessage({ type: 'GET_STATUS' });
                    break;

                case 'TRAINING_PROGRESS':
                    setTrainingProgress({
                        epoch: payload.epoch,
                        loss: payload.logs?.loss
                    });
                    break;

                case 'ERROR':
                    console.error('[AI Hook] Worker error:', error);
                    break;

                default:
                    console.warn('[AI Hook] Unknown message type:', type);
            }
        };

        worker.onerror = (error) => {
            console.error('[AI Hook] Worker error:', error);
            setIsReady(false);
        };

        // Initialize worker
        worker.postMessage({ type: 'INITIALIZE' });

        // Cleanup
        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    /**
     * Request prediction for given metrics
     */
    const predict = useCallback((metrics: CombinedMetrics[]) => {
        if (!workerRef.current || !isReady) {
            console.warn('[AI Hook] Worker not ready');
            return;
        }

        workerRef.current.postMessage({
            type: 'PREDICT',
            payload: { metrics }
        });
    }, [isReady]);

    /**
     * Generate AI insight
     */
    const generateInsight = useCallback((metrics: CombinedMetrics[]) => {
        if (!workerRef.current || !isReady) {
            console.warn('[AI Hook] Worker not ready');
            return;
        }

        workerRef.current.postMessage({
            type: 'GENERATE_INSIGHT',
            payload: { metrics }
        });
    }, [isReady]);

    /**
     * Store metrics snapshot for training
     */
    const storeMetrics = useCallback((metrics: CombinedMetrics) => {
        if (!workerRef.current || !isReady) {
            return;
        }

        workerRef.current.postMessage({
            type: 'STORE_METRICS',
            payload: { metrics }
        });
    }, [isReady]);

    /**
     * Train model (with optional pre-training)
     */
    const trainModel = useCallback((preTrainIfNeeded: boolean = true) => {
        if (!workerRef.current || !isReady) {
            console.warn('[AI Hook] Worker not ready');
            return;
        }

        setIsTraining(true);
        workerRef.current.postMessage({
            type: 'TRAIN_MODEL',
            payload: { preTrainIfNeeded }
        });
    }, [isReady]);

    /**
     * Refresh worker status
     */
    const refreshStatus = useCallback(() => {
        if (!workerRef.current || !isReady) {
            return;
        }

        workerRef.current.postMessage({ type: 'GET_STATUS' });
    }, [isReady]);

    return {
        isReady,
        status,
        currentPrediction,
        currentInsight,
        isTraining,
        trainingProgress,
        predict,
        generateInsight,
        storeMetrics,
        trainModel,
        refreshStatus
    };
}
