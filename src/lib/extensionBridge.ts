/**
 * Extension Bridge Service
 * Communicates with Chrome extension background script to get behavioral tracking data
 */

import { Stats, BehavioralFactors, Insight } from '../types';

// Check if we're running in extension context
const isExtensionContext = typeof chrome !== 'undefined' && chrome?.runtime?.id;

/**
 * Fetch behavioral tracking data from extension background script
 */
export async function fetchExtensionBehavioralData(): Promise<Partial<Stats> | null> {
    if (!isExtensionContext) {
        console.log('[ExtensionBridge] Not in extension context, no data available');
        return null;
    }

    try {
        // Send message to background script requesting dashboard data
        const response = await chrome.runtime.sendMessage({
            type: 'get_dashboard_data'
        });

        if (response && response.success) {
            const data = response.data;
            
            // Transform extension data to Stats format
            return {
                focus_score: data.currentScore || 100,
                currentScore: data.currentScore || 100,
                active_time: data.activeTime || '0m',
                idle_time: data.idleTime || '0m',
                tab_switches: data.tabSwitches || 0,
                session_duration: data.sessionDuration || '0m',
                score_improvement: data.trend || 0,
                interventions: data.interventions?.length || 0,
                distraction_peak: data.distractionPeak || 'N/A',
                burnout_trend: data.hourlyScores?.map((h: any) => h.avgScore) || [],
                
                // Behavioral factors
                factors: data.factors as BehavioralFactors,
                hourlyScores: data.hourlyScores || [],
                trend: data.trend || 0,
                insights: data.insights as Insight[] || [],
                idleState: data.idleState || 'active',
                
                // Extract specific metrics from factors
                mouseActivity: data.factors?.erraticMouse ? {
                    directionChanges: 0, // Not directly available
                    speed: 0,
                    penalty: data.factors.erraticMouse.penalty
                } : undefined,
                
                scrollActivity: data.factors?.anxiousScroll ? {
                    rapidScrolls: 0,
                    penalty: data.factors.anxiousScroll.penalty
                } : undefined
            };
        }
        
        return null;
    } catch (error) {
        console.error('[ExtensionBridge] Failed to fetch extension data:', error);
        return null;
    }
}

/**
 * Listen for real-time updates from extension.
 * Uses the broadcast payload directly to avoid a second roundtrip.
 * Falls back to polling every 10 seconds.
 */
export function subscribeToExtensionUpdates(callback: (data: Partial<Stats>) => void): () => void {
    if (!isExtensionContext) {
        console.log('[ExtensionBridge] Not in extension context, no updates available');
        // Return no-op cleanup function
        return () => {};
    }

    const messageListener = (message: any) => {
        if (message.type === 'score_update') {
            // Use the broadcast payload directly — no second roundtrip
            const partialStats: Partial<Stats> = {
                focus_score: message.score,
                currentScore: message.score,
                factors: message.factors,
                session_duration: message.sessionDuration,
                active_time: message.activeTime,
                idle_time: message.idleTime,
                tab_switches: message.tabSwitches,
                idleState: message.idleState,
            };
            callback(partialStats);

            // Also do a full refresh in background for complete data (hourly scores, insights, etc.)
            fetchExtensionBehavioralData().then(data => {
                if (data) callback(data);
            });
        } else if (message.type === 'behavioral_update') {
            fetchExtensionBehavioralData().then(data => {
                if (data) callback(data);
            });
        }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Polling fallback: re-fetch every 10 seconds regardless of push events
    const pollInterval = setInterval(() => {
        fetchExtensionBehavioralData().then(data => {
            if (data) callback(data);
        });
    }, 10000);
    
    return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
        clearInterval(pollInterval);
    };
}

/**
 * Get current mouse tracking metrics
 */
export async function getMouseMetrics(): Promise<Stats['mouseActivity'] | null> {
    if (!isExtensionContext) {
        return {
            directionChanges: Math.floor(Math.random() * 30),
            speed: Math.floor(Math.random() * 600),
            penalty: Math.floor(Math.random() * 10)
        };
    }

    try {
        const data = await fetchExtensionBehavioralData();
        return data?.mouseActivity || null;
    } catch (error) {
        console.error('[ExtensionBridge] Failed to get mouse metrics:', error);
        return null;
    }
}

/**
 * Get current typing metrics
 */
export async function getTypingMetrics(): Promise<Stats['typingMetrics'] | null> {
    if (!isExtensionContext) {
        return {
            avgInterval: 150 + Math.random() * 100,
            variance: Math.random() * 300000,
            errorRate: Math.random() * 0.2,
            fatigued: Math.random() > 0.7
        };
    }

    try {
        const data = await fetchExtensionBehavioralData();
        return data?.typingMetrics || null;
    } catch (error) {
        console.error('[ExtensionBridge] Failed to get typing metrics:', error);
        return null;
    }
}

/**
 * Get current scroll activity
 */
export async function getScrollActivity(): Promise<Stats['scrollActivity'] | null> {
    if (!isExtensionContext) {
        return {
            rapidScrolls: Math.floor(Math.random() * 10),
            penalty: Math.floor(Math.random() * 5)
        };
    }

    try {
        const data = await fetchExtensionBehavioralData();
        return data?.scrollActivity || null;
    } catch (error) {
        console.error('[ExtensionBridge] Failed to get scroll activity:', error);
        return null;
    }
}

/**
 * Get real-time screen time breakdown
 */
export async function getScreenTimeBreakdown(): Promise<{
    active: number;
    idle: number;
    total: number;
    activePercent: number;
} | null> {
    const data = await fetchExtensionBehavioralData();
    
    if (!data) return null;
    
    // Parse time strings (format: "123m" or "2h 15m")
    const parseTime = (timeStr: string): number => {
        let minutes = 0;
        const hourMatch = timeStr.match(/(\d+)h/);
        const minMatch = timeStr.match(/(\d+)m/);
        
        if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
        if (minMatch) minutes += parseInt(minMatch[1]);
        
        return minutes;
    };
    
    const activeMinutes = parseTime(data.active_time || '0m');
    const idleMinutes = parseTime(data.idle_time || '0m');
    const total = activeMinutes + idleMinutes;
    
    return {
        active: activeMinutes,
        idle: idleMinutes,
        total,
        activePercent: total > 0 ? Math.round((activeMinutes / total) * 100) : 0
    };
}

/**
 * Request intervention to be triggered
 */
export async function triggerInterventionRequest(reason: string): Promise<boolean> {
    if (!isExtensionContext) {
        console.log('[ExtensionBridge] Mock intervention triggered:', reason);
        return true;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'trigger_intervention',
            reason
        });
        return response?.success || false;
    } catch (error) {
        console.error('[ExtensionBridge] Failed to trigger intervention:', error);
        return false;
    }
}

/**
 * Mock behavioral data for testing when extension is not available
 */
function getMockBehavioralData(): Partial<Stats> {
    const hour = new Date().getHours();
    const randomScore = 60 + Math.floor(Math.random() * 30);
    
    return {
        focus_score: randomScore,
        currentScore: randomScore,
        active_time: `${Math.floor(Math.random() * 120)}m`,
        idle_time: `${Math.floor(Math.random() * 30)}m`,
        tab_switches: Math.floor(Math.random() * 50),
        session_duration: `${Math.floor(Math.random() * 3)}h ${Math.floor(Math.random() * 60)}m`,
        score_improvement: Math.floor(Math.random() * 20) - 5,
        interventions: Math.floor(Math.random() * 5),
        distraction_peak: `${Math.floor(Math.random() * 16) + 8}:00`,
        burnout_trend: Array.from({ length: 7 }, () => 50 + Math.floor(Math.random() * 40)),
        
        factors: {
            tabSwitching: {
                penalty: Math.floor(Math.random() * 25),
                switches: Math.floor(Math.random() * 20),
                maxWeight: 25
            },
            typingFatigue: {
                penalty: Math.floor(Math.random() * 20),
                maxWeight: 20
            },
            idle: {
                penalty: Math.floor(Math.random() * 15),
                state: Math.random() > 0.7 ? 'idle' : 'active',
                maxWeight: 15
            },
            clickAccuracy: {
                penalty: Math.floor(Math.random() * 15),
                maxWeight: 15
            },
            lateNight: {
                penalty: (hour >= 22 || hour <= 5) ? 10 : 0,
                hour,
                maxWeight: 10
            },
            erraticMouse: {
                penalty: Math.floor(Math.random() * 10),
                maxWeight: 10
            },
            anxiousScroll: {
                penalty: Math.floor(Math.random() * 5),
                maxWeight: 5
            }
        },
        
        hourlyScores: Array.from({ length: 12 }, (_, i) => ({
            hour: `${i + 8}:00`,
            avgScore: 50 + Math.floor(Math.random() * 40),
            count: Math.floor(Math.random() * 10) + 1
        })),
        
        trend: Math.floor(Math.random() * 20) - 10,
        idleState: Math.random() > 0.7 ? 'idle' : 'active',
        
        insights: [
            {
                type: 'positive',
                icon: '✅',
                title: 'Great Focus!',
                message: 'Your digital behavior patterns look healthy right now.'
            }
        ],
        
        mouseActivity: {
            directionChanges: Math.floor(Math.random() * 30),
            speed: Math.floor(Math.random() * 600),
            penalty: Math.floor(Math.random() * 10)
        },
        
        scrollActivity: {
            rapidScrolls: Math.floor(Math.random() * 10),
            penalty: Math.floor(Math.random() * 5)
        },
        
        typingMetrics: {
            avgInterval: 150 + Math.random() * 100,
            variance: Math.random() * 300000,
            errorRate: Math.random() * 0.2,
            fatigued: Math.random() > 0.7
        },
        
        clickMetrics: {
            hesitationRate: Math.random() * 0.3,
            fatigued: Math.random() > 0.8
        }
    };
}
