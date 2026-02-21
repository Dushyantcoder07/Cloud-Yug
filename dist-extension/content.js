/**
 * Burnout Guard — Content Script
 * 
 * Injected into every webpage. Responsibilities:
 * 1. Track mouse movement (throttled) — speed, direction changes
 * 2. Track scroll behavior (throttled) — detect doom scrolling
 * 3. Track keystroke cadence (very lightweight)
 * 4. Display intervention overlays when triggered by background
 * 5. Breathing exercise / stretch timer UI
 */

(() => {
    // ─── Guard: prevent double injection ─────────────────────────────────────
    if (window.__burnoutGuardInjected) return;
    window.__burnoutGuardInjected = true;

    // ─── Version Check ─────────────────────────────────────────────────────────
    const SCRIPT_VERSION = '1.0.1'; // Increment this when updating
    console.log(`[BurnoutGuard] Content script v${SCRIPT_VERSION} loaded`);

    // ─── Extension Context Management ────────────────────────────────────────
    let isExtensionValid = true;
    const intervals = [];
    let contextLostLogged = false; // Prevent spam in console

    // Check if extension context is still valid
    function checkExtensionContext() {
        try {
            if (!chrome.runtime?.id) {
                isExtensionValid = false;
                cleanup();
                return false;
            }
            return true;
        } catch (e) {
            isExtensionValid = false;
            cleanup();
            return false;
        }
    }

    // Safe message sending
    function safeSendMessage(message) {
        if (!isExtensionValid || !checkExtensionContext()) {
            return;
        }
        
        try {
            chrome.runtime.sendMessage(message);
        } catch (e) {
            if (!contextLostLogged) {
                console.log('[BurnoutGuard] Extension reloaded. Please refresh this page to reconnect.');
                contextLostLogged = true;
            }
            isExtensionValid = false;
            cleanup();
        }
    }

    // Cleanup all intervals when extension context is lost
    function cleanup() {
        intervals.forEach(id => clearInterval(id));
        intervals.length = 0;
        if (!contextLostLogged) {
            console.log('[BurnoutGuard] Content script stopped tracking');
            contextLostLogged = true;
        }
    }

    // ─── Mouse Tracking ─────────────────────────────────────────────────────
    let mouseMoveCount = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastMouseTime = Date.now();
    let directionChanges = 0;
    let lastDx = 0;
    let lastDy = 0;
    let totalSpeed = 0;
    let speedSamples = 0;

    const MOUSE_REPORT_INTERVAL = 2000; // report every 2 seconds

    document.addEventListener('mousemove', (e) => {
        mouseMoveCount++;
        const now = Date.now();
        const dt = now - lastMouseTime;

        if (dt > 50) { // sample every 50ms
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = dist / (dt / 1000); // pixels per second

            totalSpeed += speed;
            speedSamples++;

            // Detect direction changes (sign flip)
            if ((dx > 0 && lastDx < 0) || (dx < 0 && lastDx > 0) ||
                (dy > 0 && lastDy < 0) || (dy < 0 && lastDy > 0)) {
                directionChanges++;
            }

            lastDx = dx;
            lastDy = dy;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            lastMouseTime = now;
        }
    });

    // Report mouse data periodically
    intervals.push(setInterval(() => {
        if (mouseMoveCount > 0) {
            const avgSpeed = speedSamples > 0 ? totalSpeed / speedSamples : 0;
            safeSendMessage({
                type: 'mouse_activity',
                count: mouseMoveCount,
                speed: Math.round(avgSpeed),
                directionChanges: directionChanges,
                timestamp: Date.now()
            });

            mouseMoveCount = 0;
            directionChanges = 0;
            totalSpeed = 0;
            speedSamples = 0;
        }
    }, MOUSE_REPORT_INTERVAL));


    // ─── Scroll Tracking ────────────────────────────────────────────────────
    let scrollCount = 0;
    let rapidScrolls = 0;
    let lastScrollTime = 0;

    const SCROLL_REPORT_INTERVAL = 3000;
    const RAPID_SCROLL_THRESHOLD = 200; // ms between scrolls = rapid

    window.addEventListener('scroll', () => {
        scrollCount++;
        const now = Date.now();
        if (lastScrollTime > 0 && (now - lastScrollTime) < RAPID_SCROLL_THRESHOLD) {
            rapidScrolls++;
        }
        lastScrollTime = now;
    }, { passive: true });

    intervals.push(setInterval(() => {
        if (scrollCount > 0) {
            safeSendMessage({
                type: 'scroll_activity',
                count: scrollCount,
                rapidScrolls: rapidScrolls,
                timestamp: Date.now()
            });

            scrollCount = 0;
            rapidScrolls = 0;
        }
    }, SCROLL_REPORT_INTERVAL));


    // ─── Keystroke Tracking (lightweight — count only) ──────────────────────
    let keystrokeCount = 0;
    let keystrokeTimes = [];
    let backspaceCount = 0;
    const KEY_REPORT_INTERVAL = 5000;
    const TYPING_ANALYSIS_THRESHOLD = 20; // Analyze after 20 keystrokes

    document.addEventListener('keydown', (e) => {
        const now = Date.now();
        keystrokeCount++;
        keystrokeTimes.push(now);
        
        if (e.key === 'Backspace') {
            backspaceCount++;
        }
        
        // Keep only recent keystrokes for analysis
        keystrokeTimes = keystrokeTimes.filter(t => now - t < 60000);
        
        // Analyze typing cadence when we have enough data
        if (keystrokeTimes.length >= TYPING_ANALYSIS_THRESHOLD) {
            analyzeTypingPattern();
        }
    });

    function analyzeTypingPattern() {
        if (keystrokeTimes.length < 2) return;
        
        // Calculate inter-keystroke intervals
        const intervals = [];
        for (let i = 1; i < keystrokeTimes.length; i++) {
            intervals.push(keystrokeTimes[i] - keystrokeTimes[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // Calculate variance (measure of consistency)
        const variance = intervals.reduce((sum, val) => 
            sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
        
        const stdDev = Math.sqrt(variance);
        const errorRate = backspaceCount / Math.max(keystrokeCount, 1);
        
        // High variance + high error rate = typing fatigue
        // Normal variance: ~100-300ms, Fatigued: >500ms
        const isFatigued = variance > 250000 && errorRate > 0.15;
        
        safeSendMessage({
            type: 'typing_metrics',
            avgInterval: Math.round(avgInterval),
            variance: Math.round(variance),
            stdDev: Math.round(stdDev),
            errorRate: errorRate.toFixed(3),
            totalKeystrokes: keystrokeCount,
            backspaces: backspaceCount,
            fatigued: isFatigued,
            timestamp: Date.now()
        });
    }

    intervals.push(setInterval(() => {
        if (keystrokeCount > 0) {
            safeSendMessage({
                type: 'keystroke_activity',
                count: keystrokeCount,
                timestamp: Date.now()
            });
            keystrokeCount = 0;
        }
    }, KEY_REPORT_INTERVAL));


    // ─── Click Accuracy Tracking ─────────────────────────────────────────────
    let clickPositions = [];
    let totalClicks = 0;
    let hesitationClicks = 0;
    const CLICK_REPORT_INTERVAL = 5000;
    const HESITATION_DISTANCE = 50; // pixels
    const HESITATION_TIME = 2000; // ms

    document.addEventListener('click', (e) => {
        const now = Date.now();
        totalClicks++;
        
        clickPositions.push({ 
            x: e.clientX, 
            y: e.clientY, 
            time: now,
            target: e.target.tagName
        });
        
        // Keep only recent clicks
        clickPositions = clickPositions.filter(c => now - c.time < HESITATION_TIME * 2);
        
        // Detect hesitation clicks (multiple clicks in small area within short time)
        analyzeClickAccuracy(now);
    });

    function analyzeClickAccuracy(now) {
        const recentClicks = clickPositions.filter(c => now - c.time < HESITATION_TIME);
        
        if (recentClicks.length >= 2) {
            // Calculate distances between consecutive clicks
            for (let i = 1; i < recentClicks.length; i++) {
                const dist = Math.sqrt(
                    Math.pow(recentClicks[i].x - recentClicks[i - 1].x, 2) +
                    Math.pow(recentClicks[i].y - recentClicks[i - 1].y, 2)
                );
                
                // Clicks within small area = hesitation/mis-click
                if (dist < HESITATION_DISTANCE) {
                    hesitationClicks++;
                }
            }
        }
    }

    intervals.push(setInterval(() => {
        if (totalClicks > 0) {
            const hesitationRate = hesitationClicks / totalClicks;
            const isFatigued = hesitationRate > 0.2; // >20% hesitation = fatigue
            
            safeSendMessage({
                type: 'click_accuracy',
                totalClicks,
                hesitationClicks,
                hesitationRate: hesitationRate.toFixed(3),
                fatigued: isFatigued,
                timestamp: Date.now()
            });
            
            totalClicks = 0;
            hesitationClicks = 0;
        }
    }, CLICK_REPORT_INTERVAL));


    // ─── Intervention System ────────────────────────────────────────────────
    // Safe listener setup
    if (checkExtensionContext()) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!isExtensionValid) return;
            if (message.type === 'show_intervention') {
                showIntervention(message.score, message.isUrgent);
            }
            if (message.type === 'show_behavior_alert') {
                showBehaviorAlert(message.alert);
            }
        });
    }

    // Listen for wellness CTA events dispatched by the executeScript-injected overlay
    window.addEventListener('burnout-guard-wellness', (e) => {
        const alertData = e.detail;
        const isUrgent = alertData?.severity === 'danger';
        showIntervention(null, isUrgent);
        setTimeout(() => {
            if (alertData?.wellnessType === 'stretch') {
                document.getElementById('burnout-stretch-btn')?.click();
            } else {
                document.getElementById('burnout-breathe-btn')?.click();
            }
        }, 150);
    });

    // ─── Behavior Alert Overlay (centered, modern) ───────────────────────────
    const SEVERITY_COLORS = {
        info:    { bar: '#3b82f6', badge: '#eff6ff', badgeText: '#1d4ed8', badgeLabel: 'Heads Up',      icon: 'ℹ️' },
        warning: { bar: '#f59e0b', badge: '#fffbeb', badgeText: '#b45309', badgeLabel: 'Warning',       icon: '⚠️' },
        danger:  { bar: '#ef4444', badge: '#fef2f2', badgeText: '#b91c1c', badgeLabel: 'Action Needed', icon: '🔴' },
    };

    const WELLNESS_EMOJIS = { breathing: '🌬️', stretch: '🧘', eyeRest: '👁️', break: '☕' };

    function showBehaviorAlert(alert) {
        // Remove any existing behavior alert
        const existing = document.getElementById('bg-behavior-alert-overlay');
        if (existing) existing.remove();

        const cfg = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info;
        const wellnessEmoji = WELLNESS_EMOJIS[alert.wellnessType] || '🌬️';

        const overlay = document.createElement('div');
        overlay.id = 'bg-behavior-alert-overlay';

        overlay.innerHTML = `
      <style>
        #bg-behavior-alert-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: bg-fade-in 0.25s ease;
        }
        @keyframes bg-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bg-card-in {
          from { opacity: 0; transform: scale(0.9) translateY(16px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        @keyframes bg-card-out {
          from { opacity: 1; transform: scale(1)   translateY(0); }
          to   { opacity: 0; transform: scale(0.9) translateY(16px); }
        }
        #bg-alert-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          cursor: pointer;
        }
        #bg-alert-card {
          position: relative;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          animation: bg-card-in 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #bg-alert-bar {
          height: 5px;
          width: 100%;
          background: ${cfg.bar};
        }
        #bg-alert-body {
          padding: 28px 28px 24px;
        }
        #bg-alert-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        #bg-alert-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          background: ${cfg.badge};
          color: ${cfg.badgeText};
        }
        #bg-alert-close {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: background 0.15s;
        }
        #bg-alert-close:hover { background: #e2e8f0; }
        #bg-alert-main {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }
        #bg-alert-icon-wrap {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: ${cfg.badge};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        #bg-alert-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
          line-height: 1.3;
        }
        #bg-alert-message {
          font-size: 13px;
          color: #475569;
          margin: 0;
          line-height: 1.55;
        }
        #bg-alert-suggestion {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 14px;
          margin: 0 0 20px 64px;
          font-size: 12px;
          color: #475569;
          line-height: 1.5;
        }
        #bg-alert-suggestion strong { color: #334155; }
        #bg-alert-actions {
          display: flex;
          gap: 10px;
          margin-left: 64px;
        }
        .bg-alert-btn {
          flex: 1;
          padding: 12px 20px;
          border-radius: 14px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s;
        }
        #bg-alert-cta {
          background: ${cfg.bar};
          color: white;
          box-shadow: 0 4px 12px ${cfg.bar}44;
        }
        #bg-alert-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
        #bg-alert-skip {
          background: #f1f5f9;
          color: #64748b;
        }
        #bg-alert-skip:hover { background: #e2e8f0; color: #334155; }
      </style>

      <div id="bg-alert-backdrop"></div>
      <div id="bg-alert-card">
        <div id="bg-alert-bar"></div>
        <div id="bg-alert-body">
          <div id="bg-alert-header">
            <div id="bg-alert-badge">${cfg.icon} ${cfg.badgeLabel}</div>
            <button id="bg-alert-close">✕</button>
          </div>
          <div id="bg-alert-main">
            <div id="bg-alert-icon-wrap">${cfg.icon}</div>
            <div>
              <p id="bg-alert-title">${alert.title}</p>
              <p id="bg-alert-message">${alert.message}</p>
            </div>
          </div>
          <div id="bg-alert-suggestion"><strong>💡 Suggestion: </strong>${alert.suggestion}</div>
          <div id="bg-alert-actions">
            <button class="bg-alert-btn" id="bg-alert-cta">${wellnessEmoji} ${alert.ctaLabel}</button>
            <button class="bg-alert-btn" id="bg-alert-skip">Later</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        function dismissBehaviorAlert() {
            const card = document.getElementById('bg-alert-card');
            if (card) {
                card.style.animation = 'bg-card-out 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            }
            overlay.style.animation = 'none';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.25s';
            setTimeout(() => overlay.remove(), 280);
        }

        document.getElementById('bg-alert-backdrop').addEventListener('click', dismissBehaviorAlert);
        document.getElementById('bg-alert-close').addEventListener('click', dismissBehaviorAlert);
        document.getElementById('bg-alert-skip').addEventListener('click', dismissBehaviorAlert);

        document.getElementById('bg-alert-cta').addEventListener('click', () => {
            dismissBehaviorAlert();
            // After the alert dismisses, launch the appropriate wellness exercise
            setTimeout(() => {
                const isUrgent = alert.severity === 'danger';
                showIntervention(null, isUrgent);
                // Auto-click the right action button after card renders
                setTimeout(() => {
                    if (alert.wellnessType === 'stretch') {
                        document.getElementById('burnout-stretch-btn')?.click();
                    } else {
                        // Default to breathing for breathing/break/eyeRest
                        document.getElementById('burnout-breathe-btn')?.click();
                    }
                }, 150);
            }, 300);
        });

        // Auto-dismiss after 45 seconds
        setTimeout(() => {
            const el = document.getElementById('bg-behavior-alert-overlay');
            if (el) dismissBehaviorAlert();
        }, 45000);
    }

    function showIntervention(score, isUrgent) {
        // Remove existing intervention if present
        const existing = document.getElementById('burnout-guard-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'burnout-guard-overlay';

        const urgencyColor = isUrgent ? '#ef4444' : '#f59e0b';
        const urgencyBg = isUrgent ? '#fef2f2' : '#fffbeb';
        const urgencyLabel = isUrgent ? 'Burnout Alert' : 'Focus Slipping';
        const emoji = isUrgent ? '🔴' : '🧠';

        overlay.innerHTML = `
      <style>
        #burnout-guard-overlay-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          z-index: 2147483646;
        }
        #burnout-guard-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: burnout-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes burnout-slide-in {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 20px)) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes burnout-slide-out {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 20px)) scale(0.95);
          }
        }

        @keyframes burnout-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes burnout-breathe-circle {
          0% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.6); opacity: 0.4; }
        }

        #burnout-guard-card {
          background: white;
          border-radius: 20px;
          box-shadow:
            0 20px 60px rgba(0,0,0,0.15),
            0 4px 16px rgba(0,0,0,0.08),
            0 0 0 1px rgba(0,0,0,0.04);
          padding: 24px;
          max-width: 340px;
          width: 340px;
          backdrop-filter: blur(20px);
          overflow: hidden;
        }

        .burnout-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .burnout-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .burnout-close {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }

        .burnout-close:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .burnout-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
          line-height: 1.3;
        }

        .burnout-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 20px;
          line-height: 1.5;
        }

        .burnout-score-bar {
          height: 6px;
          background: #f1f5f9;
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .burnout-score-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.6s ease;
        }

        .burnout-actions {
          display: flex;
          gap: 10px;
        }

        .burnout-btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .burnout-btn-primary {
          background: #2563eb;
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .burnout-btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }

        .burnout-btn-secondary {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .burnout-btn-secondary:hover {
          background: #f1f5f9;
          color: #334155;
        }

        /* Breathing exercise styles */
        .burnout-breathing {
          text-align: center;
          padding: 8px 0;
        }

        .burnout-breathing-circle-container {
          width: 120px;
          height: 120px;
          margin: 0 auto 20px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .burnout-breathing-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          animation: burnout-breathe-circle 8s ease-in-out infinite;
        }

        .burnout-breathing-phase {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .burnout-breathing-timer {
          font-size: 28px;
          font-weight: 900;
          color: #3b82f6;
          margin: 0 0 4px;
          font-variant-numeric: tabular-nums;
        }

        .burnout-breathing-progress {
          height: 4px;
          background: #f1f5f9;
          border-radius: 100px;
          margin: 16px 0;
          overflow: hidden;
        }

        .burnout-breathing-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 100px;
          transition: width 1s linear;
        }

        .burnout-complete {
          text-align: center;
          padding: 16px 0;
        }

        .burnout-complete-emoji {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .burnout-complete-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .burnout-complete-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }
      </style>

      <div id="burnout-guard-overlay-backdrop"></div>
      <div id="burnout-guard-container">
        <div id="burnout-guard-card">
          <div class="burnout-header">
            <span class="burnout-badge" style="background:${urgencyBg}; color:${urgencyColor};">
              ${emoji} ${urgencyLabel}
            </span>
            <button class="burnout-close" id="burnout-close-btn">✕</button>
          </div>

          <div id="burnout-content-area">
            <h3 class="burnout-title">Your focus score is ${score}</h3>
            <p class="burnout-subtitle">
              ${isUrgent
                ? 'Your digital activity suggests high cognitive strain. A recovery break is strongly recommended.'
                : 'Mild focus fragmentation detected. A quick breathing exercise can help you regain flow.'}
            </p>

            <div class="burnout-score-bar">
              <div class="burnout-score-fill" style="width:${score}%; background:${urgencyColor};"></div>
            </div>

            <div class="burnout-actions">
              <button class="burnout-btn burnout-btn-primary" id="burnout-breathe-btn">
                🌬️ Breathe
              </button>
              <button class="burnout-btn burnout-btn-secondary" id="burnout-stretch-btn">
                🧘 Stretch
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        // ── Event Handlers ──
        document.getElementById('burnout-guard-overlay-backdrop').addEventListener('click', () => {
            dismissIntervention(overlay, score, 'backdrop_dismissed');
        });

        document.getElementById('burnout-close-btn').addEventListener('click', () => {
            dismissIntervention(overlay, score, 'dismissed');
        });

        document.getElementById('burnout-breathe-btn').addEventListener('click', () => {
            startBreathingExercise(score);
        });

        document.getElementById('burnout-stretch-btn').addEventListener('click', () => {
            startStretchTimer(score);
        });

        // Auto-dismiss after 60 seconds if no interaction
        setTimeout(() => {
            const el = document.getElementById('burnout-guard-overlay');
            if (el) dismissIntervention(el, score, 'auto_dismissed');
        }, 60000);
    }

    function dismissIntervention(overlay, score, action) {
        const container = overlay.querySelector('#burnout-guard-container');
        if (container) {
            container.style.animation = 'burnout-slide-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => overlay.remove(), 300);
        } else {
            overlay.remove();
        }

        try {
            chrome.runtime.sendMessage({
                type: 'intervention_response',
                interventionType: 'notification',
                score,
                action
            });
        } catch (e) { /* context invalidated */ }
    }


    // ─── Breathing Exercise ────────────────────────────────────────────────
    function startBreathingExercise(score) {
        const contentArea = document.getElementById('burnout-content-area');
        if (!contentArea) return;

        const TOTAL_DURATION = 32; // 4 cycles of 8 seconds
        const PHASE_DURATION = 4; // 4 seconds per phase
        const phases = ['Breathe In', 'Hold', 'Breathe Out', 'Hold'];
        let elapsed = 0;
        let phaseIndex = 0;
        let phaseElapsed = 0;

        contentArea.innerHTML = `
      <div class="burnout-breathing">
        <div class="burnout-breathing-circle-container">
          <div class="burnout-breathing-circle"></div>
        </div>
        <p class="burnout-breathing-phase" id="breath-phase">Breathe In</p>
        <p class="burnout-breathing-timer" id="breath-time">${TOTAL_DURATION}s</p>
        <div class="burnout-breathing-progress">
          <div class="burnout-breathing-progress-fill" id="breath-progress" style="width:0%"></div>
        </div>
        <button class="burnout-btn burnout-btn-secondary" id="breath-stop" style="margin-top:8px;">
          Stop Early
        </button>
      </div>
    `;

        const phaseEl = document.getElementById('breath-phase');
        const timeEl = document.getElementById('breath-time');
        const progressEl = document.getElementById('breath-progress');
        const circle = contentArea.querySelector('.burnout-breathing-circle');

        // Adjust circle animation speed for each phase
        function updateCircleAnimation() {
            const currentPhase = phases[phaseIndex];
            if (currentPhase === 'Breathe In') {
                circle.style.animation = `burnout-breathe-circle ${PHASE_DURATION * 2}s ease-in-out infinite`;
            } else if (currentPhase === 'Hold') {
                circle.style.animation = 'none';
                circle.style.transform = phaseIndex === 1 ? 'scale(1)' : 'scale(0.6)';
                circle.style.opacity = phaseIndex === 1 ? '1' : '0.4';
            } else {
                circle.style.animation = `burnout-breathe-circle ${PHASE_DURATION * 2}s ease-in-out infinite reverse`;
            }
        }

        updateCircleAnimation();

        const timer = setInterval(() => {
            elapsed++;
            phaseElapsed++;

            if (phaseElapsed >= PHASE_DURATION) {
                phaseElapsed = 0;
                phaseIndex = (phaseIndex + 1) % phases.length;
                if (phaseEl) phaseEl.textContent = phases[phaseIndex];
                updateCircleAnimation();
            }

            const remaining = TOTAL_DURATION - elapsed;
            if (timeEl) timeEl.textContent = `${remaining}s`;
            if (progressEl) progressEl.style.width = `${(elapsed / TOTAL_DURATION) * 100}%`;

            if (elapsed >= TOTAL_DURATION) {
                clearInterval(timer);
                showComplete('breathing', score);
            }
        }, 1000);

        document.getElementById('breath-stop')?.addEventListener('click', () => {
            clearInterval(timer);
            showComplete('breathing_partial', score);
        });

        try {
            chrome.runtime.sendMessage({
                type: 'intervention_response',
                interventionType: 'breathing',
                score,
                action: 'started'
            });
        } catch (e) { /* context invalidated */ }
    }


    // ─── Stretch Timer ─────────────────────────────────────────────────────
    function startStretchTimer(score) {
        const contentArea = document.getElementById('burnout-content-area');
        if (!contentArea) return;

        const stretches = [
            { name: 'Neck Roll', desc: 'Slowly roll your head in a circle, 3 times each way.', duration: 15 },
            { name: 'Shoulder Shrug', desc: 'Raise shoulders to ears, hold 3s, release. Repeat 5 times.', duration: 20 },
            { name: 'Wrist Stretch', desc: 'Extend arm, pull fingers back gently. 10s each hand.', duration: 20 },
            { name: 'Stand & Stretch', desc: 'Stand up, reach for the ceiling, then touch your toes.', duration: 15 }
        ];

        let currentStretch = 0;
        let elapsed = 0;

        function renderStretch() {
            const stretch = stretches[currentStretch];
            const totalDuration = stretches.reduce((s, x) => s + x.duration, 0);
            const completedDuration = stretches.slice(0, currentStretch).reduce((s, x) => s + x.duration, 0);

            contentArea.innerHTML = `
        <div class="burnout-breathing">
          <p style="font-size:32px; margin:0 0 8px;">${['🧘', '💪', '🤚', '🧍'][currentStretch]}</p>
          <p class="burnout-breathing-phase">${stretch.name}</p>
          <p class="burnout-subtitle" style="margin:4px 0 16px;">${stretch.desc}</p>
          <p class="burnout-breathing-timer" id="stretch-time">${stretch.duration}s</p>
          <div class="burnout-breathing-progress">
            <div class="burnout-breathing-progress-fill" id="stretch-progress" 
                 style="width:${(completedDuration / totalDuration) * 100}%"></div>
          </div>
          <p style="font-size:11px; color:#94a3b8; margin:4px 0 0;">
            Step ${currentStretch + 1} of ${stretches.length}
          </p>
        </div>
      `;
        }

        renderStretch();

        const timer = setInterval(() => {
            elapsed++;
            const stretch = stretches[currentStretch];
            const remaining = stretch.duration - elapsed;

            const timeEl = document.getElementById('stretch-time');
            if (timeEl) timeEl.textContent = `${Math.max(0, remaining)}s`;

            const totalDuration = stretches.reduce((s, x) => s + x.duration, 0);
            const completedDuration = stretches.slice(0, currentStretch).reduce((s, x) => s + x.duration, 0) + elapsed;
            const progressEl = document.getElementById('stretch-progress');
            if (progressEl) progressEl.style.width = `${(completedDuration / totalDuration) * 100}%`;

            if (elapsed >= stretch.duration) {
                currentStretch++;
                elapsed = 0;
                if (currentStretch >= stretches.length) {
                    clearInterval(timer);
                    showComplete('stretch', score);
                } else {
                    renderStretch();
                }
            }
        }, 1000);

        try {
            chrome.runtime.sendMessage({
                type: 'intervention_response',
                interventionType: 'stretch',
                score,
                action: 'started'
            });
        } catch (e) { /* context invalidated */ }
    }


    // ─── Completion Screen ─────────────────────────────────────────────────
    function showComplete(type, score) {
        const contentArea = document.getElementById('burnout-content-area');
        if (!contentArea) return;

        const messages = {
            breathing: { emoji: '🌟', title: 'Breathing Complete!', sub: 'Your focus score should improve within a few minutes.' },
            breathing_partial: { emoji: '👍', title: 'Good Start!', sub: 'Even a partial session helps reduce cognitive strain.' },
            stretch: { emoji: '💪', title: 'Stretch Complete!', sub: 'Your body and mind are now refreshed and ready to focus.' }
        };

        const msg = messages[type] || messages.breathing;

        contentArea.innerHTML = `
      <div class="burnout-complete">
        <p class="burnout-complete-emoji">${msg.emoji}</p>
        <h3 class="burnout-complete-title">${msg.title}</h3>
        <p class="burnout-complete-subtitle">${msg.sub}</p>
        <button class="burnout-btn burnout-btn-primary" id="burnout-done-btn" style="margin-top:16px; width:100%;">
          ✅ Done — Back to Work
        </button>
      </div>
    `;

        document.getElementById('burnout-done-btn')?.addEventListener('click', () => {
            const overlay = document.getElementById('burnout-guard-overlay');
            if (overlay) dismissIntervention(overlay, score, `${type}_completed`);
        });

        try {
            chrome.runtime.sendMessage({
                type: 'intervention_response',
                interventionType: type,
                score,
                action: 'completed'
            });
        } catch (e) { /* context invalidated */ }
    }

})();
