# Weekly Digest Email Implementation - Summary

## What Was Built

Automated weekly digest email system that sends performance summaries to managers every Monday at 8am.

## Files Created

### Database
- `supabase-migrations/023_email_preferences.sql` - Email preferences table and policies

### Backend
- `api/jobs/weeklyDigest.js` - Main job logic and stats calculation
- `api/services/emailTemplates/weeklyDigest.js` - HTML and text email templates
- `api/scripts/test-weekly-digest.js` - Test script
- `api/docs/WEEKLY_DIGEST.md` - Complete documentation

### Modified Files
- `api/routes/notifications.js` - Added preference endpoints
- `api/index.js` - Registered cron job and admin trigger
- `api/lib/supabase.js` - Added EMAIL_PREFERENCES to TABLES
- `api/package.json` - Added node-cron dependency

## Features Implemented

### Email Content
- Team compliance stats (X/Y completed required practice)
- Top 3 performers with badges and stats
- Team members needing attention (low scores/no practice)
- Suggested focus areas based on performance
- Quick stats: avg score, total sessions, completion rate
- Professional HTML template with branding

### User Management
- Preferences API endpoints (get/update/unsubscribe)
- Default preferences (weekly_digest=true, Monday 8am)
- Customizable day, time, and timezone per user
- Unsubscribe functionality

### Admin Features
- Manual trigger endpoint for testing
- Only sends to users with manager+ role
- Respects email preferences
- Comprehensive logging

## Setup Required

### 1. Run Database Migration
Execute in Supabase SQL Editor:
```sql
-- Contents of supabase-migrations/023_email_preferences.sql
```

### 2. Configure Email Service (Optional)
Add to `api/.env`:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

Without this, the system runs but skips email sending (useful for testing).

### 3. Verify Installation
```bash
cd api
node scripts/test-weekly-digest.js
```

## API Endpoints

### User Endpoints (Authenticated)
- `GET /api/notifications/preferences` - Get email preferences
- `PUT /api/notifications/preferences` - Update preferences
- `POST /api/notifications/preferences/unsubscribe` - Unsubscribe from digest

### Admin Endpoints
- `POST /api/admin/trigger-weekly-digest` - Manual trigger (admin/super_admin only)

## Cron Schedule

**Schedule:** Every Monday at 8:00 AM ET

**Configuration:**
```javascript
cron.schedule('0 8 * * 1', async () => {
  await runWeeklyDigestJob();
}, {
  timezone: 'America/New_York'
});
```

**Disable:** Set `ENABLE_CRON_JOBS=false` in `.env`

## Stats Calculated

### Team Metrics
- **Average Score** - Mean of all session scores (past 7 days)
- **Total Sessions** - Count of completed sessions
- **Completion Rate** - % of team members with ≥1 session
- **Practice Compliance** - Users practiced / Total users

### Top Performers (minimum 3 sessions)
- Sorted by average score
- Shows: name, sessions, avg score, total minutes
- Displays with badges (🥇 🥈 🥉)

### Needs Attention
Identifies users who:
- Score below 60% average
- Haven't practiced this week
- Limited to 5 most critical

### Focus Areas
Auto-generated based on:
- Participation rates
- Score distributions
- Weak skill categories
- Performance trends

## Testing

### Quick Test
```bash
# 1. Check database setup
node api/scripts/test-weekly-digest.js

# 2. Run migration if needed (copy/paste into Supabase SQL Editor)
# supabase-migrations/023_email_preferences.sql

# 3. Test again
node api/scripts/test-weekly-digest.js
```

### Manual Trigger
```bash
# Via API (requires admin auth)
curl -X POST http://localhost:3001/api/admin/trigger-weekly-digest \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Checklist
- [x] Database migration created
- [x] Cron job registered in index.js
- [x] Email template (HTML + text)
- [x] Stats calculation logic
- [x] API endpoints for preferences
- [x] Manual trigger endpoint
- [x] Test script
- [x] Documentation
- [ ] Run database migration in Supabase
- [ ] Configure RESEND_API_KEY (optional)
- [ ] Run test script
- [ ] Verify email sends (if Resend configured)
- [ ] Test preferences API
- [ ] Test unsubscribe flow

## Edge Cases Handled

1. **No sessions this week** - Sends email with zeros, suggests increasing participation
2. **No managers** - Job completes gracefully, logs "no recipients"
3. **Single user** - Top performers work with 1 user
4. **Missing preferences** - Uses defaults (digest enabled)
5. **Email service not configured** - Logs warning, skips sending
6. **Disabled preferences** - Filters out users with weekly_digest=false

## Security

- Only manager/admin/super_admin roles receive emails
- Row-level security on email_preferences table
- Users can only view/update their own preferences
- Manual trigger requires admin authentication
- No sensitive data exposed in emails (only aggregated stats)

## Performance

- Single query per organization for team stats
- Efficient filtering with database indexes
- Batched email sending per organization
- Skips organizations with no data
- Logs execution time and results

## Monitoring

### Logs
```
[Cron] Running weekly digest job...
[WeeklyDigest] Starting weekly digest job...
[WeeklyDigest] Processing organization: Acme Corp
[WeeklyDigest] Found 3 eligible managers
[WeeklyDigest] Sent to manager@example.com, message ID: abc123
[WeeklyDigest] Job completed. Sent: 3, Failed: 0
```

### Metrics to Track
- Emails sent vs failed
- Processing time per organization
- Open rates (via Resend dashboard)
- Click-through on dashboard link
- Unsubscribe rate

## Future Enhancements

Potential improvements:
- [ ] Per-manager team filtering (not org-wide)
- [ ] Historical comparisons (vs last week)
- [ ] Customizable metrics per organization
- [ ] PDF attachments
- [ ] Multiple language support
- [ ] Slack/Teams integration
- [ ] Per-manager timezone support
- [ ] A/B testing for email content

## Troubleshooting

### Emails Not Sending
1. Check `RESEND_API_KEY` is set in `.env`
2. Verify domain in Resend dashboard
3. Check logs for errors
4. Test with manual trigger

### Wrong Data
1. Verify date range calculation
2. Check session status filtering
3. Run test script with console.log debugging
4. Verify database queries

### Cron Not Running
1. Check `ENABLE_CRON_JOBS` is not 'false'
2. Verify server is running continuously
3. Check timezone configuration
4. Use manual trigger to test logic

## Documentation

Full documentation available at:
- `api/docs/WEEKLY_DIGEST.md` - Complete feature documentation
- `api/scripts/test-weekly-digest.js` - Test script with examples
- `supabase-migrations/023_email_preferences.sql` - Database schema

## Support

For questions or issues:
1. Check logs in console
2. Run test script for diagnostics
3. Review documentation
4. Check Resend dashboard for delivery status

---

**Status:** ✅ Implementation Complete - Ready for Testing

**Next Steps:**
1. Run database migration in Supabase
2. Configure RESEND_API_KEY (optional)
3. Run test script
4. Deploy to production
5. Monitor first scheduled run (next Monday 8am)
