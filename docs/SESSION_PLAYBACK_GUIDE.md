# Session Playback Feature - Implementation Guide

## Overview
This feature adds comprehensive audio playback, synchronized transcript viewing, and timestamped notes to training session history. Users can replay their sessions, jump to specific moments via transcript clicks, and add personal notes at any timestamp.

## Components Implemented

### 1. Database Schema (`supabase-migrations/023_session_notes.sql`)
- **session_notes table**: Stores timestamped notes for sessions
- **Enhanced training_sessions**: Added columns for transcript_with_timestamps, recording_url, and analysis_markers
- **RLS Policies**: Users can only manage their own notes
- **Indexes**: Optimized for timestamp-based queries

### 2. API Endpoints (`api/routes/sessionNotes.js`)
- `GET /api/session-notes/:sessionId` - Fetch all notes for a session
- `POST /api/session-notes/:sessionId` - Create a new note
- `PUT /api/session-notes/:sessionId/:noteId` - Update an existing note
- `DELETE /api/session-notes/:sessionId/:noteId` - Delete a note

### 3. Frontend Components

#### SessionPlayer (`client/src/components/playback/SessionPlayer.jsx`)
Full-featured audio player with:
- Play/pause controls
- Skip backward/forward (10 seconds)
- Progress bar with buffering indicator
- Volume control with mute toggle
- Playback speed control (0.5x - 2x)
- Drag-to-seek functionality
- Time display and duration tracking

#### TranscriptViewer (`client/src/components/playback/TranscriptViewer.jsx`)
Synchronized transcript display with:
- Real-time highlighting based on audio position
- Click-to-jump to any transcript segment
- Visual markers for mistakes (red), successes (green), objections (yellow)
- Auto-scroll to follow active segment
- Speaker identification (Agent vs. Customer)
- Timestamp display for each segment

#### NotesPanel (`client/src/components/playback/NotesPanel.jsx`)
Personal note-taking interface with:
- Add notes at current playback position
- Note type categorization (Personal, Mistake, Success, Question, Objection)
- Edit and delete existing notes
- Click note timestamp to jump to that moment
- Persistent storage in database
- Color-coded note types

### 4. Session Playback Page (`client/src/pages/training/SessionPlayback.jsx`)
Complete playback experience combining:
- Audio player
- Transcript viewer (2/3 width)
- Notes panel (1/3 width)
- Session metadata (score, duration, date)
- Performance breakdown
- Strengths and improvements summary

### 5. Updated Session History (`client/src/pages/training/SessionHistory.jsx`)
- Added "Watch Replay" button for sessions with recordings
- Links directly to playback view

## Installation

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- supabase-migrations/023_session_notes.sql
```

### 2. Update API Routes
The sessionNotes route is automatically registered in `api/index.js`.

### 3. Client Routing
The `/playback/:sessionId` route is registered in `client/src/App.jsx`.

## Usage Flow

### User Journey
1. User completes a training session with recording enabled
2. Session appears in History with "Watch Replay" button
3. Click "Watch Replay" to open SessionPlayback page
4. Audio player loads with synchronized transcript
5. User can:
   - Play/pause and control playback
   - Click any transcript line to jump to that timestamp
   - Add personal notes at specific moments
   - View AI-identified markers (mistakes, successes, objections)
   - Review performance breakdown

### Recording Setup
For recordings to be available, ensure:
1. Training sessions have `recording_url` or `recording_id` set
2. Call recordings are stored in the `call_recordings` table
3. Audio URLs are accessible (signed URLs for Supabase Storage)

## Data Flow

### Audio Playback Synchronization
```
Audio Element → timeupdate event
              → currentTime state
              → TranscriptViewer (highlight active segment)
              → NotesPanel (current position for new notes)
```

### Transcript Click-to-Jump
```
User clicks transcript segment
              → onSeek(timestamp)
              → SessionPlayer updates audio.currentTime
              → Audio jumps to timestamp
```

### Notes Persistence
```
User adds note → POST /api/session-notes/:sessionId
              → Saved to database with user_id + session_id
              → Returned to NotesPanel
              → Displayed in sorted order
```

## Analysis Markers

The `analysis_markers` JSONB field in training_sessions stores timestamps for:
- **mistakes**: Red borders on transcript segments
- **successes**: Green borders on transcript segments
- **objections**: Yellow borders on transcript segments

Example structure:
```json
{
  "mistakes": [45, 120, 215],
  "successes": [30, 90, 180],
  "objections": [60, 150]
}
```

## Testing Checklist

### Audio Player
- [ ] Audio loads and plays without errors
- [ ] Play/pause toggle works correctly
- [ ] Skip back/forward buttons work (10 seconds each)
- [ ] Progress bar updates in real-time
- [ ] Click progress bar to seek works
- [ ] Drag progress bar to seek works
- [ ] Volume slider controls audio level
- [ ] Mute button works
- [ ] Playback speed cycles through 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- [ ] Time displays show correct current/duration
- [ ] Buffering indicator shows loading progress

### Transcript Viewer
- [ ] Transcript segments display correctly
- [ ] Current segment highlights in real-time
- [ ] Clicking transcript segment jumps audio to timestamp
- [ ] Auto-scroll follows active segment
- [ ] Speaker icons/colors show correctly (Agent vs Customer)
- [ ] Visual markers (red/green/yellow) display for analysis points
- [ ] Timestamps format correctly (MM:SS)

### Notes Panel
- [ ] "Add Note" button opens form
- [ ] Note type selector works (Personal, Mistake, Success, Question, Objection)
- [ ] Text input accepts multiline notes
- [ ] Current timestamp displays correctly
- [ ] "Save Note" persists to database
- [ ] New notes appear in sorted order
- [ ] Edit button loads note for editing
- [ ] Update saves changes correctly
- [ ] Delete removes note from list
- [ ] Clicking note timestamp jumps audio

### Integration Tests
- [ ] Page loads without errors for valid session ID
- [ ] Error message shows for invalid session ID
- [ ] Recording loads if available
- [ ] Fallback message shows if no recording
- [ ] All components sync on currentTime updates
- [ ] Notes reload after page refresh
- [ ] Performance breakdown displays correctly
- [ ] Strengths/improvements sections populate

### Mobile Responsive
- [ ] Audio player controls are accessible on mobile
- [ ] Transcript scrolls properly on small screens
- [ ] Notes panel is usable on mobile
- [ ] Grid layout stacks properly on mobile

### Performance
- [ ] No audio/transcript drift over long sessions (30+ min)
- [ ] Smooth scrolling without lag
- [ ] Notes load quickly even with many entries
- [ ] Audio buffering is efficient

## API Response Examples

### GET /api/training/session/:sessionId
```json
{
  "session": {
    "id": "uuid",
    "scenario_name": "Angry Customer - Escalation",
    "overall_score": 82,
    "duration_seconds": 360,
    "created_at": "2025-01-15T10:30:00Z",
    "recording_url": "https://...",
    "transcript_formatted": [...],
    "analysis_markers": {
      "mistakes": [45, 120],
      "successes": [90, 180],
      "objections": [60]
    },
    "category_scores": {
      "empathy": 85,
      "problem_solving": 78,
      "communication": 88
    },
    "strengths": [...],
    "improvements": [...]
  }
}
```

### GET /api/session-notes/:sessionId
```json
{
  "notes": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "user_id": "uuid",
      "timestamp_seconds": 45,
      "note_text": "Remember to acknowledge frustration first",
      "note_type": "mistake",
      "created_at": "2025-01-15T11:00:00Z",
      "updated_at": "2025-01-15T11:00:00Z"
    }
  ]
}
```

### POST /api/session-notes/:sessionId
```json
{
  "timestamp_seconds": 90,
  "note_text": "Great use of empathy here",
  "note_type": "success"
}
```

## Troubleshooting

### Audio Not Playing
- Check if recording_url is valid and accessible
- Verify CORS settings allow audio loading
- Check browser console for CORS or network errors
- Ensure audio format is supported (MP3, WAV, OGG)

### Transcript Not Syncing
- Verify transcript has timestamp data
- Check transcript format matches expected structure
- Ensure currentTime updates are propagating
- Look for console errors in TranscriptViewer

### Notes Not Saving
- Check authentication token is valid
- Verify sessionId exists in database
- Check network tab for API errors
- Ensure user has permission to access session

### Performance Issues
- Large transcripts (>500 segments) may need pagination
- Consider virtualizing transcript list for very long sessions
- Optimize re-renders by memoizing components
- Check for memory leaks in audio event listeners

## Future Enhancements

### Potential Improvements
1. **Collaborative Notes**: Share notes with team members
2. **Note Export**: Export notes to PDF or markdown
3. **Bookmark System**: Quick bookmarks separate from notes
4. **Waveform Visualization**: Visual audio waveform display
5. **Keyboard Shortcuts**: Space for play/pause, arrow keys for seek
6. **Transcript Search**: Find specific words/phrases in transcript
7. **Speed Presets**: Custom playback speed preferences
8. **Audio Download**: Download recording for offline review
9. **Clips**: Create and share specific segments
10. **Coach Comments**: Allow managers to add feedback at timestamps

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database migrations ran successfully
3. Test with a known working session
4. Check API logs for backend errors
5. Review network tab for failed requests

## Credits

Built with:
- React for UI components
- Framer Motion for animations
- Lucide React for icons
- HTML5 Audio API for playback
- Supabase for database and storage
