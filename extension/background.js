/**
 * Burnout Guard — Background Service Worker
 * 
 * Responsibilities:
 * 1. Track tab switches and window focus changes
 * 2. Monitor idle state via chrome.idle API
 * 3. Receive mouse/scroll activity from content scripts
 * 4. Compute a rolling Burnout Risk / Focus Score (0–100)
 * 5. Trigger interventions when score drops below thresholds
 * 6. Store everything in IndexedDB via batched writes
 * 7. Respond to popup requests for live data
 */

import { openDB, logEvent, storeScore, logIntervention, getRecentEvents, getRecentScores, getScoresSince, getRecentInterventions, getDailySummaries, storeDailySummary, purgeOldEvents } from './lib/db.js';

// ─── State ───────────────────────────────────────────────────────────────
let activeTabId = null;
let activeTabUrl = '';
let activeSince = Date.now();
let currentIdleState = 'active';
let lastInterventionTime = 0;
let sessionStartTime = Date.now();

// Rolling event window (in‑memory for fast score computation)
let eventWindow = [];
const EVENT_WINDOW_MS = 600000; // 10 minutes

// Event batch buffer (batched writes every 15 seconds)
let eventBatch = [];
let BATCH_INTERVAL = 15000;

// Current computed score
let currentScore = 100;
let lowScoreSince = null; // timestamp when score first dropped below threshold

// ─── Initialization ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
    console.log('[BurnoutGuard] Extension installed. Initializing...');
    await openDB();

    // Set idle detection interval (60 seconds)
    chrome.idle.setDetectionInterval(60);

    // Set up periodic alarms
    chrome.alarms.create('computeScore', { periodInMinutes: 0.5 }); // every 30s
    chrome.alarms.create('flushBatch', { periodInMinutes: 0.25 }); // every 15s
    chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440 }); // once a day

    // Log session start
    addToWindow({ type: 'session_start', timestamp: Date.now(), data: {} });
});

// Also initialize on service worker startup (persists across restarts)
chrome.runtime.onStartup.addListener(async () => {
    await openDB();
    chrome.idle.setDetectionInterval(60);
    chrome.alarms.create('computeScore', { periodInMinutes: 0.5 });
    chrome.alarms.create('flushBatch', { periodInMinutes: 0.25 });
    sessionStartTime = Date.now();
    addToWindow({ type: 'session_start', timestamp: Date.now(), data: {} });
});


// ─── Tab Switch Tracking ─────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const now = Date.now();
    const previousTab = activeTabId;

    // Log time spent on the previous tab
    if (previousTab && activeSince) {
        const duration = now - activeSince;
        const event = {
            type: 'tab_switch',
            timestamp: now,
            data: {
                fromTab: previousTab,
                toTab: activeInfo.tabId,
                duration,
                fromUrl: activeTabUrl
            }
        };
        addToWindow(event);
        batchEvent(event);
    }

    activeTabId = activeInfo.tabId;
    activeSince = now;

    // Get URL of the new active tab
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        activeTabUrl = tab.url || '';
    } catch (e) {
        activeTabUrl = '';
    }
});

// Track tab creation (rapid tab opening is a stress indicator)
chrome.tabs.onCreated.addListener((tab) => {
    const event = {
        type: 'tab_created',
        timestamp: Date.now(),
        data: { tabId: tab.id, url: tab.pendingUrl || '' }
    };
    addToWindow(event);
    batchEvent(event);
});

// Track tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    const event = {
        type: 'tab_closed',
        timestamp: Date.now(),
        data: { tabId }
    };
    addToWindow(event);
    batchEvent(event);
});


// ─── Window Focus Tracking ───────────────────────────────────────────────
chrome.windows.onFocusChanged.addListener((windowId) => {
    const now = Date.now();
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        const event = {
            type: 'browser_blur',
            timestamp: now,
            data: { duration: now - activeSince }
        };
        addToWindow(event);
        batchEvent(event);
    } else {
        const event = {
            type: 'browser_focus',
            timestamp: now,
            data: {}
        };
        addToWindow(event);
        batchEvent(event);
        activeSince = now;
    }
});


// ─── Idle Detection ──────────────────────────────────────────────────────
chrome.idle.onStateChanged.addListener((state) => {
    const now = Date.now();
    const event = {
        type: 'idle_change',
        timestamp: now,
        data: { state, previousState: currentIdleState }
    };
    currentIdleState = state;
    addToWindow(event);
    batchEvent(event);
});


// ─── Message Handling (from content scripts & popup) ─────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'mouse_activity': {
            const event = {
                type: 'mouse_activity',
                timestamp: message.timestamp || Date.now(),
                data: {
                    count: message.count,
                    speed: message.speed || 0,
                    directionChanges: message.directionChanges || 0,
                    tabId: sender.tab?.id
                }
            };
            addToWindow(event);
            batchEvent(event);
            break;
        }

        case 'scroll_activity': {
            const event = {
                type: 'scroll_activity',
                timestamp: message.timestamp || Date.now(),
                data: {
                    count: message.count,
                    rapidScrolls: message.rapidScrolls || 0,
                    tabId: sender.tab?.id
                }
            };
            addToWindow(event);
            batchEvent(event);
            break;
        }

        case 'keystroke_activity': {
            const event = {
                type: 'keystroke_activity',
                timestamp: message.timestamp || Date.now(),
                data: {
                    count: message.count,
                    tabId: sender.tab?.id
                }
            };
            addToWindow(event);
            batchEvent(event);
            break;
        }

        case 'intervention_response': {
            logIntervention(
                message.interventionType || 'generic',
                message.score || currentScore,
                message.action || 'dismissed'
            );
            break;
        }

        case 'get_current_score': {
            sendResponse({
                score: currentScore,
                factors: getScoreFactors(),
                sessionDuration: Date.now() - sessionStartTime,
                idleState: currentIdleState
            });
            return true; // async response
        }

        case 'get_dashboard_data': {
            handleDashboardRequest().then(data => sendResponse(data));
            return true; // async response
        }

        case 'get_hourly_scores': {
            getScoresSince(message.hours || 12).then(scores => sendResponse(scores));
            return true;
        }

        case 'get_interventions': {
            getRecentInterventions(message.count || 10).then(data => sendResponse(data));
            return true;
        }

        case 'get_daily_summaries': {
            getDailySummaries(message.days || 7).then(data => sendResponse(data));
            return true;
        }
    }
});


// ─── Alarm Handlers ──────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
    switch (alarm.name) {
        case 'computeScore':
            await computeAndStoreScore();
            break;
        case 'flushBatch':
            await flushEventBatch();
            break;
        case 'dailyCleanup':
            await performDailyCleanup();
            break;
    }
});


// ─── Event Window Management ─────────────────────────────────────────────
function addToWindow(event) {
    eventWindow.push(event);
    // Trim events older than the window
    const cutoff = Date.now() - EVENT_WINDOW_MS;
    while (eventWindow.length > 0 && eventWindow[0].timestamp < cutoff) {
        eventWindow.shift();
    }
}


// ─── Batch Event Writes ──────────────────────────────────────────────────
function batchEvent(event) {
    eventBatch.push(event);
}

async function flushEventBatch() {
    if (eventBatch.length === 0) return;
    const batch = [...eventBatch];
    eventBatch = [];

    try {
        const db = await openDB();
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        for (const event of batch) {
            store.add({
                type: event.type,
                data: event.data,
                timestamp: event.timestamp
            });
        }
    } catch (err) {
        console.error('[BurnoutGuard] Failed to flush event batch:', err);
        // Put events back
        eventBatch = [...batch, ...eventBatch];
    }
}


// ──────────────────────────────────────────────────────────────────────────
//                     FOCUS SCORE COMPUTATION ENGINE
// ──────────────────────────────────────────────────────────────────────────

/**
 * Factor weights (research-inspired):
 *   Tab switching frequency:    30%
 *   Extended idle:              20%
 *   Late-night usage:           15%
 *   Erratic mouse behavior:    15%
 *   Scroll without pause:      10%
 *   Work time irregularity:    10%
 */

function computeFocusScore() {
    const now = Date.now();
    const twoMinAgo = now - 120000;
    const fiveMinAgo = now - 300000;

    // ── 1. Tab Switching Penalty (30% weight) ──
    const recentTabSwitches = eventWindow.filter(
        e => e.type === 'tab_switch' && e.timestamp > twoMinAgo
    ).length;
    // Rapid tab creation is also a stress signal
    const recentTabCreations = eventWindow.filter(
        e => e.type === 'tab_created' && e.timestamp > twoMinAgo
    ).length;
    const tabActivity = recentTabSwitches + recentTabCreations * 0.5;
    // 0 switches = 0 penalty, 10+ switches = full 30 penalty
    const tabPenalty = Math.min(tabActivity * 3, 30);

    // ── 2. Extended Idle Penalty (20% weight) ──
    const idleEvents = eventWindow.filter(
        e => e.type === 'idle_change' && e.timestamp > fiveMinAgo
    );
    let idlePenalty = 0;
    if (currentIdleState === 'idle') {
        // Find when idle started
        const lastIdleStart = idleEvents
            .filter(e => e.data.state === 'idle')
            .pop();
        if (lastIdleStart) {
            const idleDuration = (now - lastIdleStart.timestamp) / 60000; // minutes
            if (idleDuration > 5) {
                idlePenalty = Math.min(idleDuration * 2, 20); // up to 20
            }
        }
    } else if (currentIdleState === 'locked') {
        idlePenalty = 10; // moderate penalty for locked screen
    }

    // ── 3. Late-Night Usage Penalty (15% weight) ──
    const hour = new Date().getHours();
    let lateNightPenalty = 0;
    if (hour >= 23 || hour <= 4) {
        lateNightPenalty = 15; // full penalty
    } else if (hour >= 22 || hour === 5) {
        lateNightPenalty = 8; // partial penalty
    }

    // ── 4. Erratic Mouse Behavior (15% weight) ──
    const mouseEvents = eventWindow.filter(
        e => e.type === 'mouse_activity' && e.timestamp > twoMinAgo
    );
    let mousePenalty = 0;
    if (mouseEvents.length > 0) {
        const totalDirectionChanges = mouseEvents.reduce(
            (sum, e) => sum + (e.data.directionChanges || 0), 0
        );
        const avgSpeed = mouseEvents.reduce(
            (sum, e) => sum + (e.data.speed || 0), 0
        ) / mouseEvents.length;

        // High direction changes + high speed = agitated movement
        if (totalDirectionChanges > 20 && avgSpeed > 500) {
            mousePenalty = 15;
        } else if (totalDirectionChanges > 10 || avgSpeed > 300) {
            mousePenalty = 8;
        } else if (totalDirectionChanges > 5) {
            mousePenalty = 3;
        }
    }

    // ── 5. Scroll Without Pause (10% weight) ──
    const scrollEvents = eventWindow.filter(
        e => e.type === 'scroll_activity' && e.timestamp > twoMinAgo
    );
    let scrollPenalty = 0;
    if (scrollEvents.length > 0) {
        const totalRapidScrolls = scrollEvents.reduce(
            (sum, e) => sum + (e.data.rapidScrolls || 0), 0
        );
        scrollPenalty = Math.min(totalRapidScrolls * 2, 10);
    }

    // ── 6. Work Time Irregularity (10% weight) ──
    // Simple heuristic: penalize for unusual hours (before 7 AM or after 9 PM on weekdays)
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let irregularityPenalty = 0;
    if (!isWeekend) {
        if (hour < 7 || hour > 21) {
            irregularityPenalty = 10;
        } else if (hour < 8 || hour > 20) {
            irregularityPenalty = 5;
        }
    }

    // ── Compute Final Score ──
    const totalPenalty = tabPenalty + idlePenalty + lateNightPenalty +
        mousePenalty + scrollPenalty + irregularityPenalty;

    const score = Math.max(0, Math.min(100, 100 - totalPenalty));

    return {
        score,
        factors: {
            tabSwitching: { penalty: tabPenalty, switches: recentTabSwitches, maxWeight: 30 },
            idle: { penalty: idlePenalty, state: currentIdleState, maxWeight: 20 },
            lateNight: { penalty: lateNightPenalty, hour, maxWeight: 15 },
            erraticMouse: { penalty: mousePenalty, maxWeight: 15 },
            anxiousScroll: { penalty: scrollPenalty, maxWeight: 10 },
            irregularity: { penalty: irregularityPenalty, maxWeight: 10 }
        }
    };
}

function getScoreFactors() {
    const result = computeFocusScore();
    return result.factors;
}

async function computeAndStoreScore() {
    const result = computeFocusScore();
    currentScore = result.score;

    // Store the score
    try {
        await storeScore(result.score, result.factors);
    } catch (err) {
        console.error('[BurnoutGuard] Failed to store score:', err);
    }

    // Update badge
    updateBadge(result.score);

    // Check intervention thresholds
    checkInterventionThreshold(result.score);
}


// ─── Badge Update ────────────────────────────────────────────────────────
function updateBadge(score) {
    const text = score.toString();

    let color;
    if (score >= 70) {
        color = '#22c55e'; // green
    } else if (score >= 50) {
        color = '#f59e0b'; // amber
    } else if (score >= 30) {
        color = '#f97316'; // orange
    } else {
        color = '#ef4444'; // red
    }

    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
}


// ─── Intervention System ─────────────────────────────────────────────────
const INTERVENTION_COOLDOWN = 300000; // 5 minutes between interventions
const MILD_THRESHOLD = 40;
const URGENT_THRESHOLD = 20;
const SUSTAINED_DURATION = 30000; // 30 seconds of low score

function checkInterventionThreshold(score) {
    const now = Date.now();

    if (score < MILD_THRESHOLD) {
        if (!lowScoreSince) {
            lowScoreSince = now;
        }

        const sustained = now - lowScoreSince;

        if (sustained >= SUSTAINED_DURATION && now - lastInterventionTime > INTERVENTION_COOLDOWN) {
            const isUrgent = score < URGENT_THRESHOLD;
            triggerIntervention(score, isUrgent);
            lastInterventionTime = now;
            lowScoreSince = null; // reset
        }
    } else {
        lowScoreSince = null; // score recovered
    }
}

async function triggerIntervention(score, isUrgent) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'show_intervention',
                score,
                isUrgent,
                timestamp: Date.now()
            });
        }
    } catch (err) {
        console.error('[BurnoutGuard] Failed to trigger intervention:', err);
    }
}


// ─── Dashboard Data Handler ──────────────────────────────────────────────
async function handleDashboardRequest() {
    try {
        const [scores, interventions, dailySummaries] = await Promise.all([
            getScoresSince(12),
            getRecentInterventions(10),
            getDailySummaries(7)
        ]);

        const now = Date.now();
        const result = computeFocusScore();

        // Compute session stats
        const sessionMs = now - sessionStartTime;
        const sessionMinutes = Math.floor(sessionMs / 60000);
        const sessionHours = Math.floor(sessionMinutes / 60);
        const sessionMins = sessionMinutes % 60;

        // Count tab switches today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEvents = eventWindow.filter(e =>
            e.type === 'tab_switch' && e.timestamp >= todayStart.getTime()
        );

        // Find active vs idle time (rough estimate from recent events)
        const idleChanges = eventWindow.filter(e => e.type === 'idle_change');
        let totalIdleMs = 0;
        for (let i = 0; i < idleChanges.length; i++) {
            if (idleChanges[i].data.state === 'idle' || idleChanges[i].data.state === 'locked') {
                const end = idleChanges[i + 1]?.timestamp || now;
                totalIdleMs += end - idleChanges[i].timestamp;
            }
        }
        const idleMinutes = Math.floor(totalIdleMs / 60000);
        const activeMinutes = sessionMinutes - idleMinutes;

        // Build hourly score data for chart
        const hourlyScores = buildHourlyScores(scores);

        // Compute trend (compare first half vs second half of recent scores)
        let trend = 0;
        if (scores.length >= 4) {
            const mid = Math.floor(scores.length / 2);
            const firstHalfAvg = scores.slice(0, mid).reduce((s, x) => s + x.score, 0) / mid;
            const secondHalfAvg = scores.slice(mid).reduce((s, x) => s + x.score, 0) / (scores.length - mid);
            trend = Math.round(secondHalfAvg - firstHalfAvg);
        }

        // Find distraction peak
        const hourCounts = {};
        eventWindow.filter(e => e.type === 'tab_switch').forEach(e => {
            const h = new Date(e.timestamp).getHours();
            hourCounts[h] = (hourCounts[h] || 0) + 1;
        });
        let peakHour = 0, peakCount = 0;
        for (const [h, c] of Object.entries(hourCounts)) {
            if (c > peakCount) { peakHour = parseInt(h); peakCount = c; }
        }

        // Generate insights
        const insights = generateInsights(result.factors, todayEvents.length, sessionMinutes);

        return {
            currentScore: result.score,
            factors: result.factors,
            sessionDuration: sessionHours > 0 ? `${sessionHours}h ${sessionMins}m` : `${sessionMins}m`,
            activeTime: `${Math.max(0, activeMinutes)}m`,
            idleTime: `${idleMinutes}m`,
            tabSwitches: todayEvents.length,
            hourlyScores,
            interventions,
            dailySummaries,
            trend,
            distractionPeak: peakHour > 0 ? `${peakHour}:00` : 'N/A',
            insights,
            idleState: currentIdleState
        };
    } catch (err) {
        console.error('[BurnoutGuard] Dashboard data error:', err);
        return {
            currentScore: currentScore,
            factors: {},
            sessionDuration: '0m',
            activeTime: '0m',
            idleTime: '0m',
            tabSwitches: 0,
            hourlyScores: [],
            interventions: [],
            dailySummaries: [],
            trend: 0,
            distractionPeak: 'N/A',
            insights: [],
            idleState: 'active'
        };
    }
}

function buildHourlyScores(scores) {
    if (scores.length === 0) return [];

    // Group by hour
    const hourGroups = {};
    scores.forEach(s => {
        const d = new Date(s.timestamp);
        const key = `${d.getHours()}:00`;
        if (!hourGroups[key]) hourGroups[key] = [];
        hourGroups[key].push(s.score);
    });

    return Object.entries(hourGroups).map(([hour, vals]) => ({
        hour,
        avgScore: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        count: vals.length
    }));
}

function generateInsights(factors, tabSwitchesToday, sessionMinutes) {
    const insights = [];

    if (factors.tabSwitching?.penalty > 15) {
        insights.push({
            type: 'warning',
            icon: '⚡',
            title: 'High Context Switching',
            message: `You switched tabs ${factors.tabSwitching.switches} times in the last 2 minutes. Try grouping related tabs together.`
        });
    }

    if (factors.lateNight?.penalty > 0) {
        insights.push({
            type: 'alert',
            icon: '🌙',
            title: 'Late-Night Usage',
            message: 'Working late affects tomorrow\'s focus. Consider wrapping up and setting a Digital Sunset.'
        });
    }

    if (factors.erraticMouse?.penalty > 8) {
        insights.push({
            type: 'info',
            icon: '🖱️',
            title: 'Erratic Mouse Movement',
            message: 'Rapid, unfocused mouse movement detected — a sign of cognitive overload. Take a brief pause.'
        });
    }

    if (factors.anxiousScroll?.penalty > 5) {
        insights.push({
            type: 'info',
            icon: '📜',
            title: 'Doom Scrolling Detected',
            message: 'Rapid scrolling without pausing suggests anxiety browsing. Try a 30-second breathing exercise.'
        });
    }

    if (sessionMinutes > 90 && factors.idle?.penalty === 0) {
        insights.push({
            type: 'suggestion',
            icon: '🧘',
            title: 'Time for a Break',
            message: `You've been active for ${sessionMinutes} minutes straight. Even a 2-minute break can boost focus by 15%.`
        });
    }

    if (tabSwitchesToday > 100) {
        insights.push({
            type: 'warning',
            icon: '📊',
            title: 'Tab Switches Piling Up',
            message: `${tabSwitchesToday} tab switches today. This is above the recommended threshold of 100.`
        });
    }

    // Always show at least one positive insight
    if (insights.length === 0) {
        insights.push({
            type: 'positive',
            icon: '✅',
            title: 'Great Focus!',
            message: 'Your digital behavior patterns look healthy right now. Keep it up!'
        });
    }

    return insights;
}


// ─── Daily Cleanup ───────────────────────────────────────────────────────
async function performDailyCleanup() {
    try {
        // Store today's summary before purging
        const todayStr = new Date().toISOString().split('T')[0];
        const scores = await getScoresSince(24);
        if (scores.length > 0) {
            const avgScore = Math.round(
                scores.reduce((s, x) => s + x.score, 0) / scores.length
            );
            const minScore = Math.min(...scores.map(s => s.score));
            const maxScore = Math.max(...scores.map(s => s.score));

            await storeDailySummary(todayStr, {
                avgScore,
                minScore,
                maxScore,
                totalScores: scores.length,
                sessionDuration: Date.now() - sessionStartTime
            });
        }

        // Purge old events (keep 30 days)
        const deleted = await purgeOldEvents(30);
        console.log(`[BurnoutGuard] Daily cleanup: purged ${deleted} old events`);
    } catch (err) {
        console.error('[BurnoutGuard] Daily cleanup error:', err);
    }
}

// ── Initial Setup ──
openDB().then(() => {
    console.log('[BurnoutGuard] Service Worker ready.');
    chrome.idle.setDetectionInterval(60);
    updateBadge(currentScore);
});
