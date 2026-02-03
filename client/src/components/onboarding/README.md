# Onboarding Tutorial System

This directory contains the interactive onboarding tutorial system for first-time users.

## Components

### OnboardingTour.jsx
Main component that implements the guided tour using React Joyride. Features:
- Multi-step tutorial with customized content
- Skip and Next navigation buttons
- Progress indicator
- Branded styling matching the app theme

## Hooks

### useOnboarding.js (in `/hooks`)
Custom hook for managing onboarding state:
- Checks if user has completed onboarding
- Provides methods to complete or reset onboarding
- Manages session storage to prevent showing tour multiple times per session

## Database Setup

Before using the onboarding system, you need to run the database migration:

```bash
# Connect to your Supabase database and run:
psql <your-database-connection-string> -f api/migrations/add_onboarding_completed.sql
```

Or run it directly in the Supabase SQL Editor:
```sql
-- See api/migrations/add_onboarding_completed.sql
```

## API Endpoints

### PATCH /api/users/onboarding-complete
Marks the current user's onboarding as complete.

**Authentication:** Required
**Body:** None
**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "user": { ... }
}
```

## Usage

The onboarding tour is automatically integrated into the AgentDashboard component:

```jsx
import OnboardingTour from '../../components/onboarding/OnboardingTour';
import { useOnboarding } from '../../hooks/useOnboarding';

function Dashboard() {
  const { shouldShowTour, completeOnboarding } = useOnboarding();

  return (
    <>
      <OnboardingTour
        run={shouldShowTour}
        onComplete={completeOnboarding}
      />
      {/* Rest of dashboard */}
    </>
  );
}
```

## Tour Steps

1. **Welcome Message** - Introduces the platform
2. **Gamification** - Explains points, badges, and achievements
3. **Statistics** - Shows performance tracking features
4. **Courses** - Points to training course catalog
5. **Start Practice** - Highlights the main action button
6. **Leaderboard** - Explains competition features
7. **Completion** - Final message with key takeaways

## Testing

To test the onboarding tour:

1. Create a new test user account
2. Login for the first time
3. The tour should automatically appear on the dashboard
4. Test the "Skip" button - it should hide the tour
5. Test the "Next" button - it should navigate through steps
6. Complete the tour and verify it doesn't appear again
7. Check that `onboarding_completed` is set to `true` in the database

### Reset Onboarding for Testing

To reset onboarding for a user (useful during development):

```javascript
// In browser console while logged in:
const { resetOnboarding } = useOnboarding();
await resetOnboarding();
```

Or directly in the database:
```sql
UPDATE users SET onboarding_completed = false WHERE id = '<user-id>';
```

## Customization

### Styling
The tour uses custom styles defined in the `styles` prop of the Joyride component. Colors are matched to the app's theme:
- Primary color: `#6366f1` (primary-600)
- Text color: `#1f2937` (gray-800)
- Background: `#ffffff`

### Adding Steps
To add a new step to the tour, add an object to the `steps` array:

```javascript
{
  target: '[data-tutorial="my-feature"]', // CSS selector
  content: (
    <div>
      <h3>Feature Title</h3>
      <p>Feature description</p>
    </div>
  ),
  placement: 'bottom', // top, bottom, left, right, center
  disableBeacon: true,
}
```

Make sure to add `data-tutorial="my-feature"` to the element you want to highlight.

## Dependencies

- `react-joyride`: ^2.8.2 - Core library for guided tours
- React 18+
- Tailwind CSS for styling

## Browser Support

The onboarding system works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Tour is keyboard navigable
- Screen reader friendly
- High contrast text for readability
- Focus management handled by Joyride
