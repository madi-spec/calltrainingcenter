# Weekly Digest Email System

Automated weekly performance digest emails for managers summarizing team performance.

## Overview

The weekly digest system sends automated HTML emails to managers every Monday at 8:00 AM (organization timezone) with:
- Team performance metrics
- Top 3 performers
- Team members needing attention
- Suggested focus areas
- Quick statistics

## Components

### 1. Database Schema
**File:** `supabase-migrations/023_email_preferences.sql`

**Table:** `email_preferences`
```sql
- id: UUID (primary key)
- user_id: UUID (references users.id)
- weekly_digest: BOOLEAN (default: true)
- digest_day: TEXT (default: 'monday')
- digest_time: TIME (default: '08:00:00')
- timezone: TEXT (default: 'America/New_York')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 2. Email Template
**File:** `api/services/emailTemplates/weeklyDigest.js`

Functions:
- `generateWeeklyDigestHTML(data)` - Generates HTML email
- `generateWeeklyDigestText(data)` - Generates plain text fallback

### 3. Digest Job
**File:** `api/jobs/weeklyDigest.js`

Functions:
- `runWeeklyDigestJob()` - Main cron job execution
- `triggerWeeklyDigestManual()` - Manual trigger for testing
- `calculateTeamStats(adminClient, organizationId, managerId)` - Calculate metrics
- `sendDigestToManager(adminClient, manager, organization, stats)` - Send email

### 4. API Routes
**File:** `api/routes/notifications.js`

Endpoints:
- `GET /api/notifications/preferences` - Get user's email preferences
- `PUT /api/notifications/preferences` - Update preferences
- `POST /api/notifications/preferences/unsubscribe` - Unsubscribe from digest

### 5. Admin Trigger
**File:** `api/index.js`

Endpoint:
- `POST /api/admin/trigger-weekly-digest` - Manual trigger (admin/super_admin only)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install node-cron --prefix api
```

### 2. Run Database Migration
Execute the migration in Supabase SQL Editor:
```bash
# Copy and paste contents of:
supabase-migrations/023_email_preferences.sql
```

### 3. Configure Environment Variables
Add to `api/.env`:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Required for sending emails
APP_URL=https://selleverycall.com  # Base URL for links
ENABLE_CRON_JOBS=true  # Set to 'false' to disable scheduled jobs
```

### 4. Verify Installation
Run the test script:
```bash
node api/scripts/test-weekly-digest.js
```

## Usage

### Automatic Scheduling
The cron job runs automatically every Monday at 8:00 AM ET when:
- `ENABLE_CRON_JOBS` is not set to 'false'
- Server is running
- RESEND_API_KEY is configured

### Manual Trigger
For testing or on-demand execution:

```bash
# Via API (requires admin auth token)
curl -X POST https://your-api.com/api/admin/trigger-weekly-digest \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or use the test script:
```bash
node api/scripts/test-weekly-digest.js
```

### User Preferences Management

**Get preferences:**
```bash
curl https://your-api.com/api/notifications/preferences \
  -H "Authorization: Bearer USER_TOKEN"
```

**Update preferences:**
```bash
curl -X PUT https://your-api.com/api/notifications/preferences \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "weekly_digest": true,
    "digest_day": "monday",
    "digest_time": "09:00:00",
    "timezone": "America/Los_Angeles"
  }'
```

**Unsubscribe:**
```bash
curl -X POST https://your-api.com/api/notifications/preferences/unsubscribe \
  -H "Authorization: Bearer USER_TOKEN"
```

## Email Content

### Stats Calculated
1. **Average Score** - Team average across all sessions in the past 7 days
2. **Total Sessions** - Count of completed sessions
3. **Completion Rate** - Percentage of team members who practiced
4. **Practice Compliance** - Users with at least 1 session vs total users

### Top Performers
- Minimum 3 sessions required
- Sorted by average score
- Top 3 displayed with badges (gold, silver, bronze)
- Shows: sessions, average score, total minutes

### Needs Attention
Identifies users who:
- Have low average scores (< 60%)
- Haven't practiced at all this week
- Limited to top 5 most critical

### Focus Areas
Auto-generated suggestions based on:
- Low participation rates
- Common weak skill categories
- Overall team performance trends

## Testing

### Test Checklist
- [ ] Cron job runs on schedule
- [ ] Email content is accurate
- [ ] Only managers receive emails
- [ ] HTML renders correctly in email clients
- [ ] Stats calculations are correct
- [ ] Unsubscribe works
- [ ] Preferences persist and apply
- [ ] Handles edge cases (no data, single user)

### Test Scenarios

#### 1. Basic Functionality
```bash
# Run the test script
node api/scripts/test-weekly-digest.js
```

#### 2. Edge Cases

**No sessions this week:**
- Should still send email
- Stats should show zeros
- Focus areas should suggest increasing participation

**Single user:**
- Should handle gracefully
- Top performers should work with 1 user

**No managers:**
- Job should complete without errors
- Log should indicate no recipients

#### 3. Email Rendering
Test in multiple email clients:
- Gmail (web)
- Outlook (desktop)
- Apple Mail
- Mobile devices

#### 4. Preferences
Test preference combinations:
- weekly_digest: false (should not receive)
- Different digest_day values
- Different digest_time values
- Unsubscribe flow

## Monitoring

### Logs
The job logs to console:
```
[WeeklyDigest] Starting weekly digest job...
[WeeklyDigest] Processing organization: Acme Corp
[WeeklyDigest] Found 3 eligible managers
[WeeklyDigest] Sent to manager@example.com, message ID: abc123
[WeeklyDigest] Job completed. Sent: 3, Failed: 0
```

### Error Handling
Common errors:
- **RESEND_API_KEY not set** - Emails will be skipped
- **No managers found** - Job completes with sent: 0
- **Database errors** - Logged and job continues to next org

## Customization

### Change Schedule
Edit `api/index.js`:
```javascript
// Current: Every Monday at 8am
cron.schedule('0 8 * * 1', ...)

// Examples:
// Every day at 9am: '0 9 * * *'
// Every Friday at 5pm: '0 17 * * 5'
// Twice a week (Mon, Thu) at 8am: '0 8 * * 1,4'
```

### Customize Email Template
Edit `api/services/emailTemplates/weeklyDigest.js`:
- Modify HTML structure
- Change colors and branding
- Add/remove sections
- Update copy

### Adjust Stats Calculations
Edit `api/jobs/weeklyDigest.js`:
- `calculateTeamStats()` - Modify metrics
- `generateFocusAreas()` - Change suggestions logic
- Thresholds (e.g., low score < 60)

## Troubleshooting

### Emails Not Sending

1. **Check RESEND_API_KEY:**
```bash
# In api/.env
echo $RESEND_API_KEY
```

2. **Verify domain configuration in Resend:**
- Log into Resend dashboard
- Add and verify your sending domain
- Update 'from' address in weeklyDigest.js

3. **Check logs:**
```bash
# Look for errors in console output
[WeeklyDigest] Error sending to manager@example.com: ...
```

### Wrong Data in Email

1. **Verify date range:**
```javascript
// In weeklyDigest.js
console.log('Week range:', weekRange);
```

2. **Check session status:**
- Only 'completed' sessions are counted
- Verify sessions are marked as completed

3. **Test calculations manually:**
```javascript
// Use test script to inspect stats object
console.log('Stats:', stats);
```

### Cron Not Running

1. **Check if enabled:**
```bash
# In api/.env
ENABLE_CRON_JOBS=true  # Not 'false'
```

2. **Verify server is running:**
```bash
# Server must be running continuously
npm run dev  # or npm start
```

3. **Check timezone:**
```javascript
// In index.js cron.schedule()
timezone: 'America/New_York'
```

## Future Enhancements

Potential improvements:
- [ ] Multiple language support
- [ ] Customizable metrics per organization
- [ ] PDF attachments with detailed reports
- [ ] Manager-specific team filtering (not org-wide)
- [ ] Historical comparisons (vs last week)
- [ ] Export digest to CSV
- [ ] Slack/Teams integration
- [ ] A/B testing for email content
- [ ] Per-manager timezone support
- [ ] Digest preview before sending

## Support

For issues or questions:
1. Check logs in console
2. Run test script for diagnostics
3. Verify database migration was applied
4. Check Resend dashboard for delivery status
5. Contact: support@selleverycall.com
