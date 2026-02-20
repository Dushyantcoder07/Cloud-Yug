/**
 * IndexedDB Wrapper for Burnout Guard
 * Handles all persistent storage: events, scores, daily summaries, interventions
 */

const DB_NAME = 'burnoutGuardDB';
const DB_VERSION = 1;

let dbInstance = null;

export function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Raw events store (tab switches, idle changes, mouse activity, scroll, etc.)
            if (!db.objectStoreNames.contains('events')) {
                const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                eventStore.createIndex('timestamp', 'timestamp', { unique: false });
                eventStore.createIndex('type', 'type', { unique: false });
            }

            // Computed focus scores (stored every 30 seconds)
            if (!db.objectStoreNames.contains('scores')) {
                const scoreStore = db.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
                scoreStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Daily summaries (aggregated once per day)
            if (!db.objectStoreNames.contains('dailySummaries')) {
                const dailyStore = db.createObjectStore('dailySummaries', { keyPath: 'date' });
            }

            // Intervention log
            if (!db.objectStoreNames.contains('interventions')) {
                const intStore = db.createObjectStore('interventions', { keyPath: 'id', autoIncrement: true });
                intStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Log a raw event
 */
export async function logEvent(type, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        const record = {
            type,
            data,
            timestamp: data.timestamp || Date.now()
        };
        const req = store.add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Store a computed focus score
 */
export async function storeScore(score, factors) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('scores', 'readwrite');
        const store = tx.objectStore('scores');
        const record = {
            score,
            factors,
            timestamp: Date.now()
        };
        const req = store.add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Log an intervention
 */
export async function logIntervention(type, score, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('interventions', 'readwrite');
        const store = tx.objectStore('interventions');
        const record = {
            type,
            score,
            action,
            timestamp: Date.now()
        };
        const req = store.add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Get events from the last N milliseconds
 */
export async function getRecentEvents(windowMs) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const index = store.index('timestamp');
        const cutoff = Date.now() - windowMs;
        const range = IDBKeyRange.lowerBound(cutoff);
        const results = [];

        const cursor = index.openCursor(range);
        cursor.onsuccess = (event) => {
            const c = event.target.result;
            if (c) {
                results.push(c.value);
                c.continue();
            } else {
                resolve(results);
            }
        };
        cursor.onerror = () => reject(cursor.error);
    });
}

/**
 * Get the last N scores
 */
export async function getRecentScores(count = 100) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('scores', 'readonly');
        const store = tx.objectStore('scores');
        const index = store.index('timestamp');
        const results = [];

        const cursor = index.openCursor(null, 'prev');
        cursor.onsuccess = (event) => {
            const c = event.target.result;
            if (c && results.length < count) {
                results.push(c.value);
                c.continue();
            } else {
                resolve(results.reverse());
            }
        };
        cursor.onerror = () => reject(cursor.error);
    });
}

/**
 * Get scores from the last N hours
 */
export async function getScoresSince(hoursAgo) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('scores', 'readonly');
        const store = tx.objectStore('scores');
        const index = store.index('timestamp');
        const cutoff = Date.now() - hoursAgo * 3600000;
        const range = IDBKeyRange.lowerBound(cutoff);
        const results = [];

        const cursor = index.openCursor(range);
        cursor.onsuccess = (event) => {
            const c = event.target.result;
            if (c) {
                results.push(c.value);
                c.continue();
            } else {
                resolve(results);
            }
        };
        cursor.onerror = () => reject(cursor.error);
    });
}

/**
 * Get recent interventions
 */
export async function getRecentInterventions(count = 10) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('interventions', 'readonly');
        const store = tx.objectStore('interventions');
        const index = store.index('timestamp');
        const results = [];

        const cursor = index.openCursor(null, 'prev');
        cursor.onsuccess = (event) => {
            const c = event.target.result;
            if (c && results.length < count) {
                results.push(c.value);
                c.continue();
            } else {
                resolve(results);
            }
        };
        cursor.onerror = () => reject(cursor.error);
    });
}

/**
 * Store or update daily summary
 */
export async function storeDailySummary(dateStr, summary) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('dailySummaries', 'readwrite');
        const store = tx.objectStore('dailySummaries');
        const record = { date: dateStr, ...summary };
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/**
 * Get daily summaries for the last N days
 */
export async function getDailySummaries(days = 7) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('dailySummaries', 'readonly');
        const store = tx.objectStore('dailySummaries');
        const results = [];

        const cursor = store.openCursor(null, 'prev');
        cursor.onsuccess = (event) => {
            const c = event.target.result;
            if (c && results.length < days) {
                results.push(c.value);
                c.continue();
            } else {
                resolve(results.reverse());
            }
        };
        cursor.onerror = () => reject(cursor.error);
    });
}

/**
 * Purge events older than N days to keep storage lean
 */
export async function purgeOldEvents(daysToKeep = 30) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        const index = store.index('timestamp');
        const cutoff = Date.now() - daysToKeep * 24 * 3600000;
        const range = IDBKeyRange.upperBound(cutoff);
        let deleted = 0;

        const cursor = index.openCursor(range);
        cursor.onsuccess = (event) => {
            const c = event.target.result;
            if (c) {
                c.delete();
                deleted++;
                c.continue();
            } else {
                resolve(deleted);
            }
        };
        cursor.onerror = () => reject(cursor.error);
    });
}

/**
 * Get all events of a specific type within a time range
 */
export async function getEventsByType(type, sinceMs) {
    const events = await getRecentEvents(sinceMs);
    return events.filter(e => e.type === type);
}
