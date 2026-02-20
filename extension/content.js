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
    setInterval(() => {
        if (mouseMoveCount > 0) {
            const avgSpeed = speedSamples > 0 ? totalSpeed / speedSamples : 0;
            try {
                chrome.runtime.sendMessage({
                    type: 'mouse_activity',
                    count: mouseMoveCount,
                    speed: Math.round(avgSpeed),
                    directionChanges: directionChanges,
                    timestamp: Date.now()
                });
            } catch (e) { /* extension context invalidated */ }

            mouseMoveCount = 0;
            directionChanges = 0;
            totalSpeed = 0;
            speedSamples = 0;
        }
    }, MOUSE_REPORT_INTERVAL);


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

    setInterval(() => {
        if (scrollCount > 0) {
            try {
                chrome.runtime.sendMessage({
                    type: 'scroll_activity',
                    count: scrollCount,
                    rapidScrolls: rapidScrolls,
                    timestamp: Date.now()
                });
            } catch (e) { /* extension context invalidated */ }

            scrollCount = 0;
            rapidScrolls = 0;
        }
    }, SCROLL_REPORT_INTERVAL);


    // ─── Keystroke Tracking (lightweight — count only) ──────────────────────
    let keystrokeCount = 0;
    const KEY_REPORT_INTERVAL = 5000;

    document.addEventListener('keydown', () => {
        keystrokeCount++;
    });

    setInterval(() => {
        if (keystrokeCount > 0) {
            try {
                chrome.runtime.sendMessage({
                    type: 'keystroke_activity',
                    count: keystrokeCount,
                    timestamp: Date.now()
                });
            } catch (e) { /* extension context invalidated */ }
            keystrokeCount = 0;
        }
    }, KEY_REPORT_INTERVAL);


    // ─── Intervention System ────────────────────────────────────────────────
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'show_intervention') {
            showIntervention(message.score, message.isUrgent);
        }
    });

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
        #burnout-guard-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: burnout-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes burnout-slide-in {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes burnout-slide-out {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
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
