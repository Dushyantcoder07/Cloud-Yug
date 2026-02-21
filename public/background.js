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
let sessionDate = new Date().toISOString().split('T')[0]; // Current session date

// Rolling event window (in‑memory for fast score computation)
let eventWindow = [];
const EVENT_WINDOW_MS = 600000; // 10 minutes

// Event batch buffer (batched writes every 15 seconds)
let eventBatch = [];
let BATCH_INTERVAL = 15000;

// Current computed score
let currentScore = 100;
let lowScoreSince = null; // timestamp when score first dropped below threshold

// ─── Session Persistence ─────────────────────────────────────────────────
async function loadOrCreateSession() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Try to load existing session from chrome.storage
        const result = await chrome.storage.local.get(['sessionData']);
        
        if (result.sessionData && result.sessionData.date === today) {
            // Resume existing session from today
            sessionStartTime = result.sessionData.startTime;
            sessionDate = result.sessionData.date;
            currentScore = result.sessionData.currentScore || 100;
            console.log('[BurnoutGuard] Resumed session from', new Date(sessionStartTime).toLocaleTimeString());
        } else {
            // Start new session for new day
            sessionStartTime = Date.now();
            sessionDate = today;
            currentScore = 100;
            await saveSessionData();
            console.log('[BurnoutGuard] Started new session for', today);
        }
    } catch (err) {
        console.error('[BurnoutGuard] Failed to load session:', err);
        sessionStartTime = Date.now();
        sessionDate = today;
    }
}

async function saveSessionData() {
    try {
        await chrome.storage.local.set({
            sessionData: {
                startTime: sessionStartTime,
                date: sessionDate,
                currentScore: currentScore,
                lastUpdate: Date.now()
            }
        });
    } catch (err) {
        console.error('[BurnoutGuard] Failed to save session:', err);
    }
}

// ─── Initialization ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
    console.log('[BurnoutGuard] Extension installed. Initializing...');
    await openDB();
    await loadOrCreateSession();

    // Set idle detection interval (60 seconds)
    chrome.idle.setDetectionInterval(60);

    // Set up periodic alarms
    chrome.alarms.create('computeScore', { periodInMinutes: 0.5 }); // every 30s
    chrome.alarms.create('flushBatch', { periodInMinutes: 0.25 }); // every 15s
    chrome.alarms.create('saveSession', { periodInMinutes: 1 }); // save session every minute
    chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440 }); // once a day

    // Log session start
    addToWindow({ type: 'session_start', timestamp: Date.now(), data: {} });
});

// Also initialize on service worker startup (persists across restarts)
chrome.runtime.onStartup.addListener(async () => {
    await openDB();
    await loadOrCreateSession();
    chrome.idle.setDetectionInterval(60);
    chrome.alarms.create('computeScore', { periodInMinutes: 0.5 });
    chrome.alarms.create('flushBatch', { periodInMinutes: 0.25 });
    chrome.alarms.create('saveSession', { periodInMinutes: 1 });
    chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440 });
    addToWindow({ type: 'session_start', timestamp: Date.now(), data: {} });
});


// ─── Tab Switch Tracking ─────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const now = Date.now();
    const previousTab = activeTabId;

    // Get URL of the new active tab first to check if it's an extension tab
    let newTabUrl = '';
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        newTabUrl = tab.url || '';
    } catch (e) {
        newTabUrl = '';
    }

    // Skip tracking if switching to/from extension tabs
    const isExtensionTab = newTabUrl.startsWith('chrome-extension://');
    const wasExtensionTab = activeTabUrl.startsWith('chrome-extension://');

    // Log time spent on the previous tab (only if not extension tabs)
    if (previousTab && activeSince && !isExtensionTab && !wasExtensionTab) {
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
    activeTabUrl = newTabUrl;
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

        case 'typing_metrics': {
            const event = {
                type: 'typing_metrics',
                timestamp: message.timestamp || Date.now(),
                data: {
                    avgInterval: message.avgInterval,
                    variance: message.variance,
                    stdDev: message.stdDev,
                    errorRate: message.errorRate,
                    totalKeystrokes: message.totalKeystrokes,
                    backspaces: message.backspaces,
                    fatigued: message.fatigued,
                    tabId: sender.tab?.id
                }
            };
            addToWindow(event);
            batchEvent(event);
            break;
        }

        case 'click_accuracy': {
            const event = {
                type: 'click_accuracy',
                timestamp: message.timestamp || Date.now(),
                data: {
                    totalClicks: message.totalClicks,
                    hesitationClicks: message.hesitationClicks,
                    hesitationRate: message.hesitationRate,
                    fatigued: message.fatigued,
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
            handleDashboardRequest().then(data => {
                sendResponse({ success: true, data });
            }).catch(err => {
                console.error('[BurnoutGuard] Dashboard data error:', err);
                sendResponse({ success: false, error: err.message });
            });
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
        case 'saveSession':
            await saveSessionData();
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
 *   Tab switching frequency:    25%
 *   Typing fatigue:             20%
 *   Extended idle:              15%
 *   Click accuracy:             15%
 *   Late-night usage:           10%
 *   Erratic mouse behavior:    10%
 *   Scroll without pause:       5%
 */

function computeFocusScore() {
    const now = Date.now();
    const twoMinAgo = now - 120000;
    const fiveMinAgo = now - 300000;

    // ── 1. Tab Switching Penalty (25% weight) ──
    const recentTabSwitches = eventWindow.filter(
        e => e.type === 'tab_switch' && e.timestamp > twoMinAgo
    ).length;
    // Rapid tab creation is also a stress signal
    const recentTabCreations = eventWindow.filter(
        e => e.type === 'tab_created' && e.timestamp > twoMinAgo
    ).length;
    const tabActivity = recentTabSwitches + recentTabCreations * 0.5;
    // 0 switches = 0 penalty, 10+ switches = full 25 penalty
    const tabPenalty = Math.min(tabActivity * 2.5, 25);

    // ── 2. Typing Fatigue Penalty (20% weight) ──
    const typingEvents = eventWindow.filter(
        e => e.type === 'typing_metrics' && e.timestamp > twoMinAgo
    );
    let typingPenalty = 0;
    if (typingEvents.length > 0) {
        const latestTyping = typingEvents[typingEvents.length - 1];
        if (latestTyping.data.fatigued) {
            // High variance + high error rate
            const varianceScore = Math.min((latestTyping.data.variance || 0) / 10000, 1);
            const errorScore = Math.min((latestTyping.data.errorRate || 0) * 5, 1);
            typingPenalty = Math.min((varianceScore + errorScore) * 10, 20);
        }
    }

    // ── 3. Extended Idle Penalty (15% weight) ──
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
                idlePenalty = Math.min(idleDuration * 1.5, 15); // up to 15
            }
        }
    } else if (currentIdleState === 'locked') {
        idlePenalty = 8; // moderate penalty for locked screen
    }

    // ── 4. Click Accuracy Penalty (15% weight) ──
    const clickEvents = eventWindow.filter(
        e => e.type === 'click_accuracy' && e.timestamp > twoMinAgo
    );
    let clickPenalty = 0;
    if (clickEvents.length > 0) {
        const latestClick = clickEvents[clickEvents.length - 1];
        if (latestClick.data.fatigued) {
            const hesitationRate = parseFloat(latestClick.data.hesitationRate) || 0;
            clickPenalty = Math.min(hesitationRate * 75, 15); // up to 15
        }
    }

    // ── 5. Late-Night Usage Penalty (10% weight) ──
    const hour = new Date().getHours();
    let lateNightPenalty = 0;
    if (hour >= 23 || hour <= 4) {
        lateNightPenalty = 10; // full penalty
    } else if (hour >= 22 || hour === 5) {
        lateNightPenalty = 5; // partial penalty
    }

    // ── 6. Erratic Mouse Behavior (10% weight) ──
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
            mousePenalty = 10;
        } else if (totalDirectionChanges > 10 || avgSpeed > 300) {
            mousePenalty = 5;
        } else if (totalDirectionChanges > 5) {
            mousePenalty = 2;
        }
    }

    // ── 7. Scroll Without Pause (5% weight) ──
    const scrollEvents = eventWindow.filter(
        e => e.type === 'scroll_activity' && e.timestamp > twoMinAgo
    );
    let scrollPenalty = 0;
    if (scrollEvents.length > 0) {
        const totalRapidScrolls = scrollEvents.reduce(
            (sum, e) => sum + (e.data.rapidScrolls || 0), 0
        );
        scrollPenalty = Math.min(totalRapidScrolls, 5);
    }

    // ── Compute Final Score ──
    const totalPenalty = tabPenalty + typingPenalty + idlePenalty + clickPenalty +
        lateNightPenalty + mousePenalty + scrollPenalty;

    const score = Math.max(0, Math.min(100, 100 - totalPenalty));

    return {
        score,
        factors: {
            tabSwitching: { penalty: tabPenalty, switches: recentTabSwitches, maxWeight: 25 },
            typingFatigue: { penalty: typingPenalty, maxWeight: 20 },
            idle: { penalty: idlePenalty, state: currentIdleState, maxWeight: 15 },
            clickAccuracy: { penalty: clickPenalty, maxWeight: 15 },
            lateNight: { penalty: lateNightPenalty, hour, maxWeight: 10 },
            erraticMouse: { penalty: mousePenalty, maxWeight: 10 },
            anxiousScroll: { penalty: scrollPenalty, maxWeight: 5 }
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

    // Check old intervention thresholds (full-screen overlay for critical drops)
    checkInterventionThreshold(result.score);

    // Check and fire granular behavior alerts to the active tab
    await checkAndFireBehaviorAlerts(result.score, result.factors);

    // Broadcast real-time update to all listeners (popup, React app, etc.)
    broadcastScoreUpdate(result);

    // Save session data periodically
    await saveSessionData();
}

// ─── Granular Behavior Alerts ────────────────────────────────────────────────
// Per-alert cooldowns (ms) — mirrors useBehaviorAlerts.ts
const BEHAVIOR_ALERT_COOLDOWNS = {
    score_danger:        5 * 60 * 1000,
    score_warning:      10 * 60 * 1000,
    tab_switching:       5 * 60 * 1000,
    erratic_mouse:       8 * 60 * 1000,
    anxious_scroll:      8 * 60 * 1000,
    typing_fatigue:     10 * 60 * 1000,
    click_accuracy:     10 * 60 * 1000,
    late_night:         30 * 60 * 1000,
};
const behaviorAlertLastFired = {};

async function checkAndFireBehaviorAlerts(score, factors) {
    const now = Date.now();
    const candidates = [];

    if (score < 35) {
        candidates.push({
            key: 'score_danger', severity: 'danger',
            title: 'Focus Score Critical',
            message: `Your focus score has dropped to ${score}. Your cognitive state needs attention right now.`,
            suggestion: 'A 4-minute breathing exercise can help restore clarity.',
            ctaLabel: 'Start Breathing', wellnessType: 'breathing'
        });
    } else if (score < 55) {
        candidates.push({
            key: 'score_warning', severity: 'warning',
            title: 'Focus Dropping',
            message: `Focus score is ${score} — below healthy range. Signs of cognitive load are building up.`,
            suggestion: 'Take a 2-minute break or stretch to reset.',
            ctaLabel: 'Take a Break', wellnessType: 'stretch'
        });
    }

    const tabPenalty = factors?.tabSwitching?.penalty ?? 0;
    const tabSwitches = factors?.tabSwitching?.switches ?? 0;
    if (tabPenalty >= 15 || tabSwitches >= 8) {
        candidates.push({
            key: 'tab_switching', severity: 'warning',
            title: 'Too Much Tab Switching',
            message: `You've switched tabs ${tabSwitches} times in the last 2 minutes. This fragments your attention.`,
            suggestion: 'Close unused tabs and focus on one task at a time.',
            ctaLabel: 'Breathing Reset', wellnessType: 'breathing'
        });
    }

    if ((factors?.erraticMouse?.penalty ?? 0) >= 7) {
        candidates.push({
            key: 'erratic_mouse', severity: 'info',
            title: 'Erratic Mouse Detected',
            message: 'Rapid, unfocused mouse movement suggests cognitive overload or anxiety.',
            suggestion: 'Rest your hands, close your eyes for 20 seconds.',
            ctaLabel: 'Eye Rest', wellnessType: 'eyeRest'
        });
    }

    if ((factors?.anxiousScroll?.penalty ?? 0) >= 4) {
        candidates.push({
            key: 'anxious_scroll', severity: 'info',
            title: 'Doom Scrolling Detected',
            message: "You're scrolling rapidly without pausing — a classic anxiety-browsing pattern.",
            suggestion: 'Step away from the feed. Try a short breathing exercise.',
            ctaLabel: 'Calm Down', wellnessType: 'breathing'
        });
    }

    if ((factors?.typingFatigue?.penalty ?? 0) >= 12) {
        candidates.push({
            key: 'typing_fatigue', severity: 'warning',
            title: 'Typing Fatigue',
            message: 'High error rate and irregular keystroke rhythm detected. Your focus is getting tired.',
            suggestion: 'Take a wrist and finger stretch break.',
            ctaLabel: 'Stretch Now', wellnessType: 'stretch'
        });
    }

    if ((factors?.lateNight?.penalty ?? 0) >= 8) {
        const hour = new Date().getHours();
        candidates.push({
            key: 'late_night', severity: 'warning',
            title: 'Late-Night Usage',
            message: `It's ${hour}:00. Working this late disrupts tomorrow's cognitive performance.`,
            suggestion: 'Consider a digital sunset. Wrap up and rest.',
            ctaLabel: 'Wind Down', wellnessType: 'breathing'
        });
    }

    // Fire only the first eligible alert (respect cooldowns)
    for (const candidate of candidates) {
        const lastFired = behaviorAlertLastFired[candidate.key] ?? 0;
        const cooldown = BEHAVIOR_ALERT_COOLDOWNS[candidate.key] ?? 5 * 60 * 1000;
        if (now - lastFired >= cooldown) {
            behaviorAlertLastFired[candidate.key] = now;
            await sendBehaviorAlertToTab(candidate);
            break; // one at a time
        }
    }
}

// Injected directly into the page via chrome.scripting.executeScript —
// completely independent of content script state.
function _injectBehaviorAlertUI(alertData) {
    // Guard: one alert at a time
    if (document.getElementById('bg-behavior-alert-overlay')) return;

    const COLORS = {
        info:    { bar: '#3b82f6', badge: '#eff6ff', badgeText: '#1d4ed8', label: 'Heads Up',      icon: 'ℹ️' },
        warning: { bar: '#f59e0b', badge: '#fffbeb', badgeText: '#b45309', label: 'Warning',       icon: '⚠️' },
        danger:  { bar: '#ef4444', badge: '#fef2f2', badgeText: '#b91c1c', label: 'Action Needed', icon: '🔴' },
    };
    const WELLNESS = { breathing: '🌬️', stretch: '🧘', eyeRest: '👁️', break: '☕' };
    const cfg = COLORS[alertData.severity] || COLORS.info;
    const wellnessEmoji = WELLNESS[alertData.wellnessType] || '🌬️';

    const overlay = document.createElement('div');
    overlay.id = 'bg-behavior-alert-overlay';
    overlay.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;animation:_bg_fadein 0.22s ease;';

    overlay.innerHTML = `
<style>
@keyframes _bg_fadein{from{opacity:0}to{opacity:1}}
@keyframes _bg_cardin{from{opacity:0;transform:translate(-50%,-50%) scale(0.88) translateY(20px)}to{opacity:1;transform:translate(-50%,-50%) scale(1) translateY(0)}}
@keyframes _bg_cardout{from{opacity:1;transform:translate(-50%,-50%) scale(1)}to{opacity:0;transform:translate(-50%,-50%) scale(0.88) translateY(20px)}}
#_bg_backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.48);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);cursor:pointer;}
#_bg_card{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,0.22),0 0 0 1px rgba(0,0,0,0.06);width:calc(100vw - 32px);max-width:440px;overflow:hidden;animation:_bg_cardin 0.32s cubic-bezier(0.16,1,0.3,1);}
#_bg_bar{height:5px;background:${cfg.bar};}
#_bg_body{padding:28px 28px 24px;}
#_bg_head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
#_bg_badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;background:${cfg.badge};color:${cfg.badgeText};}
#_bg_close{width:32px;height:32px;border-radius:10px;border:none;background:#f1f5f9;color:#64748b;cursor:pointer;font-size:16px;line-height:1;transition:background 0.15s;}
#_bg_close:hover{background:#e2e8f0;}
#_bg_main{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;}
#_bg_icon{flex-shrink:0;width:48px;height:48px;border-radius:16px;background:${cfg.badge};display:flex;align-items:center;justify-content:center;font-size:22px;}
#_bg_title{font-size:18px;font-weight:800;color:#0f172a;margin:0 0 6px;line-height:1.3;}
#_bg_msg{font-size:13px;color:#475569;margin:0;line-height:1.55;}
#_bg_tip{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin:0 0 20px 64px;font-size:12px;color:#475569;line-height:1.5;}
#_bg_tip b{color:#334155;}
#_bg_actions{display:flex;gap:10px;margin-left:64px;}
._bg_btn{flex:1;padding:12px 20px;border-radius:14px;border:none;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;font-family:inherit;}
#_bg_cta{background:${cfg.bar};color:#fff;box-shadow:0 4px 12px ${cfg.bar}44;}
#_bg_cta:hover{filter:brightness(1.08);transform:translateY(-1px);}
#_bg_skip{background:#f1f5f9;color:#64748b;}
#_bg_skip:hover{background:#e2e8f0;color:#334155;}
</style>
<div id="_bg_backdrop"></div>
<div id="_bg_card">
  <div id="_bg_bar"></div>
  <div id="_bg_body">
    <div id="_bg_head">
      <div id="_bg_badge">${cfg.icon} ${cfg.label}</div>
      <button id="_bg_close">✕</button>
    </div>
    <div id="_bg_main">
      <div id="_bg_icon">${cfg.icon}</div>
      <div>
        <p id="_bg_title">${alertData.title}</p>
        <p id="_bg_msg">${alertData.message}</p>
      </div>
    </div>
    <div id="_bg_tip"><b>💡 Suggestion: </b>${alertData.suggestion}</div>
    <div id="_bg_actions">
      <button class="_bg_btn" id="_bg_cta">${wellnessEmoji} ${alertData.ctaLabel}</button>
      <button class="_bg_btn" id="_bg_skip">Later</button>
    </div>
  </div>
</div>`;

    document.documentElement.appendChild(overlay);

    function dismiss() {
        const card = document.getElementById('_bg_card');
        if (card) { card.style.animation = '_bg_cardout 0.25s cubic-bezier(0.16,1,0.3,1) forwards'; }
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s';
        setTimeout(() => overlay.remove(), 280);
    }

    document.getElementById('_bg_backdrop').addEventListener('click', dismiss);
    document.getElementById('_bg_close').addEventListener('click', dismiss);
    document.getElementById('_bg_skip').addEventListener('click', dismiss);
    document.getElementById('_bg_cta').addEventListener('click', () => {
        dismiss();
        // Dispatch custom event so the content script can optionally launch the exercise
        setTimeout(() => window.dispatchEvent(new CustomEvent('burnout-guard-wellness', { detail: alertData })), 300);
    });

    // Auto-dismiss after 45 seconds
    setTimeout(() => { if (document.getElementById('bg-behavior-alert-overlay')) dismiss(); }, 45000);
}

async function sendBehaviorAlertToTab(alert) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url) return;
        // Skip internal browser / extension pages
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('about:') || tab.url.startsWith('edge://')) return;

        // Use executeScript so we bypass stale content-script state entirely
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: _injectBehaviorAlertUI,
            args: [alert]
        });
    } catch (err) {
        console.error('[BurnoutGuard] executeScript failed:', err.message);
    }
}

// ─── Real-time Broadcasting ──────────────────────────────────────────────
function broadcastScoreUpdate(result) {
    const now = Date.now();
    const sessionMs = now - sessionStartTime;
    const sessionMinutes = Math.floor(sessionMs / 60000);
    const sessionHours = Math.floor(sessionMinutes / 60);
    const sessionMins = sessionMinutes % 60;

    // Count tab switches today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTabSwitches = eventWindow.filter(e =>
        e.type === 'tab_switch' &&
        e.timestamp >= todayStart.getTime() &&
        !e.data?.fromUrl?.startsWith('chrome-extension://')
    ).length;

    // Rough idle vs active time
    const idleChanges = eventWindow.filter(e => e.type === 'idle_change');
    let totalIdleMs = 0;
    for (let i = 0; i < idleChanges.length; i++) {
        if (idleChanges[i].data.state === 'idle' || idleChanges[i].data.state === 'locked') {
            const end = idleChanges[i + 1]?.timestamp || now;
            totalIdleMs += end - idleChanges[i].timestamp;
        }
    }
    const idleMinutes = Math.floor(totalIdleMs / 60000);
    const activeMinutes = Math.max(0, sessionMinutes - idleMinutes);

    // Send to all extension contexts (popup, options page, etc.) with full payload
    chrome.runtime.sendMessage({
        type: 'score_update',
        score: result.score,
        factors: result.factors,
        timestamp: now,
        // Include enough data for direct consumption (no second roundtrip needed)
        sessionDuration: sessionHours > 0 ? `${sessionHours}h ${sessionMins}m` : `${sessionMins}m`,
        activeTime: `${activeMinutes}m`,
        idleTime: `${idleMinutes}m`,
        tabSwitches: todayTabSwitches,
        idleState: currentIdleState
    }).catch(() => {
        // No listeners, that's fine
    });
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

        // Count tab switches today (excluding extension tabs)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEvents = eventWindow.filter(e =>
            e.type === 'tab_switch' && 
            e.timestamp >= todayStart.getTime() &&
            !e.data?.fromUrl?.startsWith('chrome-extension://') &&
            !e.data?.toUrl?.startsWith('chrome-extension://')
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
        const today = new Date().toISOString().split('T')[0];
        
        // Check if we need to start a new session (new day)
        if (sessionDate !== today) {
            // Store yesterday's summary before starting new session
            const scores = await getScoresSince(24);
            if (scores.length > 0) {
                const avgScore = Math.round(
                    scores.reduce((s, x) => s + x.score, 0) / scores.length
                );
                const minScore = Math.min(...scores.map(s => s.score));
                const maxScore = Math.max(...scores.map(s => s.score));

                await storeDailySummary(sessionDate, {
                    avgScore,
                    minScore,
                    maxScore,
                    totalScores: scores.length,
                    sessionDuration: Date.now() - sessionStartTime
                });
            }
            
            // Start new session for new day
            sessionStartTime = Date.now();
            sessionDate = today;
            currentScore = 100;
            await saveSessionData();
            console.log(`[BurnoutGuard] New day detected. Started fresh session for ${today}`);
        }

        // Purge old events (keep 30 days)
        const deleted = await purgeOldEvents(30);
        console.log(`[BurnoutGuard] Daily cleanup: purged ${deleted} old events`);
    } catch (err) {
        console.error('[BurnoutGuard] Daily cleanup error:', err);
    }
}

// ── Initial Setup ──
openDB().then(async () => {
    console.log('[BurnoutGuard] Service Worker ready.');
    await loadOrCreateSession();
    chrome.idle.setDetectionInterval(60);
    updateBadge(currentScore);
});
