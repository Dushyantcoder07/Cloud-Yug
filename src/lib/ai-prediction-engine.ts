/**
 * AI-Powered Prediction Engine
 * Uses TensorFlow.js to predict exhaustion levels 30 minutes ahead
 */

import * as tf from '@tensorflow/tfjs';
import { BehavioralMetrics, PhysiologicalMetrics } from './exhaustionEngine';

export interface CombinedMetrics {
    timestamp: number;
    behavioral: Partial<BehavioralMetrics>;
    physiological: Partial<PhysiologicalMetrics>;
    exhaustionScore: number;
}

export interface PredictionResult {
    predictedScore: number;
    confidence: number;
    timeToExhaustion: number; // minutes until score < 40
    trend: 'improving' | 'stable' | 'declining' | 'critical';
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AIInsight {
    type: 'warning' | 'alert' | 'info' | 'suggestion' | 'positive';
    title: string;
    message: string;
    prediction: PredictionResult;
    actions: string[];
}

/**
 * AI Prediction Engine
 * Manages model loading, prediction, and insight generation
 */
export class AIPredictionEngine {
    private model: tf.LayersModel | null = null;
    private isModelLoaded = false;
    private modelVersion = '1.0.0';
    
    // Normalization parameters (will be loaded from model metadata)
    private metricsStats = {
        mean: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
        std: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]
    };

    constructor() {
        this.initializeTensorFlow();
    }

    /**
     * Initialize TensorFlow.js backend
     */
    private async initializeTensorFlow() {
        try {
            // TensorFlow.js will auto-initialize
            console.log('TensorFlow.js ready');
        } catch (error) {
            console.error('Failed to initialize TensorFlow.js:', error);
        }
    }

    /**
     * Load or create prediction model
     */
    async loadModel(): Promise<boolean> {
        try {
            // Try to load existing model from IndexedDB
            try {
                this.model = await tf.loadLayersModel('indexeddb://fatigue-prediction-model');
                console.log('Loaded existing model from IndexedDB');
                this.isModelLoaded = true;
                return true;
            } catch (loadError) {
                console.log('No existing model found, creating new model');
                this.model = this.createModel();
                this.isModelLoaded = true;
                return true;
            }
        } catch (error) {
            console.error('Failed to load/create model:', error);
            return false;
        }
    }

    /**
     * Create LSTM model for time series prediction
     */
    private createModel(): tf.LayersModel {
        const model = tf.sequential();

        // Input shape: [timesteps, features]
        // timesteps = 60 (last 60 minutes)
        // features = 11 (7 behavioral + 4 physiological)
        
        // LSTM layer 1
        model.add(tf.layers.lstm({
            units: 64,
            returnSequences: true,
            inputShape: [60, 11],
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }));
        
        model.add(tf.layers.dropout({ rate: 0.2 }));

        // LSTM layer 2
        model.add(tf.layers.lstm({
            units: 32,
            returnSequences: false,
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }));
        
        model.add(tf.layers.dropout({ rate: 0.2 }));

        // Dense layers
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));

        // Output layer: predict exhaustion score (0-100)
        model.add(tf.layers.dense({
            units: 1,
            activation: 'sigmoid' // Output between 0 and 1, we'll scale to 0-100
        }));

        // Compile model
        model.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError',
            metrics: ['mae']
        });

        console.log('Created new LSTM model');
        model.summary();

        return model;
    }

    /**
     * Normalize metrics to 0-1 range
     */
    private normalizeMetrics(metrics: number[]): number[] {
        return metrics.map((value, i) => {
            const mean = this.metricsStats.mean[i] || 50;
            const std = this.metricsStats.std[i] || 20;
            return (value - mean) / std;
        });
    }

    /**
     * Extract feature vector from combined metrics
     */
    private extractFeatures(metrics: CombinedMetrics): number[] {
        const behavioral = metrics.behavioral;
        const physiological = metrics.physiological;

        return [
            behavioral.tabSwitchScore || 0,
            behavioral.typingFatigueScore || 0,
            behavioral.clickAccuracyScore || 0,
            behavioral.mouseErraticScore || 0,
            behavioral.scrollAnxietyScore || 0,
            behavioral.timeOfDayScore || 0,
            behavioral.idleTimeScore || 0,
            physiological.eyeFatigueScore || 0,
            physiological.blinkRateScore || 0,
            physiological.earScore || 0,
            physiological.stressLevel || 0
        ];
    }

    /**
     * Predict exhaustion score 30 minutes ahead
     */
    async predict(historyMetrics: CombinedMetrics[]): Promise<PredictionResult> {
        if (!this.isModelLoaded || !this.model) {
            await this.loadModel();
        }

        if (!this.model) {
            return this.getFallbackPrediction(historyMetrics);
        }

        try {
            // Need at least 60 data points for prediction
            if (historyMetrics.length < 60) {
                return this.getSimplePrediction(historyMetrics);
            }

            // Take last 60 minutes of data
            const recentMetrics = historyMetrics.slice(-60);

            // Extract and normalize features
            const features = recentMetrics.map(m => this.extractFeatures(m));
            const normalizedFeatures = features.map(f => this.normalizeMetrics(f));

            // Create tensor [1, 60, 11] - batch size 1, 60 timesteps, 11 features
            const inputTensor: any = (tf as any).tensor3d([normalizedFeatures], [1, 60, 11]);

            // Predict
            const prediction = this.model.predict(inputTensor) as any;
            const predictedValue = (await prediction.data())[0];

            // Scale back to 0-100
            const predictedScore = Math.round(predictedValue * 100);

            // Calculate confidence based on recent trend stability
            const confidence = this.calculateConfidence(historyMetrics);

            // Calculate time to exhaustion
            const timeToExhaustion = this.calculateTimeToExhaustion(
                historyMetrics[historyMetrics.length - 1].exhaustionScore,
                predictedScore
            );

            // Determine trend
            const trend = this.determineTrend(historyMetrics, predictedScore);

            // Generate recommendation
            const recommendation = this.generateRecommendation(predictedScore, trend, timeToExhaustion);

            // Determine risk level
            const riskLevel = this.determineRiskLevel(predictedScore, timeToExhaustion);

            // Cleanup tensors
            inputTensor.dispose();
            prediction.dispose();

            return {
                predictedScore,
                confidence,
                timeToExhaustion,
                trend,
                recommendation,
                riskLevel
            };
        } catch (error) {
            console.error('Prediction error:', error);
            return this.getFallbackPrediction(historyMetrics);
        }
    }

    /**
     * Simple linear prediction for when we don't have enough data
     */
    private getSimplePrediction(metrics: CombinedMetrics[]): PredictionResult {
        if (metrics.length === 0) {
            return this.getFallbackPrediction([]);
        }

        const n = metrics.length;
        const scores = metrics.map(m => m.exhaustionScore);
        
        // Calculate simple linear trend
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        scores.forEach((score, i) => {
            sumX += i;
            sumY += score;
            sumXY += i * score;
            sumX2 += i * i;
        });

        const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
        const intercept = (sumY - slope * sumX) / n;

        // Predict 30 minutes ahead
        const predictedScore = Math.max(0, Math.min(100, slope * (n + 30) + intercept));
        const currentScore = scores[n - 1];
        
        const timeToExhaustion = slope < 0 && currentScore > 40 
            ? Math.abs((40 - currentScore) / slope) 
            : Infinity;

        const trend = slope > 0.5 ? 'improving' : 
                     slope > -0.5 ? 'stable' : 
                     slope > -2 ? 'declining' : 'critical';

        return {
            predictedScore: Math.round(predictedScore),
            confidence: Math.min(0.5, n / 60), // Low confidence without full data
            timeToExhaustion,
            trend,
            recommendation: this.generateRecommendation(predictedScore, trend, timeToExhaustion),
            riskLevel: this.determineRiskLevel(predictedScore, timeToExhaustion)
        };
    }

    /**
     * Fallback prediction when model isn't available
     */
    private getFallbackPrediction(metrics: CombinedMetrics[]): PredictionResult {
        const currentScore = metrics.length > 0 
            ? metrics[metrics.length - 1].exhaustionScore 
            : 100;

        return {
            predictedScore: currentScore,
            confidence: 0.3,
            timeToExhaustion: Infinity,
            trend: 'stable',
            recommendation: 'Not enough data for prediction. Keep tracking to build your baseline.',
            riskLevel: currentScore < 40 ? 'high' : currentScore < 60 ? 'medium' : 'low'
        };
    }

    /**
     * Calculate prediction confidence based on recent trend stability
     */
    private calculateConfidence(metrics: CombinedMetrics[]): number {
        if (metrics.length < 10) return 0.3;

        const recent = metrics.slice(-30);
        const scores = recent.map(m => m.exhaustionScore);
        
        // Calculate variance
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        // Lower variance = higher confidence
        const confidence = Math.max(0.5, Math.min(0.95, 1 - (stdDev / 50)));
        return Math.round(confidence * 100) / 100;
    }

    /**
     * Calculate time until exhaustion threshold (score < 40)
     */
    private calculateTimeToExhaustion(currentScore: number, predictedScore: number): number {
        if (currentScore <= 40) return 0;
        if (predictedScore >= currentScore) return Infinity;

        // Linear interpolation
        const declineRate = (currentScore - predictedScore) / 30; // per minute
        const timeToThreshold = (currentScore - 40) / declineRate;

        return Math.max(0, Math.round(timeToThreshold));
    }

    /**
     * Determine trend from historical data and prediction
     */
    private determineTrend(
        metrics: CombinedMetrics[], 
        predictedScore: number
    ): 'improving' | 'stable' | 'declining' | 'critical' {
        const currentScore = metrics[metrics.length - 1].exhaustionScore;
        const diff = predictedScore - currentScore;

        if (diff > 5) return 'improving';
        if (diff > -5) return 'stable';
        if (diff > -15) return 'declining';
        return 'critical';
    }

    /**
     * Generate actionable recommendation
     */
    private generateRecommendation(
        predictedScore: number, 
        trend: string, 
        timeToExhaustion: number
    ): string {
        if (timeToExhaustion < 15) {
            return '🚨 Take a break NOW - exhaustion imminent within 15 minutes';
        }
        if (timeToExhaustion < 30) {
            return '⚠️ Schedule a break within 30 minutes to prevent exhaustion';
        }
        if (trend === 'critical') {
            return '🔴 Critical decline detected - immediate intervention recommended';
        }
        if (trend === 'declining') {
            return '🟡 Declining trend detected - plan breaks proactively';
        }
        if (predictedScore < 40) {
            return '🟠 Energy levels dropping - consider a recovery session';
        }
        if (trend === 'improving') {
            return '✅ Recovery trend detected - maintain current pace';
        }
        return '💚 Optimal state - keep up the good work!';
    }

    /**
     * Determine risk level
     */
    private determineRiskLevel(
        predictedScore: number, 
        timeToExhaustion: number
    ): 'low' | 'medium' | 'high' | 'critical' {
        if (timeToExhaustion < 15 || predictedScore < 20) return 'critical';
        if (timeToExhaustion < 30 || predictedScore < 40) return 'high';
        if (predictedScore < 60) return 'medium';
        return 'low';
    }

    /**
     * Generate comprehensive AI insight
     */
    async generateInsight(metrics: CombinedMetrics[]): Promise<AIInsight> {
        const prediction = await this.predict(metrics);

        let type: AIInsight['type'];
        if (prediction.riskLevel === 'critical') type = 'alert';
        else if (prediction.riskLevel === 'high') type = 'warning';
        else if (prediction.trend === 'improving') type = 'positive';
        else if (prediction.riskLevel === 'medium') type = 'suggestion';
        else type = 'info';

        const title = this.generateInsightTitle(prediction);
        const message = this.generateInsightMessage(prediction, metrics);
        const actions = this.generateActions(prediction);

        return {
            type,
            title,
            message,
            prediction,
            actions
        };
    }

    private generateInsightTitle(prediction: PredictionResult): string {
        if (prediction.riskLevel === 'critical') {
            return 'Critical: Immediate Action Required';
        }
        if (prediction.riskLevel === 'high') {
            return 'Warning: Exhaustion Approaching';
        }
        if (prediction.trend === 'improving') {
            return 'Positive: Energy Recovery Detected';
        }
        if (prediction.trend === 'declining') {
            return 'Alert: Declining Energy Trend';
        }
        return 'Status: Energy Levels Stable';
    }

    private generateInsightMessage(prediction: PredictionResult, metrics: CombinedMetrics[]): string {
        const current = metrics[metrics.length - 1]?.exhaustionScore || 100;
        const predicted = prediction.predictedScore;
        const change = predicted - current;
        
        let message = `Your current exhaustion score is ${current}/100. `;
        
        if (prediction.timeToExhaustion < Infinity) {
            message += `AI predicts you'll reach exhaustion threshold in ${prediction.timeToExhaustion} minutes. `;
        } else if (change > 0) {
            message += `AI predicts improvement to ${predicted}/100 in 30 minutes. `;
        } else {
            message += `AI predicts slight decline to ${predicted}/100 in 30 minutes. `;
        }
        
        message += prediction.recommendation;
        
        return message;
    }

    private generateActions(prediction: PredictionResult): string[] {
        const actions: string[] = [];

        if (prediction.riskLevel === 'critical' || prediction.riskLevel === 'high') {
            actions.push('Take a 10-minute recovery break immediately');
            actions.push('Enable do-not-disturb mode');
            actions.push('Practice breathing exercises');
        } else if (prediction.trend === 'declining') {
            actions.push('Schedule a break in the next 30 minutes');
            actions.push('Reduce tab switching frequency');
            actions.push('Check your posture and screen distance');
        } else if (prediction.trend === 'improving') {
            actions.push('Maintain current work rhythm');
            actions.push('Stay hydrated');
        } else {
            actions.push('Continue monitoring your metrics');
            actions.push('Plan breaks every 60-90 minutes');
        }

        return actions;
    }

    /**
     * Save model to IndexedDB
     */
    async saveModel(): Promise<boolean> {
        if (!this.model) return false;

        try {
            await this.model.save('indexeddb://fatigue-prediction-model');
            console.log('Model saved to IndexedDB');
            return true;
        } catch (error) {
            console.error('Failed to save model:', error);
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }
}

// Export singleton instance
export const aiPredictionEngine = new AIPredictionEngine();
