# Performance Trends & Insights Dashboard - Testing Guide

## Overview
This dashboard provides comprehensive insights into user performance trends, category-specific improvements, and areas needing attention.

## Features Implemented

### 1. API Endpoint
**Endpoint:** `GET /api/reports/performance-trends?timeframe={7d|30d|90d|all}`

**Response Structure:**
```json
{
  "scoresTrend": [
    { "date": "2024-01-15", "score": 75, "sessions": 2 }
  ],
  "categoryPerformance": [
    { "category": "Empathy & Rapport", "key": "empathyRapport", "average": 82, "count": 15 }
  ],
  "improvingCategories": [
    {
      "category": "Closing",
      "key": "closing",
      "previousAverage": 65,
      "currentAverage": 80,
      "change": 15,
      "percentChange": 23
    }
  ],
  "needsWorkCategories": [
    {
      "category": "Product Knowledge",
      "key": "productKnowledge",
      "previousAverage": 85,
      "currentAverage": 72,
      "change": -13,
      "percentChange": -15
    }
  ],
  "teamAverage": 76,
  "userAverage": 78,
  "totalSessions": 30,
  "timeframe": "30d"
}
```

### 2. Dashboard Components

#### A. Time Period Filters
- 7 Days
- 30 Days
- 90 Days
- All Time

#### B. Summary Stats
- Total Sessions (in selected timeframe)
- Your Average Score (with trend indicator)
- Team Average (with comparison to your average)

#### C. Score Trends Chart
- Line chart showing score progression over time
- Daily aggregated scores
- Hover tooltips with detailed date and score info
- Responsive design

#### D. Category Performance Chart
- Bar chart showing average scores by category
- Categories include:
  - Empathy & Rapport
  - Problem Resolution
  - Product Knowledge
  - Professionalism
  - Closing
  - Objection Handling
  - Active Listening
  - Communication

#### E. Getting Better At Cards
- Shows top 3 improving categories
- Displays:
  - Category name
  - Previous average → Current average
  - Absolute change (+X%)
  - Percent improvement
- Green positive indicators

#### F. Needs Work Cards
- Shows top 3 categories needing improvement
- Displays:
  - Category name
  - Current score
  - Decline percentage (if applicable)
  - Warning indicators for low scores (<70%)
- Yellow/red warning indicators

#### G. Empty State
- Shows when no training sessions exist
- Call-to-action button to start training
- Friendly messaging

## Testing Checklist

### Manual Testing

#### 1. Data Seeding
- [ ] Run the test SQL script to create 30 sessions with trending data
- [ ] Verify sessions are created with proper dates spanning 30 days
- [ ] Check that category scores show clear trends (improving, declining, stable)

```sql
-- Run test-performance-trends.sql in Supabase SQL Editor
-- This creates 30 sessions with:
-- - Improving: Empathy & Rapport (60% → 85%)
-- - Improving: Closing (55% → 80%)
-- - Declining: Product Knowledge (85% → 70%)
-- - Declining: Professionalism (80% → 75%)
-- - Stable: Problem Resolution (~75%)
```

#### 2. API Testing
Test the API endpoint directly:

```bash
# Replace with your auth token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/performance-trends?timeframe=30d"
```

Expected behaviors:
- [ ] Returns 200 status code with valid auth
- [ ] Returns 401 without auth
- [ ] Handles timeframe parameter correctly (7d, 30d, 90d, all)
- [ ] Returns empty arrays for new users with no sessions
- [ ] Correctly calculates score trends grouped by date
- [ ] Properly aggregates category averages
- [ ] Identifies improving vs declining categories
- [ ] Calculates team average for comparison

#### 3. UI Testing

##### Empty State
- [ ] Navigate to `/analytics/performance` with no training sessions
- [ ] Verify empty state displays correctly
- [ ] Click "Start Training" button redirects to `/scenarios`

##### With Data
- [ ] Navigate to `/analytics/performance` with test data loaded
- [ ] Summary cards display correct values
- [ ] Line chart renders and shows data points
- [ ] Bar chart renders with all categories
- [ ] Hover tooltips work on both charts
- [ ] "Getting Better At" section shows improving categories
- [ ] "Needs Work" section shows declining/low categories

##### Time Period Filters
- [ ] Click "7 Days" filter
  - Chart updates to show only last 7 days
  - Stats recalculate correctly
- [ ] Click "30 Days" filter (default)
  - Shows last 30 days
- [ ] Click "90 Days" filter
  - Shows last 90 days (or all available if less)
- [ ] Click "All Time" filter
  - Shows all available session data

##### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Charts resize appropriately
- [ ] Cards stack correctly on mobile
- [ ] Filters remain accessible on all screen sizes

#### 4. Edge Cases

##### No Sessions
- [ ] New user with 0 sessions
- [ ] Empty state displays
- [ ] No errors in console

##### One Session
- [ ] User with only 1 session
- [ ] Charts display single data point
- [ ] No trend calculations (needs at least 2)

##### Many Sessions
- [ ] User with 100+ sessions
- [ ] Charts remain performant
- [ ] Data aggregation works correctly
- [ ] Timeline spans correctly

##### Team Comparison
- [ ] User is only member in org
  - Team average equals user average
- [ ] User above team average
  - Positive indicator shown
- [ ] User below team average
  - Neutral indicator shown

##### Category Variations
- [ ] Some sessions missing certain categories
  - Handles null/undefined gracefully
- [ ] Category scores in different formats (object vs number)
  - Normalizes correctly

#### 5. Performance Testing
- [ ] Load time < 2 seconds with 50 sessions
- [ ] No memory leaks on filter changes
- [ ] Charts render smoothly
- [ ] API response time < 500ms

#### 6. Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA standards
- [ ] Chart tooltips are readable
- [ ] Focus indicators visible

### Automated Testing (Future)

```javascript
// Example Jest test cases

describe('Performance Trends API', () => {
  test('returns 401 without authentication', async () => {
    const response = await request(app).get('/api/reports/performance-trends');
    expect(response.status).toBe(401);
  });

  test('returns empty data for new users', async () => {
    const response = await authenticatedRequest('/api/reports/performance-trends?timeframe=30d');
    expect(response.body.totalSessions).toBe(0);
    expect(response.body.scoresTrend).toEqual([]);
  });

  test('correctly identifies improving categories', async () => {
    // Setup: Create sessions with improving trend
    const response = await authenticatedRequest('/api/reports/performance-trends?timeframe=30d');
    expect(response.body.improvingCategories.length).toBeGreaterThan(0);
    expect(response.body.improvingCategories[0].change).toBeGreaterThan(0);
  });
});
```

## Known Issues / Limitations

1. **Historical Data**: Requires at least 2 sessions for trend analysis
2. **Team Average**: Only calculated for same organization
3. **Category Names**: Must match exact keys in database
4. **Time Zones**: All dates in UTC, may need localization

## Future Enhancements

1. **Export Functionality**: Download trends as PDF/CSV
2. **Goal Setting**: Set targets and track progress
3. **Predictive Analytics**: ML-based performance predictions
4. **Peer Comparison**: Anonymous comparison with peers at similar level
5. **Coaching Recommendations**: AI-generated improvement suggestions
6. **Historical Snapshots**: Save monthly snapshots for long-term tracking
7. **Custom Date Ranges**: Pick specific start/end dates
8. **Drill-down**: Click category to see session-level details

## Deployment Notes

### Environment Variables
No additional environment variables required.

### Database Requirements
- Requires `training_sessions` table with:
  - `user_id`, `organization_id`
  - `created_at`, `status`
  - `overall_score`
  - `category_scores` (JSONB)

### Dependencies
All required dependencies are already installed:
- `recharts` (v2.15.4) - for charts
- `lucide-react` - for icons
- `framer-motion` - for animations

## Access & Routes

**Public Route:** No (requires authentication)
**URL:** `/analytics/performance`
**Navigation:** Currently no navigation link (add to sidebar/menu as needed)

To add to navigation:
```jsx
// In Layout.jsx or Navigation component
<Link to="/analytics/performance">
  <Activity className="w-5 h-5" />
  Performance Trends
</Link>
```

## Support & Troubleshooting

### Common Issues

**Issue:** Charts not displaying
- Check browser console for errors
- Verify recharts is installed: `npm list recharts`
- Ensure data is being fetched successfully

**Issue:** Empty state shows but data exists
- Check API response in Network tab
- Verify `status = 'completed'` on sessions
- Check date range includes sessions

**Issue:** Team average showing as N/A
- Verify other users in same organization have completed sessions
- Check organization_id matches on all sessions

**Issue:** Categories missing
- Check session `category_scores` structure
- Verify category keys match expected format
- Check formatCategoryName mapping in API

## QA Sign-off

- [ ] All manual tests passed
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Works on all target browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive
- [ ] Accessible
- [ ] Ready for production deployment

**Tested By:** _________________
**Date:** _________________
**Approved By:** _________________
