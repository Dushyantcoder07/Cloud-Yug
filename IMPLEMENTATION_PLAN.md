# Implementation Plan: Real-Time Data & Complete Goals Page

## Phase 1: Create Daily Metrics Tracking System

### New Storage Functions (`src/lib/goalsStorage.ts`)
```typescript
- saveDailyMetrics(date, metrics) // Store daily score, activity, etc
- getDailyMetrics(date) // Get specific day's metrics
- getWeeklyMetrics() // Last 7 days
- getRecoveryStreak() // Calculate consecutive days above threshold
- saveGoalProgress(goalType, progress) // Track goal achievements
```

### New Types (`src/types.ts`)
```typescript
interface DailyMetrics {
  date: string;
  focusScore: number;
  activeTime: number; // minutes
  tabSwitches: number;
  interventions: number;
  physiologicalScore: number;
}

interface WeeklyTrend {
  improvement: number; // percentage
  avgSessionTime: number;
  currentWeek: DailyMetrics[];
  previousWeek?: DailyMetrics[];
}

interface RecoveryStreak {
  currentStreak: number; // days
  dailyScores: { date: string; score: number; achieved: boolean }[];
}
```

## Phase 2: Create Goals Calculation Utilities

### New File: `src/lib/goalsCalculations.ts`
```typescript
1. calculateWeeklyTrend(currentWeek, previousWeek)
   - Returns improvement percentage
   - Average session time increase

2. calculateRecoveryStreak(dailyMetrics, threshold = 75)
   - Count consecutive days above threshold
   - Return last 9 days for calendar display

3. calculateDailyProgress(stats, settings)
   - Deep work progress (hours completed / target)
   - Tab switches (current / limit)
   - Attention score (current focus score)

4. generateFocusInsights(stats, dailyMetrics)
   - Analyze peak performance times
   - Identify common distraction patterns
   - Return 2-3 actionable insights
```

## Phase 3: Update GoalsPage with Real Data

### Changes to GoalsPage.tsx

#### 1. Weekly Performance Banner
**Before:** Hardcoded "12%" and "18 minutes"
**After:**
```typescript
const weeklyTrend = calculateWeeklyTrend(weeklyMetrics);
<h2>Stability improved by {weeklyTrend.improvement}% this week</h2>
<p>...increased by an average of {weeklyTrend.avgSessionIncrease} minutes per session.</p>
```

#### 2. Recovery Streak Section
**Before:** Hardcoded "8 days" and M-T-W-T-F-S-S array
**After:**
```typescript
const recoveryStreak = calculateRecoveryStreak(dailyMetrics);
<p>{recoveryStreak.currentStreak} days above 75 score</p>
{recoveryStreak.dailyScores.map((day, i) => (
  <div className={day.achieved ? 'bg-green-500' : 'bg-slate-50'}>
    {day.date.dayOfWeek}
  </div>
))}
```

#### 3. Daily Standing Sidebar
**Before:** Hardcoded "3.2 / 4.0 hrs", "6 / 15 limit", "88 / 100"
**After:**
```typescript
const dailyProgress = calculateDailyProgress(stats, settings);

// Deep Work
<span>{dailyProgress.activeHours} / {settings.daily_focus_target} hrs</span>
<div style={{ width: `${dailyProgress.activePercentage}%` }}></div>
<p>{dailyProgress.remainingMinutes} mins remaining to hit daily goal</p>

// Context Switches
<span>{stats.tab_switches} / {settings.max_tab_switches} limit</span>

// Attention Score
<span>{stats.focus_score} / 100</span>
```

#### 4. Focus Insights
**Before:** Hardcoded "9 AM - 11 AM" and "Email after 4 PM"
**After:**
```typescript
const insights = generateFocusInsights(stats, weeklyMetrics);
{insights.map(insight => (
  <li>{insight.icon} {insight.message}</li>
))}
```

#### 5. Make Goals Interactive
- Add handlers to update settings in real-time
- Show live progress updates
- Add edit buttons for all settings

## Phase 4: Remove Sample Data Initialization

### Changes to App.tsx

**Remove:**
```typescript
// Lines 119-175: Sample activities initialization
// Lines 178-249: Sample events initialization
```

**Replace with:**
```typescript
// Just use empty arrays if no data
setActivities(activitiesData || []);
setEvents(eventsData || []);
```

### Add Empty State UI
- Show helpful message when no activities/events exist
- Guide users to start tracking
- No fake data

## Phase 5: Clean Up Mock Data Fallbacks

### Changes to InsightsPage.tsx

**Remove:**
```typescript
// Line 36-48: Fallback to mock data
```

**Replace with:**
```typescript
const behavioralMetrics = stats?.factors ? {
  tabSwitchScore: stats.factors.tabSwitching?.penalty || 0,
  // ... use real data only
} : null; // Don't show if no data

if (!behavioralMetrics) {
  return <EmptyState message="Start tracking to see insights" />;
}
```

### Changes to HistoryPage.tsx

**Remove:**
```typescript
// Line 58: "+12%" hardcoded badge
// Line 256-258: "Afternoon Slump Detected" hardcoded tip
```

**Replace with:**
```typescript
// Calculate real improvement from daily metrics
const improvement = calculateWeeklyImprovement(weeklyMetrics);
<span>{improvement > 0 ? '+' : ''}{improvement}%</span>

// Generate real-time tip based on actual patterns
const personalizedTip = generateTip(weeklyMetrics, stats);
<h4>{personalizedTip.title}</h4>
<p>{personalizedTip.message}</p>
```

## Phase 6: Add Real-Time Goal Progress Tracking

### New Hook: `src/hooks/useGoalsTracking.ts`
```typescript
export function useGoalsTracking(stats, settings, fatigueMetrics) {
  const [weeklyTrend, setWeeklyTrend] = useState(null);
  const [recoveryStreak, setRecoveryStreak] = useState(null);
  const [dailyProgress, setDailyProgress] = useState(null);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    // Load and calculate all metrics
    loadDailyMetrics().then(metrics => {
      setWeeklyTrend(calculateWeeklyTrend(metrics));
      setRecoveryStreak(calculateRecoveryStreak(metrics));
      setDailyProgress(calculateDailyProgress(stats, settings));
      setInsights(generateFocusInsights(stats, metrics));
    });

    // Save current day's metrics every minute
    const interval = setInterval(() => {
      saveDailyMetrics(getCurrentDayMetrics(stats, fatigueMetrics));
    }, 60000);

    return () => clearInterval(interval);
  }, [stats, settings, fatigueMetrics]);

  return {
    weeklyTrend,
    recoveryStreak,
    dailyProgress,
    insights
  };
}
```

## Files to Create:
1. `src/lib/goalsStorage.ts` - Storage functions for daily metrics
2. `src/lib/goalsCalculations.ts` - Calculation utilities
3. `src/hooks/useGoalsTracking.ts` - React hook for goals data

## Files to Modify:
1. `src/pages/GoalsPage.tsx` - Use real data everywhere
2. `src/pages/HistoryPage.tsx` - Remove hardcoded badges/tips
3. `src/pages/InsightsPage.tsx` - Remove mock fallbacks
4. `src/App.tsx` - Remove sample data initialization
5. `src/types.ts` - Add new interfaces

## Benefits After Implementation:
✅ All data is real-time and personalized
✅ No more fake/hardcoded values
✅ Goals page fully functional with live tracking
✅Weekly trends calculated from actual usage
✅ Recovery streaks based on real daily scores
✅ Focus insights generated from real patterns
✅ Daily progress updates in real-time
✅ Empty states instead of sample data
✅ Better user trust and accuracy

## Testing Checklist:
- [ ] Weekly trend shows real improvement %
- [ ] Recovery streak counts actual consecutive days
- [ ] Daily progress updates live
- [ ] Tab switches from extension show correctly
- [ ] Active time displays actual hours worked
- [ ] Focus score reflects real-time data
- [ ] Physiological goals update with CV tracking
- [ ] Behavioral goals update with extension data
- [ ] Insights change based on actual patterns
- [ ] No hardcoded values visible anywhere
- [ ] Empty states show when No data
- [ ] All progress bars reflect real percentages
