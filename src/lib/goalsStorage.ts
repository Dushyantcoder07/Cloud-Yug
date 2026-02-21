/**
 * Goals Storage System
 * Manages storage and retrieval of daily metrics for goals tracking
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DailyMetrics } from '../types';

interface GoalsDB extends DBSchema {
    daily_metrics: {
        key: string; // date in YYYY-MM-DD format
        value: DailyMetrics;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'goals-tracker-db';
let dbPromise: Promise<IDBPDatabase<GoalsDB>> | null = null;

async function initDB(): Promise<IDBPDatabase<GoalsDB>> {
    if (!dbPromise) {
        dbPromise = openDB<GoalsDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('daily_metrics')) {
                    const store = db.createObjectStore('daily_metrics', {
                        keyPath: 'date'
                    });
                    store.createIndex('by-timestamp', 'timestamp');
                }
            }
        });
    }
    return dbPromise;
}

/**
 * Save or update daily metrics for a specific date
 */
export async function saveDailyMetrics(metrics: DailyMetrics): Promise<void> {
    try {
        const db = await initDB();
        await db.put('daily_metrics', metrics);
    } catch (error) {
        console.error('Failed to save daily metrics:', error);
    }
}

/**
 * Get metrics for a specific date
 */
export async function getDailyMetrics(date: string): Promise<DailyMetrics | null> {
    try {
        const db = await initDB();
        const metrics = await db.get('daily_metrics', date);
        return metrics || null;
    } catch (error) {
        console.error('Failed to get daily metrics:', error);
        return null;
    }
}

/**
 * Get metrics for the last N days
 */
export async function getLastNDaysMetrics(days: number = 7): Promise<DailyMetrics[]> {
    try {
        const db = await initDB();
        const tx = db.transaction('daily_metrics', 'readonly');
        const store = tx.objectStore('daily_metrics');
        const index = store.index('by-timestamp');
        
        const allMetrics = await index.getAll();
        
        // Sort by timestamp descending and take last N days
        const sorted = allMetrics
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, days);
        
        // Reverse to get chronological order
        return sorted.reverse();
    } catch (error) {
        console.error('Failed to get last N days metrics:', error);
        return [];
    }
}

/**
 * Get all daily metrics
 */
export async function getAllDailyMetrics(): Promise<DailyMetrics[]> {
    try {
        const db = await initDB();
        const allMetrics = await db.getAll('daily_metrics');
        return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
        console.error('Failed to get all daily metrics:', error);
        return [];
    }
}

/**
 * Delete old metrics (older than N days)
 */
export async function cleanupOldMetrics(daysToKeep: number = 30): Promise<void> {
    try {
        const db = await initDB();
        const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        
        const tx = db.transaction('daily_metrics', 'readwrite');
        const store = tx.objectStore('daily_metrics');
        const index = store.index('by-timestamp');
        
        let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffDate));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        
        await tx.done;
    } catch (error) {
        console.error('Failed to cleanup old metrics:', error);
    }
}

/**
 * Get current day's metrics or create new one
 */
export async function getTodayMetrics(): Promise<DailyMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await getDailyMetrics(today);
    
    if (existing) {
        return existing;
    }
    
    // Create new metrics for today
    const newMetrics: DailyMetrics = {
        date: today,
        focusScore: 0,
        activeMinutes: 0,
        tabSwitches: 0,
        interventions: 0,
        physiologicalScore: 0,
        timestamp: Date.now()
    };
    
    await saveDailyMetrics(newMetrics);
    return newMetrics;
}

/**
 * Update today's metrics incrementally
 */
export async function updateTodayMetrics(updates: Partial<Omit<DailyMetrics, 'date' | 'timestamp'>>): Promise<void> {
    try {
        const today = await getTodayMetrics();
        const updated: DailyMetrics = {
            ...today,
            ...updates,
            timestamp: Date.now() // Update timestamp
        };
        await saveDailyMetrics(updated);
    } catch (error) {
        console.error('Failed to update today metrics:', error);
    }
}
