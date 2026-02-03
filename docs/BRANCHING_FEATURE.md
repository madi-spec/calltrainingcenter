# Interactive Decision Tree Branching

## Overview

The branching decision tree system transforms linear training scenarios into interactive, multi-path experiences where trainees make critical decisions that affect the conversation flow and final score.

## Key Features

### 1. **Dynamic Decision Points**
- Scenarios can pause at key moments to present multiple choice options
- Choices are triggered by keywords, time, or performance metrics
- Each choice leads to different AI responses and outcomes

### 2. **Path Tracking**
- Every decision is recorded with timestamp and score impact
- Full path visualization shows the journey taken
- Compare your path against optimal routes

### 3. **Quality Scoring**
- **Optimal Path (100%)**: Best possible choices demonstrating expert technique
- **Acceptable Path (70%)**: Good choices with room for improvement
- **Poor Path (40%)**: Suboptimal choices requiring review

### 4. **Replay & Learn**
- Try different paths to explore alternative approaches
- See how different choices affect outcomes
- Build decision-making skills through experimentation

## User Experience

### During Practice

When a trigger phrase is detected (e.g., "too expensive"):

1. **Pause**: Conversation pauses automatically
2. **Present**: Choice overlay displays 3-4 options
3. **Preview**: Each option shows its quality indicator
4. **Select**: Choose your approach
5. **Continue**: Conversation resumes with AI responding to your choice

### After Practice

The Results page shows:

1. **Path Score**: Overall quality of decisions made
2. **Decision Tree**: Visual map of all nodes and choices
3. **Chosen Path**: Highlighted route you took
4. **Alternative Paths**: What you could have chosen
5. **Replay Option**: Try again with different choices

## For Administrators

### Creating Branching Scenarios

Scenarios with branching points use a JSON structure in the `branching_points` column:

```json
{
  "nodes": [
    {
      "id": "price_objection",
      "trigger": "too expensive|too much|cheaper",
      "trigger_type": "keyword",
      "description": "Customer expresses price concern",
      "choices": [
        {
          "id": "empathize_value",
          "text": "Empathize and explain value proposition",
          "next_node": "value_discussion",
          "score_modifier": 1.0,
          "ai_context": "Customer chose to emphasize value...",
          "outcome_type": "optimal"
        },
        {
          "id": "immediate_discount",
          "text": "Offer an immediate discount",
          "next_node": "discount_negotiation",
          "score_modifier": 0.7,
          "ai_context": "Customer immediately offered discount...",
          "outcome_type": "acceptable"
        }
      ]
    }
  ]
}
```

### Node Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for this node |
| `trigger` | string | Keywords/phrases that trigger this node (pipe-separated) |
| `trigger_type` | string | Type: `keyword`, `time`, or `score` |
| `description` | string | What decision point is this? |
| `choices` | array | Array of choice objects |

### Choice Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for this choice |
| `text` | string | Display text shown to user |
| `next_node` | string/null | ID of next node, or null to continue |
| `score_modifier` | number | Score multiplier (0.4 to 1.0) |
| `ai_context` | string | Context to send to AI after this choice |
| `outcome_type` | string | `optimal`, `acceptable`, or `poor` |

### Trigger Types

#### Keyword Triggers
Most common. Triggers when specific words/phrases are detected:
```json
"trigger": "too expensive|cost|price|cheaper",
"trigger_type": "keyword"
```

#### Time Triggers
Triggers at specific time in conversation:
```json
"trigger": "60",
"trigger_type": "time",
"trigger_value": "seconds"
```

#### Score Triggers
Triggers based on current performance:
```json
"trigger": "low",
"trigger_type": "score",
"trigger_value": "< 60"
```

### Best Practices

1. **Clear Choices**: Make each option distinct and understandable
2. **Realistic Options**: Include choices trainees would actually consider
3. **Varied Difficulty**: Mix obvious and nuanced decision points
4. **Contextual AI**: Write specific AI context for each choice
5. **Progressive Complexity**: Start simple, increase difficulty
6. **2-4 Nodes**: Don't overwhelm; 2-4 decision points per scenario
7. **Avoid Dead Ends**: All paths should lead to completion
8. **Test Thoroughly**: Try all paths to ensure they work

### Example Scenarios

#### Sales: Price Objection
Nodes:
1. Initial objection handling (empathize vs. discount vs. dismiss)
2. Value discussion (warranty vs. payment plan vs. rush close)
3. Final negotiation (conditional discount vs. stand firm)

#### Service: Angry Customer
Nodes:
1. Initial response (apologize vs. defend vs. investigate)
2. Solution proposal (full refund vs. partial credit vs. free service)
3. Relationship repair (follow-up vs. no action)

#### Retention: Cancellation Request
Nodes:
1. Reason discovery (ask why vs. offer discount immediately)
2. Retention offer (discount vs. upgrade vs. pause service)
3. Closing (confirm retention vs. process cancellation gracefully)

## Technical Architecture

### Database Schema

#### `scenario_templates.branching_points`
JSONB column storing node/choice structure

#### `session_branch_choices`
Tracks individual choices made during sessions
- `session_id`: Links to training_sessions
- `node_id`: Which decision point
- `choice_id`: Which choice was selected
- `score_modifier`: Score impact of this choice
- `timestamp`: When choice was made

#### `training_sessions` additions
- `branch_path_score`: Average score of all choices
- `branch_path_quality`: Overall path quality (optimal/acceptable/poor)
- `branches_taken`: Count of branches encountered

### API Endpoints

#### `POST /api/training/session/:id/branch-choice`
Record a branch choice
```json
{
  "node_id": "price_objection",
  "choice_id": "empathize_value",
  "choice_text": "Empathize and explain value",
  "score_modifier": 1.0
}
```

#### `GET /api/training/session/:id/branch-choices`
Get all branch choices for a session
```json
{
  "choices": [...],
  "pathScore": 0.85,
  "pathQuality": "optimal"
}
```

#### `GET /api/generated-scenarios/:id/branching`
Get branching points for a scenario
```json
{
  "branching_points": {
    "nodes": [...]
  }
}
```

### React Components

#### `BranchingChoice.jsx`
Modal overlay displaying choice options
- Shows decision point description
- Lists all choices with quality indicators
- Handles selection and confirmation
- Animates in/out smoothly

#### `DecisionTreeVisualization.jsx`
Post-session visualization
- Shows all nodes in tree format
- Highlights chosen path
- Displays alternative options (dimmed)
- Shows path quality summary
- Provides replay button

#### `useBranchingLogic` Hook
Manages branching state and logic
- Monitors transcript for triggers
- Tracks path taken
- Calculates path score
- Handles choice selection
- Saves final score

### Integration Points

#### Training.jsx
- Fetches branching points on load
- Initializes branching hook
- Displays BranchingChoice overlay
- Saves path score on call end
- Passes data to results page

#### Results.jsx
- Displays DecisionTreeVisualization
- Shows path quality in overall results
- Provides replay functionality

## Analytics & Insights

### Available Metrics

1. **Path Popularity**: Which paths are most commonly taken
2. **Path Success**: Correlation between path and overall score
3. **Choice Timing**: How long users take to make decisions
4. **Path Completion**: How many users finish branching scenarios
5. **Replay Rate**: How often users try different paths

### Query Examples

#### Most popular choices
```sql
SELECT
  node_id,
  choice_id,
  COUNT(*) as selection_count
FROM session_branch_choices
GROUP BY node_id, choice_id
ORDER BY selection_count DESC;
```

#### Average path scores by scenario
```sql
SELECT
  st.name,
  AVG(ts.branch_path_score) as avg_path_score,
  COUNT(*) as session_count
FROM training_sessions ts
JOIN scenario_templates st ON ts.scenario_id = st.id
WHERE ts.branch_path_score IS NOT NULL
GROUP BY st.name
ORDER BY avg_path_score DESC;
```

#### User path quality distribution
```sql
SELECT
  branch_path_quality,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM training_sessions
WHERE branch_path_quality IS NOT NULL
GROUP BY branch_path_quality;
```

## Troubleshooting

### Issue: Branching not triggering

**Possible Causes**:
1. Trigger keywords don't match conversation
2. Scenario doesn't have branching_points set
3. Transcript not being monitored correctly

**Solutions**:
- Check trigger keywords are relevant
- Verify JSON structure is valid
- Check browser console for errors

### Issue: Choices not recording

**Possible Causes**:
1. Session ID not set correctly
2. Database permissions issue
3. Network error during save

**Solutions**:
- Verify session created successfully
- Check RLS policies
- Monitor network tab for errors

### Issue: Visualization not showing

**Possible Causes**:
1. Path data not passed to results page
2. Component not rendering
3. Data format mismatch

**Solutions**:
- Check lastResults contains branchPath
- Verify branchingPoints structure
- Check React component errors

### Issue: AI not responding to choice context

**Possible Causes**:
1. AI context not properly integrated
2. Context too vague
3. AI model limitations

**Solutions**:
- Make AI context more explicit
- Include specific customer behavior instructions
- Test with different phrasings

## Performance Considerations

### Optimization Tips

1. **Lazy Loading**: Only fetch branching points when needed
2. **Debounce Triggers**: Avoid rapid-fire trigger checks
3. **Caching**: Cache branching points in session
4. **Batch Writes**: Queue choice recordings
5. **Indexed Queries**: Ensure proper database indexes

### Expected Load

- **Trigger Check**: ~100ms per transcript update
- **Choice Display**: <500ms to render
- **Choice Recording**: <1s to save
- **Visualization**: <2s to render full tree
- **Database Size**: ~100 bytes per choice

## Future Roadmap

### Phase 2 Enhancements
- [ ] AI-driven trigger detection (semantic, not keyword)
- [ ] Multi-dimensional scoring (ethics, speed, accuracy)
- [ ] Branch recommendations based on user history
- [ ] Team analytics for branch performance
- [ ] Custom branch builder UI for managers

### Phase 3 Advanced Features
- [ ] Conditional branching (path depends on previous choices)
- [ ] Dynamic branching (AI generates options on the fly)
- [ ] Collaborative scenarios (manager can join and observe)
- [ ] Branch templates library
- [ ] A/B testing for different branch structures

## Support

For questions or issues:
- Check the test plan: `BRANCHING_TEST_PLAN.md`
- Review database migration: `supabase-migrations/023_branching_paths.sql`
- Contact development team
- File an issue in project repository

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
**Author**: Development Team
