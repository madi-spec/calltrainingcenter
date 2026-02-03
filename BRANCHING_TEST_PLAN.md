# Branching Decision Tree Test Plan

## Overview
This document outlines the test plan for the interactive branching decision tree feature.

## Test Environment Setup

### 1. Database Migration
Run the migration file:
```sql
-- Run: supabase-migrations/023_branching_paths.sql
```

This will:
- Add `branching_points` column to `scenario_templates`
- Create `session_branch_choices` table
- Add branching-related columns to `training_sessions`
- Create helper functions for path calculation
- Insert a test scenario with branching

### 2. Test Scenario
The migration includes a "Price Objection Decision Tree" scenario with:
- 4 decision nodes
- 3-4 choices per node
- Various path qualities (optimal, acceptable, poor)
- Score modifiers ranging from 0.4 to 1.0

## Functional Tests

### Test 1: Branching Trigger Detection
**Objective**: Verify that branching points trigger correctly based on keywords

**Steps**:
1. Start practice session with branching scenario
2. During conversation, say a trigger phrase (e.g., "too expensive")
3. Observe branching choice overlay appears
4. Verify choice UI displays correctly with all options

**Expected Results**:
- Choice overlay appears within 2-3 seconds of trigger
- All 3-4 choice options are displayed
- Each choice shows its score impact
- UI is clear and easy to understand

**Pass Criteria**:
- [ ] Trigger detected correctly
- [ ] Choice UI appears
- [ ] All choices are visible
- [ ] No errors in console

---

### Test 2: Choice Selection and Recording
**Objective**: Verify choice selection is properly recorded

**Steps**:
1. Trigger a branching point
2. Select a choice option
3. Click "Confirm & Continue"
4. Verify choice is recorded in database
5. Check that conversation continues

**Expected Results**:
- Selected choice is highlighted
- Confirmation works smoothly
- Choice is saved to `session_branch_choices` table
- Practice session continues without interruption

**Pass Criteria**:
- [ ] Choice can be selected
- [ ] Database record created
- [ ] Session continues normally
- [ ] No duplicate records

---

### Test 3: Multiple Branch Points
**Objective**: Verify multiple decision points work correctly

**Steps**:
1. Start branching scenario
2. Trigger and complete first branch point
3. Continue conversation
4. Trigger and complete second branch point
5. Verify both choices are tracked

**Expected Results**:
- Each branch point triggers independently
- All choices are tracked in order
- No interference between branch points
- Path building works correctly

**Pass Criteria**:
- [ ] Both branches trigger
- [ ] Choices tracked in sequence
- [ ] No conflicts or errors
- [ ] Path calculation correct

---

### Test 4: Path Score Calculation
**Objective**: Verify path quality scoring works correctly

**Steps**:
1. Complete scenario with all optimal choices (score_modifier = 1.0)
2. Check final path score
3. Replay with acceptable choices (score_modifier = 0.7)
4. Check updated path score
5. Replay with poor choices (score_modifier = 0.4)

**Expected Results**:
- Optimal path: score = 100%, quality = "optimal"
- Acceptable path: score = 70%, quality = "acceptable"
- Poor path: score = 40%, quality = "poor"

**Pass Criteria**:
- [ ] Optimal path scores 90%+
- [ ] Acceptable path scores 70-89%
- [ ] Poor path scores <70%
- [ ] Quality labels are correct

---

### Test 5: Decision Tree Visualization
**Objective**: Verify decision tree displays correctly on results page

**Steps**:
1. Complete branching scenario
2. View results page
3. Locate decision tree visualization
4. Verify all nodes and choices are shown
5. Verify chosen path is highlighted

**Expected Results**:
- Tree shows all decision nodes
- Chosen path is clearly marked
- Alternative choices are visible but dimmed
- Path quality indicator is accurate
- Visual design is clean and intuitive

**Pass Criteria**:
- [ ] All nodes displayed
- [ ] Chosen path highlighted
- [ ] Alternative paths visible
- [ ] Quality indicator correct
- [ ] No layout issues

---

### Test 6: Replay with Different Choices
**Objective**: Verify replay functionality works

**Steps**:
1. Complete branching scenario
2. View decision tree visualization
3. Click "Try Different Path" button
4. Start new session
5. Make different choices
6. Compare results

**Expected Results**:
- Replay button is visible
- New session starts correctly
- Can make different choices
- New path is tracked separately
- Results reflect new choices

**Pass Criteria**:
- [ ] Replay button works
- [ ] New session created
- [ ] Different choices possible
- [ ] Results show new path
- [ ] Original session preserved

---

### Test 7: No Branching Scenarios
**Objective**: Verify system works with scenarios without branching

**Steps**:
1. Start regular scenario (no branching_points)
2. Complete practice session
3. View results page
4. Verify no branching UI appears

**Expected Results**:
- No branching choice overlays during practice
- No decision tree on results page
- Normal flow is not affected
- No errors or warnings

**Pass Criteria**:
- [ ] No branching UI shown
- [ ] Practice works normally
- [ ] Results page normal
- [ ] No console errors

---

### Test 8: AI Context Integration
**Objective**: Verify AI receives choice context

**Steps**:
1. Trigger branching point
2. Select choice with specific ai_context
3. Continue conversation
4. Observe AI customer response
5. Verify response aligns with choice context

**Expected Results**:
- AI response reflects the chosen path
- Customer behavior changes based on choice
- Context is properly integrated
- Conversation feels natural

**Pass Criteria**:
- [ ] AI acknowledges choice
- [ ] Response is contextual
- [ ] Behavior changes appropriately
- [ ] No context errors

---

## Edge Cases

### Edge Case 1: Rapid Trigger
**Scenario**: Multiple trigger keywords in quick succession

**Test**: Say multiple trigger phrases quickly

**Expected**: Only first matching node triggers, subsequent ones ignored until current choice is made

---

### Edge Case 2: Session Interruption
**Scenario**: Browser closes during choice selection

**Test**: Close browser after triggering branch, reopen

**Expected**: Session state recovers gracefully, choice not recorded if not confirmed

---

### Edge Case 3: No Choice Made
**Scenario**: User sees choice but doesn't select anything

**Test**: Trigger branch, wait without selecting

**Expected**: Practice can continue (with timeout) or require choice depending on implementation

---

### Edge Case 4: Database Error
**Scenario**: Database unavailable when recording choice

**Test**: Simulate database error

**Expected**: Error handled gracefully, user notified, session can continue

---

## Performance Tests

### Performance 1: Large Decision Trees
**Test**: Scenario with 10+ branch points

**Expected**:
- No lag in trigger detection
- Choice UI renders quickly (<500ms)
- Database writes complete quickly (<1s)
- Visualization renders within 2s

---

### Performance 2: Concurrent Users
**Test**: Multiple users in branching scenarios simultaneously

**Expected**:
- No data conflicts
- Each session tracked independently
- Performance remains consistent

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Accessibility Tests

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces choices correctly
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible
- [ ] No reliance on color alone

---

## QA Checklist Summary

### Functionality
- [ ] Branching triggers detect correctly
- [ ] Choice UI is clear and usable
- [ ] AI responds appropriately to choices
- [ ] Path tracking is accurate
- [ ] Visualization shows full decision tree
- [ ] Scoring reflects path quality
- [ ] Replay works with new choices
- [ ] No scenario breaks/dead ends

### User Experience
- [ ] Choice UI is intuitive
- [ ] Instructions are clear
- [ ] Visualization is easy to understand
- [ ] Performance is smooth
- [ ] No confusing states

### Technical
- [ ] Database migrations work
- [ ] All API endpoints function
- [ ] No console errors
- [ ] Proper error handling
- [ ] Data persistence works
- [ ] RLS policies secure

### Edge Cases
- [ ] Handles rapid triggers
- [ ] Recovers from interruptions
- [ ] Works without branching
- [ ] Handles database errors

---

## Known Limitations

1. **Trigger Timing**: Branching triggers are keyword-based, may not perfectly align with conversation flow
2. **AI Context**: AI context is a suggestion to the AI model, not guaranteed behavior
3. **Single Choice**: Only one branch point can be active at a time
4. **Keyword Matching**: Uses simple keyword matching, not semantic understanding

---

## Future Enhancements

1. **Time-based Triggers**: Trigger branches at specific time points in conversation
2. **Score-based Triggers**: Trigger branches based on current performance score
3. **Conditional Branching**: Next node depends on previous choices
4. **Branch Analytics**: Track which paths are most/least common
5. **AI-driven Triggers**: Let AI determine when to branch based on conversation context
6. **Multi-path Visualization**: Show all possible paths in a tree diagram
7. **Path Recommendations**: Suggest optimal paths based on user performance history
8. **Collaborative Branching**: Manager-designed branch scenarios

---

## Rollback Plan

If critical issues are found:

1. **Immediate**: Disable branching UI via feature flag
2. **Database**: Branching data is in separate tables, won't affect existing sessions
3. **Code Rollback**: Remove BranchingChoice component from Training.jsx
4. **Migration Rollback**:
   ```sql
   ALTER TABLE scenario_templates DROP COLUMN branching_points;
   DROP TABLE session_branch_choices;
   ALTER TABLE training_sessions
     DROP COLUMN branch_path_score,
     DROP COLUMN branch_path_quality,
     DROP COLUMN branches_taken;
   ```

---

## Sign-off

- [ ] All critical tests passing
- [ ] No high-severity bugs
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] Documentation complete
- [ ] Stakeholder approval

**Tested By**: _____________
**Date**: _____________
**Version**: 1.0.0
**Status**: ☐ Pass ☐ Fail ☐ Needs Review
