# Onboarding Tour Steps - Visual Guide

## Step 1: Welcome Message
**Position**: Center of screen
**Type**: Modal overlay

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                  Welcome to CSR Training! 👋           │
│                                                         │
│   Let's take a quick tour to help you get started      │
│   with your customer service training journey.         │
│   This will only take a minute!                        │
│                                                         │
│   [Skip Tour]                              [Next]      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Step 2: Gamification & Achievements
**Position**: Left of badges section
**Target**: `[data-tutorial="gamification"]`

```
Dashboard Layout:
┌─────────────────────────────────────────────────────────┐
│  Welcome back, John!                                    │
│  🔥 3 day streak   ⚡ Level 5   ⭐ 1,234 pts           │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌────────────────────────────┐
│  Today's Practice    │  │  Gamification &           │◄── Tour Step
│  🎯 2/5 calls        │  │  Achievements 🏆          │
│  [Start Next Call]   │  │                           │
└──────────────────────┘  │  Track your progress      │
                          │  with points, badges,     │
┌──────────────────────┐  │  and achievements.        │
│  My Courses          │  │                           │
└──────────────────────┘  │  [Skip]        [Next]    │
                          └────────────────────────────┘
```

---

## Step 3: Your Statistics
**Position**: Top of stats grid
**Target**: `[data-tutorial="dashboard-stats"]`

```
                          ┌────────────────────────────┐
                          │  Your Statistics 📊       │
                          │                           │
                          │  Monitor your total       │
                          │  sessions, average scores,│
                          │  streaks, and badges.     │
                          │                           │
                          │  [Back]  [Skip]  [Next]  │
                          └────────────────────────────┘
                                       ▼
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total        │ Avg Score    │ Best Streak  │ Badges       │
│ Sessions     │              │              │              │
│ 🎯 42        │ 📈 87%       │ 🔥 12 days   │ 🏆 6         │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Step 4: Browse Training Courses
**Position**: Bottom of "View all" link
**Target**: `a[href="/courses"]`

```
┌──────────────────────────────────────────────────────────┐
│  My Courses                          View all ◄────────┐ │
│                                                       │ │
│  📚 Customer Service Basics      [Progress: 60%]    │ │
│  📚 Advanced Techniques          [Progress: 30%]    │ │
│  📚 Conflict Resolution          [Progress: 0%]     │ │
└────────────────────────────────────────────────────┼───┘
                                                     │
                          ┌──────────────────────────┘
                          │
                          ▼
             ┌────────────────────────────┐
             │  Browse Courses 📚        │
             │                           │
             │  Explore available        │
             │  training courses and     │
             │  scenarios. Click here!   │
             │                           │
             │  [Back]  [Skip]  [Next]  │
             └────────────────────────────┘
```

---

## Step 5: Start Your Practice
**Position**: Left of practice button
**Target**: `.bg-primary-600.animate-pulse` or `.bg-primary-600`

```
┌──────────────────────────────────────────────────────────┐
│  Today's Practice                                        │
│  🎯 2/5 calls completed                                  │
│                                                          │
│  ● ● ○ ○ ○   2 / 5 calls                               │
│                                                          │
│                               ┌────────────┐            │
│                               │ Start Next │◄───────┐   │
│                               │    Call    │        │   │
│                               │    ▶       │        │   │
│                               └────────────┘        │   │
└─────────────────────────────────────────────────────┼───┘
                                                      │
                          ┌───────────────────────────┘
                          │
                          ▼
             ┌────────────────────────────┐
             │  Start Your Practice 🎯   │
             │                           │
             │  Ready to begin? Click    │
             │  this button to start a   │
             │  training session.        │
             │                           │
             │  [Back]  [Skip]  [Next]  │
             └────────────────────────────┘
```

---

## Step 6: Leaderboard & Competition
**Position**: Bottom of leaderboard link
**Target**: `a[href="/leaderboard"]`

```
┌──────────────────────────────────────────────────────────┐
│  My Badges                      Leaderboard ◄────────┐   │
│                                                      │   │
│  🏅 First Steps    🏅 Quick Start    🏅 Streak 3    │   │
│  🏅 Team Player    🏅 Top Score      🏅 Dedicated   │   │
│                                                      │   │
└──────────────────────────────────────────────────────┼───┘
                                                       │
                          ┌────────────────────────────┘
                          │
                          ▼
             ┌────────────────────────────┐
             │  Leaderboard 🥇           │
             │                           │
             │  See how you rank against │
             │  other trainees. Compete  │
             │  for the top spot!        │
             │                           │
             │  [Back]  [Skip]  [Next]  │
             └────────────────────────────┘
```

---

## Step 7: You're All Set!
**Position**: Center of screen
**Type**: Modal overlay

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                  You're All Set! 🎉                     │
│                                                         │
│   You're ready to start your training journey.         │
│   Remember:                                             │
│                                                         │
│   ✅ Complete daily practice calls to build streak     │
│   ✅ Earn points and badges as you progress            │
│   ✅ Track your improvement with detailed stats        │
│   ✅ Compete on the leaderboard                        │
│                                                         │
│   Good luck, John!                                      │
│                                                         │
│   [Back]                               [Finish]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Tour Navigation

### Buttons Available
- **Skip Tour**: Available on all steps, immediately completes tour
- **Back**: Available on steps 2-7, goes to previous step
- **Next**: Available on steps 1-6, advances to next step
- **Finish**: Available on step 7, completes tour

### Progress Indicator
Shows at top of each tooltip: "Step X of 7"

```
Step 1 of 7  [●○○○○○○]
Step 2 of 7  [●●○○○○○]
Step 3 of 7  [●●●○○○○]
Step 4 of 7  [●●●●○○○]
Step 5 of 7  [●●●●●○○]
Step 6 of 7  [●●●●●●○]
Step 7 of 7  [●●●●●●●]
```

---

## Styling Details

### Colors
- **Primary**: #6366f1 (Indigo/Primary-600)
- **Text**: #1f2937 (Gray-800)
- **Background**: #ffffff (White)
- **Overlay**: rgba(0, 0, 0, 0.5) (50% black)

### Typography
- **Heading**: 24px, bold
- **Subheading**: 18px, bold
- **Body**: 14px, regular
- **Line height**: 1.5 (relaxed)

### Spacing
- **Tooltip padding**: 24px
- **Button padding**: 10px 20px
- **Border radius**: 12px (rounded-xl)

### Animations
- **Fade in**: 300ms ease-in-out
- **Tooltip appear**: Smooth slide from placement direction
- **Beacon pulse**: Continuous pulse animation on highlighted elements

---

## Responsive Behavior

### Desktop (≥768px)
- Tooltips positioned optimally (left, right, top, bottom)
- Full-width content visible
- All elements easily accessible

### Mobile (<768px)
- Tooltips adjust to fit screen
- Center placement for modal steps (1, 7)
- Touch-friendly button sizes
- Vertical layout for multi-column sections

### Tablet (768px - 1024px)
- Hybrid positioning
- Optimized tooltip placement
- Readable text sizes

---

## Accessibility Features

### Keyboard Navigation
- **Enter/Space**: Activate buttons
- **Tab**: Navigate between buttons
- **Escape**: Close tour (same as Skip)

### Screen Readers
- Proper ARIA labels on all elements
- Step announcements
- Button purpose descriptions
- Landmark navigation

### Visual
- High contrast text
- Large, tappable buttons
- Clear focus indicators
- Readable font sizes (14px minimum)

---

## Technical Notes

### Target Selectors
```javascript
// CSS Selector targeting
'[data-tutorial="gamification"]'  // Badges section
'[data-tutorial="dashboard-stats"]' // Stats grid
'a[href="/courses"]'               // Courses link
'.bg-primary-600'                  // Practice button
'a[href="/leaderboard"]'           // Leaderboard link
'body'                             // Center modals
```

### Placement Options
- `center`: Full-screen modal
- `left`: Tooltip on left side
- `right`: Tooltip on right side
- `top`: Tooltip above element
- `bottom`: Tooltip below element

### Beacon
Set to `disableBeacon: true` on all steps to prevent the pulsing beacon before tooltip appears.

---

## Customization Examples

### Add a New Step
```javascript
{
  target: '[data-tutorial="new-feature"]',
  content: (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        New Feature! ✨
      </h3>
      <p className="text-gray-700 text-sm leading-relaxed">
        This is a new feature we want to highlight.
      </p>
    </div>
  ),
  placement: 'bottom',
  disableBeacon: true,
}
```

### Change Step Order
Simply reorder items in the `steps` array. Progress indicator updates automatically.

### Skip Certain Steps
Use conditional logic:
```javascript
const steps = [
  // Always shown
  { target: 'body', content: 'Welcome!', ... },
  // Only for admins
  ...(userRole === 'admin' ? [{
    target: '[data-tutorial="admin-panel"]',
    content: 'Admin features...',
  }] : []),
  // Always shown
  { target: 'body', content: 'Done!', ... },
];
```

---

**Note**: This guide shows the conceptual layout. Actual positioning may vary based on viewport size and element locations.
