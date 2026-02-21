/**
 * AI Prediction Web Worker
 * Runs predictions in background thread for non-blocking UI
 */

import { aiPredictionEngine, CombinedMetrics, AIInsight } from '../lib/ai-prediction-engine';
import { modelTrainer, storeMetricsSnapshot } from '../lib/model-trainer';

// Message types for worker communication
export type WorkerMessage =
    | { type: 'INITIALIZE' }
    | { type: 'PREDICT'; payload: { metrics: CombinedMetrics[] } }
    | { type: 'GENERATE_INSIGHT'; payload: { metrics: CombinedMetrics[] } }
    | { type: 'STORE_METRICS'; payload: { metrics: CombinedMetrics } }
    | { type: 'TRAIN_MODEL'; payload: { preTrainIfNeeded: boolean } }
    | { type: 'GET_STATUS' };

export type WorkerResponse =
    | { type: 'INITIALIZED'; success: boolean }
    | { type: 'PREDICTION'; payload: any }
    | { type: 'INSIGHT'; payload: AIInsight }
    | { type: 'METRICS_STORED'; success: boolean }
    | { type: 'TRAINING_COMPLETE'; payload: any }
    | { type: 'STATUS'; payload: any }
    | { type: 'ERROR'; error: string };

// Worker state
let isInitialized = false;
let modelLoaded = false;

/**
 * Initialize AI engine and model
 */
async function initialize(): Promise<boolean> {
    try {
        console.log('[AI Worker] Initializing...');
        
        // Initialize trainer first for data storage
        await modelTrainer.initialize();
        
        // Load or create prediction model
        modelLoaded = await aiPredictionEngine.loadModel();
        
        // Check if we need to pre-train
        const hasTrainingHistory = (await modelTrainer.getTrainingHistory()).length > 0;
        
        if (!hasTrainingHistory && modelLoaded) {
            console.log('[AI Worker] No training history found, pre-training with synthetic data...');
            // This will be done lazily when user requests training
        }
        
        isInitialized = true;
        console.log('[AI Worker] Initialized successfully');
        return true;
    } catch (error) {
        console.error('[AI Worker] Initialization failed:', error);
        return false;
    }
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    const type = message.type;

    try {
        switch (type) {
            case 'INITIALIZE': {
                const success = await initialize();
                self.postMessage({
                    type: 'INITIALIZED',
                    success
                } as WorkerResponse);
                break;
            }

            case 'PREDICT': {
                if (!isInitialized) {
                    await initialize();
                }

                const prediction = await aiPredictionEngine.predict(message.payload.metrics);
                self.postMessage({
                    type: 'PREDICTION',
                    payload: prediction
                } as WorkerResponse);
                break;
            }

            case 'GENERATE_INSIGHT': {
                if (!isInitialized) {
                    await initialize();
                }

                const insight = await aiPredictionEngine.generateInsight(message.payload.metrics);
                self.postMessage({
                    type: 'INSIGHT',
                    payload: insight
                } as WorkerResponse);
                break;
            }

            case 'STORE_METRICS': {
                if (!isInitialized) {
                    await initialize();
                }

                await storeMetricsSnapshot(message.payload.metrics);
                self.postMessage({
                    type: 'METRICS_STORED',
                    success: true
                } as WorkerResponse);
                break;
            }

            case 'TRAIN_MODEL': {
                if (!isInitialized) {
                    await initialize();
                }

                // Check if pre-training needed
                const hasHistory = (await modelTrainer.getTrainingHistory()).length > 0;
                
                if (!hasHistory && message.payload.preTrainIfNeeded) {
                    console.log('[AI Worker] Pre-training model with synthetic data...');
                    const preTrainSuccess = await modelTrainer.preTrainModel(
                        aiPredictionEngine['model']!
                    );
                    
                    if (preTrainSuccess) {
                        await aiPredictionEngine.saveModel();
                    }
                    
                    self.postMessage({
                        type: 'TRAINING_COMPLETE',
                        payload: {
                            success: preTrainSuccess,
                            type: 'pre-training'
                        }
                    } as WorkerResponse);
                } else {
                    // Train on user data
                    console.log('[AI Worker] Training model on user data...');
                    const result = await modelTrainer.trainModel(
                        aiPredictionEngine['model']!,
                        (epoch, logs) => {
                            // Send progress updates
                            self.postMessage({
                                type: 'TRAINING_PROGRESS',
                                payload: { epoch, logs }
                            } as any);
                        }
                    );

                    if (result.success) {
                        await aiPredictionEngine.saveModel();
                    }

                    self.postMessage({
                        type: 'TRAINING_COMPLETE',
                        payload: result
                    } as WorkerResponse);
                }
                break;
            }

            case 'GET_STATUS': {
                const trainingHistory = isInitialized 
                    ? await modelTrainer.getTrainingHistory()
                    : [];
                
                const metrics = isInitialized
                    ? await modelTrainer.getAllMetrics()
                    : [];

                self.postMessage({
                    type: 'STATUS',
                    payload: {
                        isInitialized,
                        modelLoaded,
                        trainingHistory,
                        metricsCount: metrics.length,
                        lastTraining: trainingHistory.length > 0 
                            ? trainingHistory[trainingHistory.length - 1]
                            : null
                    }
                } as WorkerResponse);
                break;
            }

            default:
                console.warn('[AI Worker] Unknown message type:', type);
        }
    } catch (error) {
        console.error('[AI Worker] Error handling message:', error);
        self.postMessage({
            type: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
        } as WorkerResponse);
    }
};

// Handle worker errors
self.onerror = (error) => {
    console.error('[AI Worker] Worker error:', error);
    self.postMessage({
        type: 'ERROR',
        error: error.message
    } as WorkerResponse);
};

console.log('[AI Worker] Worker script loaded');
