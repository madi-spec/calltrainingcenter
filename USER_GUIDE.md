# CSR Training Simulator - User Guide

## What Is This Platform?

The CSR Training Simulator is an **AI-powered voice training platform** for customer service representatives. Users practice handling realistic customer scenarios through live voice conversations with an AI customer, then receive detailed coaching feedback on their performance.

---

## Quick Start Guide

### For Trainees (Daily Users)

1. **Log in** to see your Dashboard
2. **Check "Today's Practice"** card - shows how many calls you need to complete today (default: 5)
3. **Click "Start Call"** or go to **Training** in the sidebar
4. **Select a scenario** that matches your skill level (Easy/Medium/Hard)
5. **Review the briefing** - understand who you're talking to and what they want
6. **Click "Start Training Call"** - speak naturally as you would with a real customer
7. **End the call** when finished
8. **Review your coaching feedback** - see your score and specific tips to improve

### For Managers

1. **Dashboard** shows team compliance - who's completing their daily practice
2. **Assign Training** to send specific scenarios to team members with due dates
3. **Reports** shows team performance trends and individual scores
4. **Team Settings** to invite new members and manage roles

### For Admins/Owners

1. **Settings > AI Settings** to customize coaching prompts
2. **Admin page** to set up company info (auto-scrape from website)
3. **Settings > Billing** to manage subscription
4. **Settings > Team** to manage all users and roles

---

## Navigation Guide

| Menu Item | What It Does | Who Can See It |
|-----------|--------------|----------------|
| **Dashboard** | Your stats, daily progress, recent sessions | Everyone |
| **Training** | Browse and start training scenarios | Everyone |
| **My Assignments** | Training assigned to you by managers | Everyone |
| **Assign Training** | Create assignments for team members | Managers+ |
| **Reports** | Performance analytics and trends | Everyone |
| **Leaderboard** | Rankings and gamification | Everyone |
| **Settings** | Profile and preferences | Everyone |
| **Team** | Invite and manage team members | Managers+ |
| **Branches** | Manage office locations | Admins+ |
| **Billing** | Subscription and usage | Admins+ |
| **AI Settings** | Customize AI behavior | Admins+ |

---

## Feature Details

### 1. Dashboard

Your personal command center showing:

- **Stats**: Total points, sessions completed, average score, current streak
- **Today's Practice**: Progress toward daily call quota (dots fill in as you complete calls)
- **My Courses**: Learning paths you're enrolled in
- **My Badges**: Achievements you've earned
- **My Assignments**: Pending training from your manager
- **Recent Sessions**: Your last 5 training calls with scores

**For Managers**, you also see:
- **Team Compliance Grid**: Which team members completed daily practice
- **Team Overview**: Aggregate stats for your team

---

### 2. Training (Scenarios)

**How to complete a training session:**

1. **Browse scenarios** on the Training page
   - Filter by difficulty: Easy, Medium, Hard
   - Search by name or category

2. **Select a scenario** to see the pre-call briefing:
   - **Customer Profile**: Who you're talking to, their personality, emotional state
   - **The Situation**: What happened, why they're calling
   - **Your Objective**: What you need to accomplish
   - **Success Criteria**: What will make the customer happy or upset

3. **Start the call** - your microphone activates and you speak naturally
   - The AI customer responds based on what you say
   - Live transcript shows the conversation
   - Timer tracks call duration

4. **End the call** when the conversation reaches a natural conclusion

5. **Review your results**:
   - **Overall Score**: 0-100% rating
   - **Category Scores**: Empathy, Problem Resolution, Product Knowledge, Professionalism, Scenario-Specific
   - **Strengths**: What you did well (with quotes)
   - **Improvements**: What to work on (with suggested alternatives)
   - **Key Moment**: The pivotal interaction that affected the outcome
   - **Next Steps**: Specific actions to improve

---

### 3. Assignments

**For Trainees:**
- View assignments in **My Assignments**
- See due dates and status (Pending, In Progress, Overdue, Completed)
- Click to start assigned scenarios
- Complete all scenarios in an assignment to mark it done

**For Managers:**
- Go to **Assign Training**
- Click **Create Assignment**
- Select team member(s) and scenario(s)
- Set a due date
- Track completion in the assignments table

---

### 4. Reports

View performance data with filters:

- **Time Range**: Last 7 days, 30 days, 90 days, or year
- **Scope**: My Progress, Team (managers), Organization (admins)

**Metrics shown:**
- Total sessions and trend
- Average score and trend
- Training time (hours)
- Points earned
- Performance by category (5 skill areas)
- Team member breakdown (for managers)

**Export**: Download data as CSV for external analysis

---

### 5. Leaderboard

Gamified rankings to encourage friendly competition:

- **Time periods**: This Week, This Month, All Time
- **Your rank card**: Current position and movement (up/down)
- **Full rankings**: All users sorted by points
- **Medals**: Gold/Silver/Bronze for top 3

**How points work:**
- Earn points for each completed training session
- Higher scores = more points
- Consistent practice (streaks) helps you climb

---

### 6. Courses

Structured learning paths with modules:

- **Browse courses** by status: All, In Progress, Completed, Not Started
- **Course cards** show: Name, description, module count, progress %, badge earned
- **Difficulty levels**: Beginner (1 star), Intermediate (2 stars), Advanced (3 stars)
- **Complete all modules** in a course to earn the badge

---

### 7. Settings

#### Profile Settings
- Update your name
- Configure notification preferences (email and in-app)

#### Team Settings (Managers+)
- **Invite Member**: Send email invitations to new team members
- **Manage Roles**: Change user roles (Trainee, Manager, Admin)
- **View Status**: See who's active, pending, or inactive

#### Branches (Admins+)
- Add and manage office locations
- Assign users to branches

#### Billing (Admins+)
- View current subscription plan
- See training hours usage
- Download invoices

#### AI Settings (Admins+)
- View and customize AI prompts used for:
  - Scenario agent (how the AI customer behaves)
  - Coaching analysis (how feedback is generated)
- Reset to defaults if needed

---

### 8. Admin Configuration

Access via **Admin** in the sidebar (Admins/Owners only):

#### Website Scraper
1. Enter your company website URL
2. Click **Analyze Website**
3. AI extracts: Logo, company name, phone, services, pricing, service areas
4. Review and click **Apply Configuration**

#### Transcript Loader
1. Paste a real customer call transcript
2. Click **Analyze Transcript**
3. AI identifies: Pain points, suggested scenarios, coaching insights
4. Use insights to create better training

#### Company Info
- Manually edit company details
- Update pricing, services, service areas
- Changes apply to all scenarios

---

## Roles & Permissions

| Role | Can Do |
|------|--------|
| **Trainee** | Complete training, view own stats, access courses, see leaderboard |
| **Manager** | All Trainee abilities + assign training, view team reports, manage team |
| **Admin** | All Manager abilities + organization settings, AI config, billing view |
| **Owner** | Full access to everything including billing management |

---

## Daily Practice & Streaks

- **Daily Quota**: Default is 5 training calls per day
- **Streak**: Consecutive days meeting the quota
- **Dashboard** shows your progress with visual dots
- **Leaderboard** displays streak counts with flame icons
- Missing a day resets your streak to 0

---

## Scoring System

Each training call is scored on 5 categories (0-100 each):

| Category | What It Measures |
|----------|------------------|
| **Empathy & Rapport** | Building connection, acknowledging feelings |
| **Problem Resolution** | Actually solving the customer's issue |
| **Product Knowledge** | Accuracy about services, pricing, policies |
| **Professionalism** | Tone, language, handling difficult moments |
| **Scenario-Specific** | Meeting the particular goals of this scenario |

**Overall Score** is a weighted average of all categories.

**Score Meanings:**
- 90-100%: Excellent
- 80-89%: Great Job
- 70-79%: Good Effort
- 60-69%: Room for Improvement
- Below 60%: Keep Practicing

---

## Tips for Success

### Before the Call
- Read the entire briefing carefully
- Note the customer's emotional state and goals
- Understand what will make them escalate vs. calm down

### During the Call
- Speak naturally - the AI understands conversational speech
- Acknowledge the customer's feelings before jumping to solutions
- Use the customer's name
- Reference your company's specific services and guarantees

### After the Call
- Read ALL the feedback, not just the score
- Pay attention to the "Areas to Improve" section
- Try the suggested alternative responses in your next call
- Practice the same scenario again to improve your score

---

## Troubleshooting

### Microphone not working
- Check browser permissions (click the lock icon in the address bar)
- Make sure no other app is using your microphone
- Try refreshing the page

### Call won't connect
- Check your internet connection
- Try a different browser (Chrome works best)
- Clear browser cache and try again

### Can't see certain menu items
- Your role may not have access (see Roles & Permissions above)
- Contact your admin to update your role if needed

### Scenarios not personalized
- Ask your admin to complete the company setup (Admin > Website Scraper)
- Company info must be configured for personalization to work

---

## Getting Help

- Contact your organization admin for role/access issues
- Check that your company info is configured in Admin settings
- For technical issues, contact platform support

---

*Last updated: January 2026*
