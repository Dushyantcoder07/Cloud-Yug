/**
 * Model Training Utilities
 * Trains the LSTM model on historical user data for personalized predictions
 */

import * as tf from '@tensorflow/tfjs';
import { CombinedMetrics } from './ai-prediction-engine';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TrainingDB extends DBSchema {
    metrics: {
        key: number;
        value: CombinedMetrics;
        indexes: { 'by-timestamp': number };
    };
    training_history: {
        key: number;
        value: TrainingSession;
    };
}

interface TrainingSession {
    id?: number;
    timestamp: number;
    epochs: number;
    finalLoss: number;
    finalMAE: number;
    dataPoints: number;
}

const DB_NAME = 'ai-training-db';

export class ModelTrainer {
    private db: IDBPDatabase<TrainingDB> | null = null;

    async initialize() {
        this.db = await openDB<TrainingDB>(DB_NAME, 1, {
            upgrade(db) {
                // Store metrics snapshots
                if (!db.objectStoreNames.contains('metrics')) {
                    const metricsStore = db.createObjectStore('metrics', {
                        keyPath: 'timestamp'
                    });
                    metricsStore.createIndex('by-timestamp', 'timestamp');
                }

                // Store training history
                if (!db.objectStoreNames.contains('training_history')) {
                    db.createObjectStore('training_history', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }
            }
        });
    }

    /**
     * Store metrics snapshot for future training
     */
    async storeMetrics(metrics: CombinedMetrics): Promise<void> {
        if (!this.db) await this.initialize();
        
        try {
            await this.db!.put('metrics', metrics);
            
            // Keep only last 7 days of data
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const tx = this.db!.transaction('metrics', 'readwrite');
            const store = tx.objectStore('metrics');
            const index = store.index('by-timestamp');
            
            let cursor = await index.openCursor(IDBKeyRange.upperBound(sevenDaysAgo));
            while (cursor) {
                await cursor.delete();
                cursor = await cursor.continue();
            }
            
            await tx.done;
        } catch (error) {
            console.error('Failed to store metrics:', error);
        }
    }

    /**
     * Get all stored metrics for training
     */
    async getAllMetrics(): Promise<CombinedMetrics[]> {
        if (!this.db) await this.initialize();
        
        try {
            return await this.db!.getAll('metrics');
        } catch (error) {
            console.error('Failed to get metrics:', error);
            return [];
        }
    }

    /**
     * Prepare training data from metrics
     * Creates sequences of 60 timesteps with targets 30 minutes ahead
     */
    prepareTrainingData(metrics: CombinedMetrics[]): {
        inputs: number[][][];
        targets: number[];
    } {
        const inputs: number[][][] = [];
        const targets: number[] = [];

        // Sort by timestamp
        const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp);

        // Create sequences: 60 minutes of input -> predict 30 minutes ahead
        for (let i = 0; i < sorted.length - 90; i++) {
            const sequence = sorted.slice(i, i + 60);
            const target = sorted[i + 90]; // 30 minutes after sequence end

            // Extract features for each timestep
            const sequenceFeatures = sequence.map(m => [
                m.behavioral.tabSwitchScore || 0,
                m.behavioral.typingFatigueScore || 0,
                m.behavioral.clickAccuracyScore || 0,
                m.behavioral.mouseErraticScore || 0,
                m.behavioral.scrollAnxietyScore || 0,
                m.behavioral.timeOfDayScore || 0,
                m.behavioral.idleTimeScore || 0,
                m.physiological.eyeFatigueScore || 0,
                m.physiological.blinkRateScore || 0,
                m.physiological.earScore || 0,
                m.physiological.stressLevel || 0
            ]);

            inputs.push(sequenceFeatures);
            targets.push(target.exhaustionScore / 100); // Normalize to 0-1
        }

        return { inputs, targets };
    }

    /**
     * Train model on user's historical data
     */
    async trainModel(
        model: tf.LayersModel,
        onProgress?: (epoch: number, logs: tf.Logs) => void
    ): Promise<{
        success: boolean;
        finalLoss?: number;
        finalMAE?: number;
        epochs?: number;
    }> {
        try {
            const metrics = await this.getAllMetrics();

            if (metrics.length < 200) {
                console.log('Not enough data for training (need at least 200 data points)');
                return { success: false };
            }

            // Prepare training data
            const { inputs, targets } = this.prepareTrainingData(metrics);

            if (inputs.length === 0) {
                console.log('No valid training sequences');
                return { success: false };
            }

            console.log(`Prepared ${inputs.length} training sequences`);

            // Convert to tensors
            const inputTensor: any = (tf as any).tensor3d(inputs, [inputs.length, 60, 11]);
            const targetTensor: any = (tf as any).tensor2d(targets, [targets.length, 1]);

            // Split into train/validation (80/20)
            const splitIdx = Math.floor(inputs.length * 0.8);
            const trainX = inputTensor.slice([0, 0, 0], [splitIdx, 60, 11]);
            const trainY = targetTensor.slice([0, 0], [splitIdx, 1]);
            const valX = inputTensor.slice([splitIdx, 0, 0], [-1, 60, 11]);
            const valY = targetTensor.slice([splitIdx, 0], [-1, 1]);

            // Train model
            const history = await model.fit(trainX, trainY, {
                epochs: 20,
                batchSize: 32,
                validationData: [valX, valY],
                shuffle: true,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss=${logs?.loss.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}`);
                        if (onProgress && logs) {
                            onProgress(epoch, logs);
                        }
                    }
                }
            });

            // Get final metrics
            const finalLoss = history.history.loss[history.history.loss.length - 1] as number;
            const finalMAE = history.history.mae?.[history.history.mae.length - 1] as number || 0;

            // Save training session
            await this.saveTrainingSession({
                timestamp: Date.now(),
                epochs: 20,
                finalLoss,
                finalMAE,
                dataPoints: inputs.length
            });

            // Cleanup tensors
            inputTensor.dispose();
            targetTensor.dispose();
            trainX.dispose();
            trainY.dispose();
            valX.dispose();
            valY.dispose();

            console.log('Training completed successfully');
            return {
                success: true,
                finalLoss,
                finalMAE,
                epochs: 20
            };
        } catch (error) {
            console.error('Training failed:', error);
            return { success: false };
        }
    }

    /**
     * Generate synthetic training data for initial model
     * Creates realistic patterns based on known exhaustion behaviors
     */
    generateSyntheticData(numSamples: number = 1000): CombinedMetrics[] {
        const syntheticData: CombinedMetrics[] = [];
        const startTime = Date.now() - (numSamples * 60 * 1000); // Start from numSamples minutes ago

        for (let i = 0; i < numSamples; i++) {
            const timestamp = startTime + (i * 60 * 1000);
            const hour = new Date(timestamp).getHours();

            // Simulate natural fatigue patterns
            const timeOfDayFactor = hour < 6 || hour > 22 ? 30 : hour > 14 && hour < 16 ? 20 : 0;
            const sessionTimeFactor = Math.min(50, (i % 240) * 0.5); // Fatigue builds over 4 hours
            
            // Add some randomness
            const random = () => Math.random() * 20 - 10;

            const baseExhaustion = 100 - timeOfDayFactor - sessionTimeFactor;
            const exhaustionScore = Math.max(20, Math.min(100, baseExhaustion + random()));

            // Behavioral metrics correlate with exhaustion
            const fatigueLevel = 100 - exhaustionScore;

            syntheticData.push({
                timestamp,
                behavioral: {
                    tabSwitchScore: Math.max(0, fatigueLevel * 0.6 + random()),
                    typingFatigueScore: Math.max(0, fatigueLevel * 0.5 + random()),
                    clickAccuracyScore: Math.max(0, fatigueLevel * 0.4 + random()),
                    mouseErraticScore: Math.max(0, fatigueLevel * 0.3 + random()),
                    scrollAnxietyScore: Math.max(0, fatigueLevel * 0.3 + random()),
                    timeOfDayScore: timeOfDayFactor + random() * 5,
                    idleTimeScore: Math.random() * 20
                },
                physiological: {
                    eyeFatigueScore: Math.max(0, fatigueLevel * 0.7 + random()),
                    blinkRateScore: Math.max(0, fatigueLevel * 0.4 + random()),
                    earScore: Math.max(0, fatigueLevel * 0.5 + random()),
                    stressLevel: Math.max(0, fatigueLevel * 0.6 + random())
                },
                exhaustionScore
            });
        }

        return syntheticData;
    }

    /**
     * Pre-train model with synthetic data
     */
    async preTrainModel(model: tf.LayersModel): Promise<boolean> {
        try {
            console.log('Generating synthetic training data...');
            const syntheticData = this.generateSyntheticData(2000);

            // Store synthetic data
            for (const metrics of syntheticData) {
                await this.storeMetrics(metrics);
            }

            console.log('Training on synthetic data...');
            const result = await this.trainModel(model);

            return result.success;
        } catch (error) {
            console.error('Pre-training failed:', error);
            return false;
        }
    }

    /**
     * Save training session record
     */
    private async saveTrainingSession(session: TrainingSession): Promise<void> {
        if (!this.db) await this.initialize();

        try {
            await this.db!.add('training_history', session);
        } catch (error) {
            console.error('Failed to save training session:', error);
        }
    }

    /**
     * Get training history
     */
    async getTrainingHistory(): Promise<TrainingSession[]> {
        if (!this.db) await this.initialize();

        try {
            return await this.db!.getAll('training_history');
        } catch (error) {
            console.error('Failed to get training history:', error);
            return [];
        }
    }

    /**
     * Check if model needs retraining
     * Returns true if:
     * - New data available since last training
     * - More than 7 days since last training
     * - Significant amount of new data (>500 data points)
     */
    async shouldRetrain(): Promise<boolean> {
        const history = await getTrainingHistory();
        const metrics = await this.getAllMetrics();

        if (history.length === 0) return true; // Never trained

        const lastTraining = history[history.length - 1];
        const daysSinceTraining = (Date.now() - lastTraining.timestamp) / (1000 * 60 * 60 * 24);

        // Retrain if more than 7 days
        if (daysSinceTraining > 7) return true;

        // Retrain if significant new data
        const newDataPoints = metrics.filter(m => m.timestamp > lastTraining.timestamp).length;
        if (newDataPoints > 500) return true;

        return false;
    }
}

// Export singleton instance
export const modelTrainer = new ModelTrainer();

// Export helper functions
export async function initializeTrainer() {
    await modelTrainer.initialize();
}

export async function storeMetricsSnapshot(metrics: CombinedMetrics) {
    await modelTrainer.storeMetrics(metrics);
}

export async function trainModelOnUserData(
    model: tf.LayersModel,
    onProgress?: (epoch: number, logs: tf.Logs) => void
) {
    return await modelTrainer.trainModel(model, onProgress);
}

export async function preTrainWithSyntheticData(model: tf.LayersModel) {
    return await modelTrainer.preTrainModel(model);
}

export async function getTrainingHistory() {
    return await modelTrainer.getTrainingHistory();
}

export async function shouldRetrainModel() {
    return await modelTrainer.shouldRetrain();
}
