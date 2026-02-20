/**
 * Burnout Guard — Popup Dashboard Script
 * 
 * Fetches live data from the background service worker,
 * renders the score ring, factor breakdown, Chart.js timeline,
 * insights, and intervention history.
 */

let focusChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

    // Quick action buttons
    document.getElementById('btn-breathe').addEventListener('click', () => {
        triggerBreathing();
    });

    document.getElementById('btn-focus').addEventListener('click', () => {
        triggerFocusBlock();
    });

    // Auto-refresh every 30 seconds while popup is open
    setInterval(loadDashboard, 30000);
});


async function loadDashboard() {
    try {
        const data = await sendMessage({ type: 'get_dashboard_data' });
        if (!data) {
            showLoadingError();
            return;
        }

        renderScore(data);
        renderStats(data);
        renderFactors(data.factors);
        renderChart(data.hourlyScores);
        renderInsights(data.insights);
        renderInterventions(data.interventions);
        updateStatus(data.idleState);

        // Show content, hide loading
        document.getElementById('loading-view').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
    } catch (err) {
        console.error('Failed to load dashboard:', err);
        showLoadingError();
    }
}


function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}


// ─── Score Ring ────────────────────────────────────────────────────────────
function renderScore(data) {
    const score = data.currentScore;
    const circumference = 2 * Math.PI * 52; // r = 52
    const offset = circumference - (score / 100) * circumference;

    const ring = document.getElementById('score-ring-fill');
    ring.style.strokeDashoffset = offset;

    // Color based on score
    let color, label, headline, desc;
    if (score >= 70) {
        color = '#22c55e';
        label = 'Healthy';
        headline = 'Focus is stable';
        desc = 'Your digital behavior patterns look healthy. Keep up the great work!';
    } else if (score >= 50) {
        color = '#f59e0b';
        label = 'Moderate';
        headline = 'Focus is wavering';
        desc = 'Some distraction patterns detected. Consider closing unused tabs.';
    } else if (score >= 30) {
        color = '#f97316';
        label = 'At Risk';
        headline = 'Focus is fragmented';
        desc = 'Significant context-switching detected. A short break could help restore clarity.';
    } else {
        color = '#ef4444';
        label = 'Critical';
        headline = 'Burnout risk detected';
        desc = 'Your activity patterns suggest high cognitive strain. Please take a recovery break.';
    }

    ring.style.stroke = color;
    document.getElementById('score-number').textContent = score;
    document.getElementById('score-label').textContent = label;
    document.getElementById('score-headline').textContent = headline;
    document.getElementById('score-description').textContent = desc;

    // Trend
    const trendEl = document.getElementById('score-trend');
    const trendText = document.getElementById('trend-text');
    if (data.trend >= 0) {
        trendEl.className = 'score-trend';
        trendEl.querySelector('.trend-icon').textContent = '↗';
        trendText.textContent = `+${data.trend} from last hour`;
    } else {
        trendEl.className = 'score-trend negative';
        trendEl.querySelector('.trend-icon').textContent = '↘';
        trendText.textContent = `${data.trend} from last hour`;
    }
}


// ─── Stats ────────────────────────────────────────────────────────────────
function renderStats(data) {
    document.getElementById('stat-session').textContent = data.sessionDuration;
    document.getElementById('stat-active').textContent = data.activeTime;
    document.getElementById('stat-idle').textContent = data.idleTime;
    document.getElementById('stat-tabs').textContent = data.tabSwitches;
}


// ─── Factors ──────────────────────────────────────────────────────────────
function renderFactors(factors) {
    const container = document.getElementById('factors-list');
    if (!factors || Object.keys(factors).length === 0) {
        container.innerHTML = '<p class="empty-state">Score factors will appear after a few minutes of tracking.</p>';
        return;
    }

    const factorMeta = {
        tabSwitching: { name: 'Tab Switching', icon: '🔀' },
        idle: { name: 'Idle Time', icon: '💤' },
        lateNight: { name: 'Late Night', icon: '🌙' },
        erraticMouse: { name: 'Mouse Erratic', icon: '🖱️' },
        anxiousScroll: { name: 'Doom Scroll', icon: '📜' },
        irregularity: { name: 'Irregularity', icon: '⏰' }
    };

    container.innerHTML = Object.entries(factors).map(([key, val]) => {
        const meta = factorMeta[key] || { name: key, icon: '📊' };
        const pct = Math.round((val.penalty / val.maxWeight) * 100);
        let severity = 'low';
        if (pct > 75) severity = 'critical';
        else if (pct > 50) severity = 'high';
        else if (pct > 25) severity = 'medium';

        return `
      <div class="factor-item">
        <span class="factor-name">${meta.icon} ${meta.name}</span>
        <div class="factor-bar">
          <div class="factor-fill ${severity}" style="width:${pct}%"></div>
        </div>
        <span class="factor-value">${val.penalty}/${val.maxWeight}</span>
      </div>
    `;
    }).join('');
}


// ─── Chart ────────────────────────────────────────────────────────────────
function renderChart(hourlyScores) {
    const canvas = document.getElementById('focus-chart');
    const ctx = canvas.getContext('2d');

    // Generate placeholder data if no real scores yet
    let labels, dataPoints;
    if (!hourlyScores || hourlyScores.length === 0) {
        // Show empty state with placeholder
        labels = Array.from({ length: 12 }, (_, i) => {
            const h = (new Date().getHours() - 11 + i + 24) % 24;
            return `${h}:00`;
        });
        dataPoints = labels.map(() => null);
        document.getElementById('chart-subtitle').textContent = 'No data yet — tracking will begin shortly';
    } else {
        labels = hourlyScores.map(s => s.hour);
        dataPoints = hourlyScores.map(s => s.avgScore);
        document.getElementById('chart-subtitle').textContent = `Last ${hourlyScores.length} hours`;
    }

    if (focusChart) {
        focusChart.data.labels = labels;
        focusChart.data.datasets[0].data = dataPoints;
        focusChart.update('none');
        return;
    }

    focusChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Focus Score',
                data: dataPoints,
                borderColor: '#2563eb',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(37, 99, 235, 0.1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
                    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
                    return gradient;
                },
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { size: 11, weight: '700' },
                    bodyFont: { size: 12, weight: '600' },
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `Focus: ${ctx.parsed.y ?? '—'}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10, weight: '600' },
                        color: '#94a3b8',
                        maxTicksLimit: 6
                    },
                    border: { display: false }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: '#f1f5f9',
                        drawBorder: false
                    },
                    ticks: {
                        font: { size: 10, weight: '600' },
                        color: '#94a3b8',
                        stepSize: 25,
                        callback: (val) => val + '%'
                    },
                    border: { display: false }
                }
            }
        }
    });
}


// ─── Insights ─────────────────────────────────────────────────────────────
function renderInsights(insights) {
    const container = document.getElementById('insights-list');

    if (!insights || insights.length === 0) {
        container.innerHTML = '<p class="empty-state">No insights yet. Keep using your browser normally!</p>';
        return;
    }

    container.innerHTML = insights.map(i => `
    <div class="insight-item ${i.type}">
      <span class="insight-icon">${i.icon}</span>
      <div class="insight-content">
        <div class="insight-title">${i.title}</div>
        <div class="insight-message">${i.message}</div>
      </div>
    </div>
  `).join('');
}


// ─── Interventions ────────────────────────────────────────────────────────
function renderInterventions(interventions) {
    const container = document.getElementById('interventions-list');

    if (!interventions || interventions.length === 0) {
        container.innerHTML = '<p class="empty-state">No interventions triggered yet. You\'re doing great!</p>';
        return;
    }

    container.innerHTML = interventions.map(i => {
        const time = formatTime(i.timestamp);
        const actionClass = i.action.includes('completed') ? 'completed'
            : i.action.includes('started') ? 'started'
                : 'dismissed';
        const typeEmoji = i.type === 'breathing' ? '🌬️'
            : i.type === 'stretch' ? '🧘'
                : '🩺';

        return `
      <div class="intervention-item">
        <div class="intervention-left">
          <span>${typeEmoji}</span>
          <span class="intervention-type">${capitalize(i.type)}</span>
        </div>
        <span class="intervention-action ${actionClass}">${i.action}</span>
        <span class="intervention-time">${time}</span>
      </div>
    `;
    }).join('');
}


// ─── Status ───────────────────────────────────────────────────────────────
function updateStatus(idleState) {
    const pill = document.getElementById('status-pill');
    const text = document.getElementById('status-text');

    if (idleState === 'idle' || idleState === 'locked') {
        pill.classList.add('idle');
        text.textContent = idleState === 'locked' ? 'Locked' : 'Idle';
    } else {
        pill.classList.remove('idle');
        text.textContent = 'Monitoring';
    }
}


// ─── Quick Actions ────────────────────────────────────────────────────────
async function triggerBreathing() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'show_intervention',
                score: parseInt(document.getElementById('score-number').textContent) || 50,
                isUrgent: false,
                timestamp: Date.now()
            });
            // Close popup so user can see the intervention
            window.close();
        }
    } catch (err) {
        console.error('Failed to trigger breathing:', err);
    }
}

async function triggerFocusBlock() {
    // For now, just send a message and close
    try {
        chrome.runtime.sendMessage({
            type: 'intervention_response',
            interventionType: 'focus_block',
            score: parseInt(document.getElementById('score-number').textContent) || 50,
            action: 'started'
        });
        // Visual feedback
        const btn = document.getElementById('btn-focus');
        btn.textContent = '✅ Focus Block Active';
        btn.style.background = '#f0fdf4';
        btn.style.color = '#16a34a';
        btn.style.borderColor = '#bbf7d0';
        setTimeout(() => window.close(), 1500);
    } catch (err) {
        console.error('Failed to start focus block:', err);
    }
}


// ─── Error State ──────────────────────────────────────────────────────────
function showLoadingError() {
    const loading = document.getElementById('loading-view');
    loading.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <p style="font-size:32px; margin-bottom:12px;">⚠️</p>
      <p style="font-weight:700; margin-bottom:8px;">Connection Error</p>
      <p style="color:#94a3b8; font-size:12px;">Could not reach the background service. Try reloading the extension.</p>
      <button onclick="loadDashboard()" style="
        margin-top:16px; padding:10px 24px; border-radius:12px;
        background:#2563eb; color:white; border:none; font-weight:700;
        cursor:pointer; font-size:13px;
      ">Retry</button>
    </div>
  `;
}


// ─── Utilities ────────────────────────────────────────────────────────────
function formatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
