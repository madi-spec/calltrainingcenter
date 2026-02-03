# Session Playback Testing Guide

## Pre-Testing Setup

### 1. Database Migration
Run the migration in Supabase SQL Editor:
```bash
# Navigate to Supabase Dashboard → SQL Editor
# Copy and paste contents of: supabase-migrations/023_session_notes.sql
# Execute the migration
```

### 2. Verify Tables Created
```sql
-- Check session_notes table exists
SELECT * FROM session_notes LIMIT 1;

-- Check training_sessions has new columns
SELECT
  recording_url,
  transcript_with_timestamps,
  analysis_markers
FROM training_sessions
LIMIT 1;
```

### 3. Test Data Setup
You'll need at least one completed training session with:
- A recording_url or recording_id
- A transcript (transcript_formatted or transcript_raw)
- Optionally: analysis_markers with timestamps

## Testing Scenarios

### Test 1: Audio Player Functionality
**Objective**: Verify audio player works correctly

1. Navigate to Session History (`/history`)
2. Find a session with "Watch Replay" button
3. Click "Watch Replay"
4. **Test Steps**:
   - [ ] Audio loads without errors
   - [ ] Click play button - audio starts
   - [ ] Click pause button - audio stops
   - [ ] Click skip back (-10s) - audio jumps back
   - [ ] Click skip forward (+10s) - audio jumps forward
   - [ ] Drag progress bar - audio seeks to position
   - [ ] Click progress bar - audio jumps to position
   - [ ] Adjust volume slider - volume changes
   - [ ] Click mute button - audio mutes/unmutes
   - [ ] Click speed button - cycles through 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
   - [ ] Time display shows current time and total duration

**Expected Results**: All controls work smoothly without lag or errors

### Test 2: Transcript Synchronization
**Objective**: Verify transcript highlights in sync with audio

1. Open a session with playback
2. Click play on audio player
3. **Test Steps**:
   - [ ] First transcript segment highlights when audio starts
   - [ ] Highlight moves to next segment as audio progresses
   - [ ] Active segment has blue ring around it
   - [ ] Transcript auto-scrolls to keep active segment visible
   - [ ] Pause audio - highlight stays on current segment
   - [ ] Resume - highlight continues from same position

**Expected Results**: Transcript stays perfectly synchronized with audio

### Test 3: Click-to-Jump Navigation
**Objective**: Verify clicking transcript jumps audio

1. Open a session with playback
2. **Test Steps**:
   - [ ] Click first transcript segment
   - [ ] Audio jumps to that timestamp
   - [ ] Player shows updated time
   - [ ] Transcript highlights clicked segment
   - [ ] Click middle transcript segment
   - [ ] Audio jumps accurately
   - [ ] Click last transcript segment
   - [ ] Audio jumps to end
   - [ ] Click segment while audio is playing
   - [ ] Jump happens smoothly without glitches

**Expected Results**: Every click jumps audio to exact timestamp

### Test 4: Visual Analysis Markers
**Objective**: Verify mistake/success/objection markers display

1. Find a session with analysis_markers data
2. Open playback
3. **Test Steps**:
   - [ ] Mistakes show red left border on transcript
   - [ ] Successes show green left border
   - [ ] Objections show yellow left border
   - [ ] Marker icons appear (AlertCircle, CheckCircle, AlertTriangle)
   - [ ] Markers are at correct timestamps
   - [ ] Multiple markers don't overlap incorrectly

**Expected Results**: Markers clearly identify key moments

### Test 5: Add Personal Note
**Objective**: Verify note creation and persistence

1. Open a session with playback
2. Play audio to 30 seconds
3. **Test Steps**:
   - [ ] Click "Add Note" button
   - [ ] Note form appears
   - [ ] Select note type (e.g., "Personal Note")
   - [ ] Enter text: "Test note at 30 seconds"
   - [ ] Timestamp shows 0:30
   - [ ] Click "Save Note"
   - [ ] Note appears in notes list
   - [ ] Note shows correct timestamp (0:30)
   - [ ] Refresh page
   - [ ] Note still appears (persisted to DB)

**Expected Results**: Note saves and persists correctly

### Test 6: Note Type Categories
**Objective**: Verify all note types work and display correctly

1. Open a session with playback
2. Add notes of each type:
   - [ ] Personal Note (blue)
   - [ ] Mistake (red)
   - [ ] Success (green)
   - [ ] Question (purple)
   - [ ] Objection (yellow)
3. **Test Steps**:
   - [ ] Each note type has correct color
   - [ ] Icons match note type
   - [ ] Can create multiple notes of same type
   - [ ] Notes sort by timestamp regardless of type

**Expected Results**: All note types display with correct styling

### Test 7: Edit and Delete Notes
**Objective**: Verify note management works

1. Create a test note
2. **Test Steps**:
   - [ ] Click edit icon on note
   - [ ] Note form loads with existing text
   - [ ] Change text to "Updated note"
   - [ ] Change type to different category
   - [ ] Click "Save"
   - [ ] Note updates in list
   - [ ] Click delete icon on note
   - [ ] Note disappears from list
   - [ ] Refresh page
   - [ ] Deleted note doesn't reappear

**Expected Results**: Edit and delete work correctly

### Test 8: Note Navigation
**Objective**: Verify clicking note timestamp jumps audio

1. Create notes at different timestamps (e.g., 0:30, 1:15, 2:45)
2. **Test Steps**:
   - [ ] Click first note's timestamp
   - [ ] Audio jumps to 0:30
   - [ ] Click second note's timestamp
   - [ ] Audio jumps to 1:15
   - [ ] Click third note's timestamp
   - [ ] Audio jumps to 2:45
   - [ ] Transcript highlights correct segment
   - [ ] Works while audio is playing
   - [ ] Works while audio is paused

**Expected Results**: Note timestamps provide quick navigation

### Test 9: Long Session Performance
**Objective**: Verify no drift or lag in long sessions

1. Find a session >10 minutes long
2. Play through entire session
3. **Test Steps**:
   - [ ] Audio and transcript stay synced at 5 minutes
   - [ ] Still synced at 10 minutes
   - [ ] Still synced at end
   - [ ] No noticeable lag in UI
   - [ ] Scrolling remains smooth
   - [ ] Notes load quickly

**Expected Results**: Performance remains consistent

### Test 10: Mobile Responsiveness
**Objective**: Verify works on mobile devices

1. Open on mobile device or resize browser to mobile width
2. **Test Steps**:
   - [ ] Player controls are accessible
   - [ ] Buttons are large enough to tap
   - [ ] Transcript is readable
   - [ ] Can scroll transcript easily
   - [ ] Notes panel is usable
   - [ ] Add note form works
   - [ ] Layout doesn't break
   - [ ] No horizontal scrolling

**Expected Results**: Fully functional on mobile

### Test 11: Error Handling
**Objective**: Verify graceful error handling

1. **Test Steps**:
   - [ ] Visit `/playback/invalid-uuid`
   - [ ] Shows "Unable to Load Session" message
   - [ ] Visit session without recording
   - [ ] Shows "No recording available" message
   - [ ] Try to add note with empty text
   - [ ] Button is disabled
   - [ ] Network error during note save
   - [ ] Error message displays

**Expected Results**: All errors handled gracefully

### Test 12: Performance Breakdown Integration
**Objective**: Verify session details display correctly

1. Open playback for completed session
2. **Test Steps**:
   - [ ] Session name displays in header
   - [ ] Date and duration show correctly
   - [ ] Overall score displays with correct color
   - [ ] Category scores section appears
   - [ ] All categories show scores
   - [ ] Strengths section lists items
   - [ ] Improvements section lists items
   - [ ] Share and Export buttons present

**Expected Results**: All session metadata displays correctly

## Regression Testing

After any code changes, re-run:
- Test 2 (Transcript Sync)
- Test 3 (Click-to-Jump)
- Test 5 (Add Note)
- Test 9 (Performance)

## Performance Benchmarks

### Acceptable Performance:
- Audio load time: < 2 seconds
- Transcript scroll lag: < 50ms
- Note save time: < 500ms
- Page load time: < 3 seconds

### Red Flags:
- Audio/transcript drift > 1 second
- UI lag when scrolling
- Notes take > 2 seconds to save
- Memory leaks during long playback

## Bug Report Template

When filing bugs, include:
```
**Bug**: [Brief description]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Browser**: [Chrome/Firefox/Safari version]
**Device**: [Desktop/Mobile/Tablet]
**Session ID**: [UUID of session being tested]
**Console Errors**: [Any errors in browser console]
**Network Errors**: [Any failed API calls in Network tab]
```

## Common Issues and Solutions

### Issue: Audio won't play
- **Check**: CORS headers on recording URL
- **Check**: Audio format is supported
- **Check**: Browser autoplay policy (user gesture required)

### Issue: Transcript not highlighting
- **Check**: transcript_formatted has timestamp data
- **Check**: currentTime is updating (console.log in handleTimeUpdate)
- **Check**: No JavaScript errors in console

### Issue: Notes not saving
- **Check**: User is authenticated
- **Check**: Session exists in database
- **Check**: API endpoint is reachable
- **Check**: Database RLS policies allow insert

### Issue: Performance lag
- **Check**: Transcript segment count (<500 recommended)
- **Check**: Memory usage in browser dev tools
- **Check**: Event listeners are being cleaned up
- **Check**: Re-renders are optimized

## Success Criteria

Feature is ready for production when:
- [ ] All 12 test scenarios pass
- [ ] No console errors during normal usage
- [ ] Performance benchmarks met
- [ ] Works on Chrome, Firefox, Safari
- [ ] Works on desktop, tablet, mobile
- [ ] Accessible with keyboard navigation
- [ ] No memory leaks after 30 min session
- [ ] Database migrations run successfully
- [ ] API endpoints return correct data
- [ ] RLS policies enforce security
