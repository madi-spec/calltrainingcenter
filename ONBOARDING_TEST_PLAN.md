# Onboarding Tutorial - Test Plan

## Prerequisites

1. **Run Database Migration**
   ```bash
   node api/scripts/run-onboarding-migration.js
   ```
   Follow the instructions to run the SQL in Supabase Dashboard.

2. **Install Dependencies**
   ```bash
   cd client
   npm install
   ```

## Test Cases

### Test 1: First-Time User Experience
**Objective**: Verify tour appears for new users

**Steps**:
1. Create a new test user account
2. Login to the application
3. Navigate to the dashboard

**Expected Results**:
- [ ] Tour automatically starts within 1 second
- [ ] Welcome message appears centered on screen
- [ ] "Skip Tour" button is visible
- [ ] "Next" button is visible
- [ ] Progress indicator shows step 1/7

### Test 2: Tour Navigation
**Objective**: Verify all tour steps work correctly

**Steps**:
1. Start tour (use fresh test user or reset onboarding)
2. Click "Next" on each step
3. Verify each highlighted element

**Expected Results**:
- [ ] Step 1: Welcome message (centered)
- [ ] Step 2: Gamification section highlights (badges/points)
- [ ] Step 3: Dashboard stats highlight (Total Sessions, Avg Score, etc.)
- [ ] Step 4: "View all courses" link highlights
- [ ] Step 5: "Start Practice" button highlights
- [ ] Step 6: Leaderboard link highlights (in badges section)
- [ ] Step 7: Completion message (centered)
- [ ] Progress indicator updates correctly (1/7, 2/7, etc.)
- [ ] "Back" button works for previous steps

### Test 3: Skip Functionality
**Objective**: Verify skip button works and persists

**Steps**:
1. Start tour with test user
2. Click "Skip Tour" on step 2
3. Refresh the page
4. Check database

**Expected Results**:
- [ ] Tour closes immediately when skip is clicked
- [ ] Tour does NOT reappear after page refresh
- [ ] `onboarding_completed` = true in database
- [ ] No console errors

### Test 4: Complete Tour
**Objective**: Verify completing the full tour

**Steps**:
1. Start tour with test user
2. Click "Next" through all 7 steps
3. Click "Finish" on the last step
4. Refresh the page
5. Check database

**Expected Results**:
- [ ] Tour completes successfully
- [ ] Success message appears on final step
- [ ] Tour does NOT reappear after page refresh
- [ ] `onboarding_completed` = true in database
- [ ] User can navigate normally

### Test 5: Returning User
**Objective**: Verify tour doesn't show for users who completed it

**Steps**:
1. Use user who completed onboarding (from Test 3 or 4)
2. Logout and login again
3. Navigate to dashboard

**Expected Results**:
- [ ] Tour does NOT appear
- [ ] Dashboard loads normally
- [ ] No tour-related console errors

### Test 6: Element Visibility
**Objective**: Verify all highlighted elements exist and are visible

**Steps**:
1. Start tour
2. For each step, verify the highlighted element is visible
3. Try resizing the window at each step

**Expected Results**:
- [ ] All targeted elements exist on the page
- [ ] Elements are visible (not hidden or off-screen)
- [ ] Tour tooltip positions correctly
- [ ] No "target not found" errors in console

### Test 7: Mobile Responsiveness
**Objective**: Verify tour works on mobile devices

**Steps**:
1. Open app on mobile device or use DevTools mobile emulation
2. Login with test user (onboarding not completed)
3. Navigate to dashboard

**Expected Results**:
- [ ] Tour appears on mobile
- [ ] Tooltips are readable and don't overflow
- [ ] All buttons are tappable
- [ ] Tour completes successfully
- [ ] No layout issues

### Test 8: API Endpoint
**Objective**: Verify the API endpoint works correctly

**Steps**:
1. Login as test user
2. Open browser DevTools Network tab
3. Start and complete the tour
4. Check network requests

**Expected Results**:
- [ ] PATCH request to `/api/users/onboarding-complete` is sent
- [ ] Request returns 200 status
- [ ] Response contains `success: true`
- [ ] Response contains updated user object

### Test 9: Session Persistence
**Objective**: Verify tour doesn't re-trigger in same session

**Steps**:
1. Login with test user (onboarding not completed)
2. Start tour but don't complete it
3. Navigate away from dashboard
4. Navigate back to dashboard (same session)

**Expected Results**:
- [ ] Tour does NOT appear again in same session
- [ ] SessionStorage key exists
- [ ] Dashboard loads normally

### Test 10: Error Handling
**Objective**: Verify graceful error handling

**Steps**:
1. Start tour
2. Open DevTools and simulate network failure
3. Try to complete tour

**Expected Results**:
- [ ] Tour handles network errors gracefully
- [ ] Appropriate error message in console
- [ ] User can still skip tour
- [ ] App doesn't crash

## Automated Testing

### Unit Tests (Optional)
```javascript
// Test useOnboarding hook
describe('useOnboarding', () => {
  it('should return shouldShowTour=true for new users', () => {
    // Mock profile with onboarding_completed=false
    // Assert shouldShowTour is true
  });

  it('should call API when completeOnboarding is called', async () => {
    // Mock authFetch
    // Call completeOnboarding
    // Assert API was called with correct endpoint
  });
});
```

### Integration Tests (Optional)
```javascript
// Test OnboardingTour component
describe('OnboardingTour', () => {
  it('should render all 7 steps', () => {
    // Render component with run=true
    // Verify steps array has 7 items
  });

  it('should call onComplete when finished', () => {
    // Mock onComplete callback
    // Complete tour
    // Assert callback was called
  });
});
```

## Performance Checks

### Load Time
- [ ] Tour components load within 500ms
- [ ] No significant impact on dashboard load time
- [ ] react-joyride bundle size is acceptable (<100KB)

### Memory
- [ ] No memory leaks when mounting/unmounting tour
- [ ] SessionStorage usage is minimal

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Console Errors

During all tests, check for:
- [ ] No React warnings
- [ ] No console errors
- [ ] No network errors (except Test 10)

## QA Sign-Off

- [ ] All test cases pass
- [ ] No critical bugs found
- [ ] Documentation is complete
- [ ] Migration script tested
- [ ] Ready for production

**Tested by**: _____________
**Date**: _____________
**Notes**: _____________

---

## Reset Onboarding (For Testing)

To reset a user's onboarding status for retesting:

### Option 1: SQL (Supabase Dashboard)
```sql
UPDATE users
SET onboarding_completed = false
WHERE email = 'test@example.com';
```

### Option 2: Browser Console
```javascript
// Must be logged in as the user
const response = await fetch('/api/users/' + profile.id, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + await getToken()
  },
  body: JSON.stringify({
    preferences: { onboarding_completed: false }
  })
});
// Clear session storage
sessionStorage.clear();
// Refresh page
location.reload();
```

## Known Issues

Document any known issues here during testing:

1. _____________
2. _____________
3. _____________

## Future Enhancements

Ideas for future improvements:
- [ ] Add more steps for advanced features
- [ ] Allow users to restart tour from settings
- [ ] Add video tutorials
- [ ] Contextual help tooltips outside of tour
- [ ] Analytics tracking for tour completion rates
