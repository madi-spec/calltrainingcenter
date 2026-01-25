# CSR Training Simulator - Complete Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Reference](#api-reference)
7. [Frontend Architecture](#frontend-architecture)
8. [Core Features](#core-features)
9. [AI Integration](#ai-integration)
10. [Billing & Subscriptions](#billing--subscriptions)
11. [Gamification System](#gamification-system)
12. [Environment Configuration](#environment-configuration)
13. [Deployment](#deployment)

---

## Overview

The CSR Training Simulator is a multi-tenant SaaS platform designed for pest control companies to train their customer service representatives. It provides AI-powered voice simulations where trainees practice handling realistic customer scenarios, receive real-time coaching feedback, and track their progress through gamification elements.

### Key Features
- **AI-Powered Voice Calls**: Real-time voice conversations with AI customers via Retell
- **Intelligent Coaching**: Claude AI analyzes calls and provides detailed feedback
- **Multi-Tenant Architecture**: Each organization has isolated data and customization
- **Role-Based Access Control**: Trainee, Manager, Admin, and Owner roles
- **Gamification**: Points, badges, streaks, and leaderboards
- **Usage-Based Billing**: Stripe integration with overage billing
- **Custom Branding**: Organizations can customize prompts and company data

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| Vite | 5.x | Build Tool & Dev Server |
| Tailwind CSS | 3.x | Styling |
| Framer Motion | 10.x | Animations |
| React Router | 6.x | Routing |
| Clerk React | 4.x | Authentication UI |
| Lucide React | - | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.x | API Framework |
| Node.js | 18.x+ | Runtime |
| Vercel | - | Serverless Deployment |

### Database & Auth
| Technology | Purpose |
|------------|---------|
| Supabase (PostgreSQL) | Database, Row Level Security |
| Clerk | Authentication, User Management |

### AI & Voice
| Technology | Purpose |
|------------|---------|
| Retell AI | Voice conversation engine |
| Claude (Anthropic) | Coaching analysis, content extraction |

### Payments
| Technology | Purpose |
|------------|---------|
| Stripe | Subscriptions, metered billing, invoices |

---

## Project Structure

```
csr-training-simulator/
├── api/                          # Express API (Vercel Serverless)
│   ├── index.js                  # Main API entry point
│   ├── lib/                      # Shared libraries
│   │   ├── auth.js               # Authentication middleware
│   │   ├── permissions.js        # RBAC permission system
│   │   ├── stripe.js             # Stripe integration
│   │   └── supabase.js           # Supabase client configuration
│   ├── routes/                   # Route handlers
│   │   ├── auth.js               # Authentication routes
│   │   ├── assignments.js        # Training assignments
│   │   ├── billing.js            # Stripe billing
│   │   ├── branches.js           # Branch management
│   │   ├── gamification.js       # Points, badges, leaderboard
│   │   ├── notifications.js      # In-app notifications
│   │   ├── reports.js            # Analytics & reporting
│   │   ├── suites.js             # Training suites
│   │   ├── training.js           # Training sessions
│   │   └── users.js              # User management
│   └── .env                      # Environment variables
│
├── client/                       # React Frontend
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   │   ├── ui/               # Base UI components
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   └── Toast.jsx
│   │   │   ├── scenarios/        # Scenario display components
│   │   │   ├── coaching/         # Feedback visualization
│   │   │   ├── gamification/     # Points, badges display
│   │   │   ├── Layout.jsx        # Main layout with sidebar
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── context/              # React Context providers
│   │   │   ├── AuthContext.jsx   # Authentication state
│   │   │   ├── OrganizationContext.jsx
│   │   │   ├── ConfigContext.jsx # Runtime config
│   │   │   ├── NotificationContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   │
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── useRetellCall.js  # Retell call management
│   │   │
│   │   ├── pages/                # Page components
│   │   │   ├── Home.jsx          # Scenario browser
│   │   │   ├── PreCall.jsx       # Pre-call setup
│   │   │   ├── Training.jsx      # Active call UI
│   │   │   ├── Results.jsx       # Call results
│   │   │   ├── Admin.jsx         # Admin panel
│   │   │   ├── Builder.jsx       # Scenario builder
│   │   │   ├── dashboard/
│   │   │   ├── assignments/
│   │   │   ├── training/
│   │   │   ├── reports/
│   │   │   ├── leaderboard/
│   │   │   ├── settings/
│   │   │   └── auth/
│   │   │
│   │   ├── styles/
│   │   │   └── index.css         # Tailwind imports
│   │   │
│   │   ├── App.jsx               # Main app with routes
│   │   └── main.jsx              # Entry point
│   │
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env
│
├── server/                       # Additional backend services
│   ├── services/
│   │   ├── claude.js             # Claude AI integration
│   │   ├── retell.js             # Retell voice services
│   │   ├── prompts.js            # Prompt templates
│   │   └── scraper.js            # Web scraping
│   ├── routes/
│   └── utils/
│
├── docs/                         # Documentation
├── scripts/                      # Utility scripts
├── vercel.json                   # Vercel configuration
├── package.json
└── DOCUMENTATION.md              # This file
```

---

## Database Schema

### Organizations Table
Primary tenant table for multi-tenancy.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  colors JSONB DEFAULT '{}',
  services TEXT[],
  service_areas TEXT[],
  pricing JSONB DEFAULT '{}',
  guarantees TEXT[],
  value_propositions TEXT[],
  business_hours TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'trialing',
  subscription_plan TEXT,
  training_hours_included INTEGER DEFAULT 10,
  training_hours_used DECIMAL DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Settings JSONB Structure:**
```json
{
  "aiModel": "claude-sonnet-4-20250514",
  "customPromptAdditions": "",
  "scoringWeights": {
    "empathyRapport": 20,
    "problemResolution": 25,
    "productKnowledge": 20,
    "professionalism": 15,
    "scenarioSpecific": 20
  },
  "voicePreferences": {
    "defaultVoiceId": "11labs-Brian",
    "allowedVoices": []
  },
  "customPrompts": {
    "agent": "custom template...",
    "coaching": {
      "system": "custom system prompt...",
      "user": "custom user prompt..."
    }
  }
}
```

### Users Table
User profiles linked to Clerk authentication.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'trainee' CHECK (role IN ('trainee', 'manager', 'admin', 'owner')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  preferences JSONB DEFAULT '{}',
  last_training_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Branches Table
Office locations within an organization.

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  is_primary BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Training Sessions Table
Records of completed training calls.

```sql
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  scenario_id TEXT NOT NULL,
  assignment_id UUID REFERENCES training_assignments(id),
  retell_call_id TEXT,
  retell_agent_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  transcript_raw TEXT,
  transcript_formatted JSONB,
  overall_score INTEGER,
  category_scores JSONB,
  strengths JSONB,
  improvements JSONB,
  key_moment JSONB,
  summary TEXT,
  next_steps JSONB,
  points_earned INTEGER DEFAULT 0,
  badges_earned JSONB DEFAULT '[]',
  billable_minutes DECIMAL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Training Suites Table
Collections of scenarios for structured training.

```sql
CREATE TABLE training_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'custom' CHECK (type IN ('onboarding', 'retraining', 'certification', 'custom')),
  scenario_ids TEXT[],
  scenario_order TEXT[] DEFAULT '{}',
  passing_score INTEGER DEFAULT 70,
  required_completions INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Training Assignments Table
Assigned training tasks.

```sql
CREATE TABLE training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  suite_id UUID REFERENCES training_suites(id),
  scenario_id TEXT,
  assigned_by UUID REFERENCES users(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  progress JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Badges Table
Achievement badges (system and organization-specific).

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER,
  criteria_config JSONB DEFAULT '{}',
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points_value INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### User Badges Table
Junction table for earned badges.

```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
```

### Point Transactions Table
Audit log for points earned.

```sql
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Usage Records Table
Billing usage tracking.

```sql
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id),
  user_id UUID REFERENCES users(id),
  usage_type TEXT DEFAULT 'training_minutes',
  quantity DECIMAL NOT NULL,
  unit TEXT DEFAULT 'minutes',
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  reported_to_stripe BOOLEAN DEFAULT false,
  stripe_usage_record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Invoices Table
Stripe invoice records.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  amount_due INTEGER,
  amount_paid INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT,
  usage_summary JSONB,
  pdf_url TEXT,
  hosted_invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Notifications Table
In-app notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  channels TEXT[] DEFAULT '{in_app}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Authentication & Authorization

### Authentication Flow (Clerk + Supabase)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────>│    Clerk    │────>│   Supabase  │
│             │     │  (Auth UI)  │     │  (Profile)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       │  1. Sign In       │                    │
       │──────────────────>│                    │
       │                   │                    │
       │  2. JWT Token     │                    │
       │<──────────────────│                    │
       │                   │                    │
       │  3. API Request with JWT              │
       │───────────────────────────────────────>│
       │                   │                    │
       │                   │  4. Verify JWT     │
       │                   │  5. Fetch Profile  │
       │                   │<───────────────────│
       │                   │                    │
       │  6. Response with user data           │
       │<───────────────────────────────────────│
```

### Role Hierarchy

```
owner > admin > manager > trainee
```

### Permission System

```javascript
// Permission Categories
const PERMISSIONS = {
  // Training
  'training:start': true,
  'training:view_own': true,
  'training:view_team': true,
  'training:view_all': true,

  // Assignments
  'assignments:view_own': true,
  'assignments:view_team': true,
  'assignments:view_all': true,
  'assignments:create': true,
  'assignments:edit': true,
  'assignments:delete': true,

  // Training Suites
  'suites:view': true,
  'suites:create': true,
  'suites:edit': true,
  'suites:delete': true,

  // Users
  'users:view_own': true,
  'users:view_team': true,
  'users:view_all': true,
  'users:invite': true,
  'users:edit': true,
  'users:delete': true,
  'users:change_role': true,

  // Branches
  'branches:view': true,
  'branches:create': true,
  'branches:edit': true,
  'branches:delete': true,

  // Reports
  'reports:view_own': true,
  'reports:view_team': true,
  'reports:view_all': true,
  'reports:export': true,

  // Billing
  'billing:view': true,
  'billing:manage': true,

  // Settings
  'settings:view': true,
  'settings:edit': true,
  'settings:ai': true,

  // Gamification
  'leaderboard:view': true,
  'badges:view': true,
  'badges:create': true,

  // Notifications
  'notifications:view_own': true,
  'notifications:send': true
};

// Role Permissions
const ROLE_PERMISSIONS = {
  trainee: [
    'training:start', 'training:view_own',
    'assignments:view_own', 'reports:view_own',
    'leaderboard:view', 'badges:view',
    'notifications:view_own'
  ],
  manager: [
    // All trainee permissions plus:
    'training:view_team', 'assignments:view_team',
    'assignments:create', 'assignments:edit',
    'users:view_team', 'reports:view_team',
    'reports:export', 'notifications:send'
  ],
  admin: [
    // All manager permissions plus:
    'training:view_all', 'assignments:view_all',
    'assignments:delete', 'suites:*',
    'users:view_all', 'users:invite', 'users:edit',
    'branches:*', 'reports:view_all',
    'billing:view', 'settings:*', 'badges:create'
  ],
  owner: ['*'] // All permissions
};
```

### Auth Middleware

```javascript
// api/lib/auth.js

// Require authentication
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Verify Clerk JWT
  const decoded = await verifyClerkToken(token);

  // Fetch user profile from Supabase
  const user = await supabase
    .from('users')
    .select('*, organization:organizations(*), branch:branches(*)')
    .eq('clerk_id', decoded.sub)
    .single();

  req.user = user;
  req.organization = user.organization;
  next();
};

// Optional auth (doesn't fail if missing)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    await authMiddleware(req, res, next);
  } catch {
    next();
  }
};

// Require specific role
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Require specific permission
const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user.role, permission)) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  next();
};
```

---

## API Reference

### Authentication Routes

#### POST `/api/auth/sync-user`
Syncs Clerk user to Supabase database.

**Request:**
```json
{
  "clerkId": "user_xxx",
  "email": "user@example.com",
  "fullName": "John Doe",
  "imageUrl": "https://..."
}
```

**Response:**
```json
{
  "user": { ... },
  "organization": { ... },
  "isNewUser": true
}
```

### Scenario Routes

#### GET `/api/scenarios`
Get all training scenarios with company-specific templating.

**Response:**
```json
{
  "success": true,
  "scenarios": [
    {
      "id": "cancellation-save",
      "name": "The Cancellation Save",
      "difficulty": "hard",
      "category": "Retention",
      "estimatedDuration": "5-8 minutes",
      "customerName": "Margaret Thompson",
      "personality": "Direct, frustrated but reasonable",
      "emotionalState": "Frustrated, considering leaving",
      "situation": "Margaret has been a Go-Forth customer for 3 years...",
      "customerBackground": "Retired teacher...",
      "openingLine": "Hi, I need to cancel my pest control service please.",
      "customerGoals": "Cancel service to save money...",
      "csrObjective": "Retain the customer...",
      "keyPointsToMention": ["Competitor is offering $99/quarter", ...],
      "escalationTriggers": "CSR is dismissive...",
      "deescalationTriggers": "CSR acknowledges loyalty...",
      "resolutionConditions": "Will stay if: offered a price match...",
      "scoringFocus": ["Empathy", "Retention techniques", ...]
    }
  ]
}
```

### Call Management Routes

#### POST `/api/calls/create-training-call`
Creates a new training call with Retell.

**Request:**
```json
{
  "scenario": { ... },
  "scenarioId": "cancellation-save"
}
```

**Response:**
```json
{
  "success": true,
  "callId": "call_xxx",
  "agentId": "agent_xxx",
  "accessToken": "token_xxx",
  "sampleRate": 24000
}
```

#### POST `/api/calls/end`
Ends an active call and retrieves transcript.

**Request:**
```json
{
  "callId": "call_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "callId": "call_xxx",
  "transcript": {
    "raw": "Customer: Hi, I need to cancel...",
    "formatted": [
      { "role": "agent", "content": "Hi, I need to cancel..." },
      { "role": "user", "content": "I'm sorry to hear that..." }
    ],
    "duration": 245
  }
}
```

### Analysis Routes

#### POST `/api/analysis/analyze`
Analyzes a call transcript with Claude.

**Request:**
```json
{
  "transcript": "Customer: Hi, I need to cancel...",
  "scenario": { ... },
  "callDuration": 245
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "overallScore": 85,
    "categories": {
      "empathyRapport": {
        "score": 90,
        "feedback": "Excellent job acknowledging the customer's concerns...",
        "keyMoments": ["0:45 - Showed genuine empathy"]
      },
      "problemResolution": { ... },
      "productKnowledge": { ... },
      "professionalism": { ... },
      "scenarioSpecific": { ... }
    },
    "strengths": [
      {
        "title": "Active Listening",
        "description": "Consistently acknowledged customer's points",
        "quote": "I completely understand your concern about the pricing..."
      }
    ],
    "improvements": [
      {
        "title": "Value Proposition",
        "issue": "Could have emphasized unique services earlier",
        "quote": "We offer the same services...",
        "alternative": "What sets us apart is our same-day service guarantee..."
      }
    ],
    "keyMoment": {
      "timestamp": "2:30",
      "description": "Turning point when offered loyalty discount",
      "impact": "Customer became more receptive",
      "betterApproach": "Could have offered earlier"
    },
    "summary": "Strong performance with good empathy. Focus on articulating value earlier in the conversation.",
    "nextSteps": [
      "Practice value articulation",
      "Study competitor comparison points",
      "Role-play pricing objections"
    ]
  }
}
```

### Training Session Routes

#### GET `/api/training/history`
Get user's training history.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)
- `startDate`, `endDate`

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "scenario_id": "cancellation-save",
      "started_at": "2024-01-15T10:30:00Z",
      "ended_at": "2024-01-15T10:35:00Z",
      "duration_seconds": 300,
      "overall_score": 85,
      "category_scores": { ... },
      "points_earned": 45,
      "status": "completed"
    }
  ],
  "total": 25,
  "hasMore": true
}
```

#### POST `/api/training/session`
Create a new training session record.

#### PATCH `/api/training/session/:id`
Update session with results.

### Assignment Routes

#### GET `/api/assignments/my`
Get current user's assignments.

**Response:**
```json
{
  "assignments": [
    {
      "id": "uuid",
      "scenario_id": "cancellation-save",
      "suite_id": null,
      "due_date": "2024-01-20T00:00:00Z",
      "status": "pending",
      "assigned_by": {
        "full_name": "Manager Name"
      },
      "progress": {
        "completed": 0,
        "required": 1
      }
    }
  ]
}
```

#### POST `/api/assignments`
Create a new assignment.

**Request:**
```json
{
  "userId": "uuid",
  "scenarioId": "cancellation-save",
  "suiteId": null,
  "dueDate": "2024-01-20",
  "notes": "Focus on empathy"
}
```

#### POST `/api/assignments/bulk`
Bulk create assignments.

**Request:**
```json
{
  "userIds": ["uuid1", "uuid2"],
  "scenarioId": "cancellation-save",
  "dueDate": "2024-01-20"
}
```

### Gamification Routes

#### GET `/api/gamification/leaderboard`
Get leaderboard data.

**Query Parameters:**
- `timeframe`: "weekly" | "monthly" | "all-time"
- `branchId`: Filter by branch

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "uuid",
        "full_name": "John Doe",
        "avatar_url": "..."
      },
      "points": 1250,
      "sessions": 15,
      "averageScore": 88,
      "streak": 7,
      "level": 5
    }
  ],
  "userRank": 3,
  "totalParticipants": 25
}
```

#### GET `/api/gamification/badges`
Get all available badges.

#### GET `/api/gamification/my-badges`
Get user's earned badges.

### Report Routes

#### GET `/api/reports/my-stats`
Get user's personal statistics.

**Response:**
```json
{
  "stats": {
    "totalSessions": 25,
    "averageScore": 82,
    "totalPoints": 1250,
    "currentStreak": 5,
    "longestStreak": 14,
    "level": 4,
    "badgesEarned": 8,
    "hoursTraining": 6.5,
    "improvement": 12
  }
}
```

#### GET `/api/reports/team`
Get team performance report (managers+).

#### GET `/api/reports/organization`
Get organization-wide report (admins+).

#### GET `/api/reports/export`
Export report as CSV.

### Billing Routes

#### GET `/api/billing/usage`
Get current billing period usage.

**Response:**
```json
{
  "usage": {
    "hoursUsed": 8.5,
    "hoursIncluded": 50,
    "hoursRemaining": 41.5,
    "percentUsed": 17,
    "overageHours": 0,
    "estimatedOverageCost": 0
  },
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

#### POST `/api/billing/checkout`
Create Stripe checkout session.

**Request:**
```json
{
  "planId": "professional"
}
```

#### POST `/api/billing/portal`
Create Stripe billing portal session.

### Prompt Management Routes

#### GET `/api/admin/prompts/custom`
Get custom prompt templates.

**Response:**
```json
{
  "success": true,
  "hasCustomPrompts": true,
  "customPrompts": {
    "agent": "Custom agent template...",
    "coaching": {
      "system": "Custom system prompt...",
      "user": "Custom user prompt..."
    }
  },
  "defaults": {
    "agent": "Default agent template...",
    "coachingSystem": "Default system...",
    "coachingUser": "Default user..."
  }
}
```

#### POST `/api/admin/prompts`
Save custom prompt templates.

**Request:**
```json
{
  "agentPrompt": "Custom agent template...",
  "coachingSystemPrompt": "Custom system...",
  "coachingUserPrompt": "Custom user..."
}
```

---

## Frontend Architecture

### Context Providers

```jsx
// Provider hierarchy in main.jsx
<ClerkProvider>
  <BrowserRouter>
    <AuthProvider>           {/* Clerk + Supabase auth */}
      <OrganizationProvider> {/* Org data & branding */}
        <ThemeProvider>      {/* Light/dark mode */}
          <NotificationProvider> {/* Toasts & notifications */}
            <ConfigProvider> {/* Runtime config */}
              <App />
            </ConfigProvider>
          </NotificationProvider>
        </ThemeProvider>
      </OrganizationProvider>
    </AuthProvider>
  </BrowserRouter>
</ClerkProvider>
```

### AuthContext API

```javascript
const {
  // Clerk state
  user,           // Clerk user object
  isLoaded,       // Clerk loaded
  isSignedIn,     // Clerk signed in

  // Supabase profile
  profile,        // Full user profile
  isAuthenticated,// Signed in + profile loaded
  loading,        // Loading state

  // Permissions
  hasPermission,  // (permission) => boolean
  hasAnyPermission, // (permissions[]) => boolean
  isAtLeastRole,  // (role) => boolean

  // API helpers
  authFetch,      // Authenticated fetch wrapper
  getToken,       // Get Clerk JWT

  // Convenience
  organization,   // User's organization
  branch,         // User's branch
  role,           // User's role
  supabase        // Supabase client
} = useAuth();
```

### OrganizationContext API

```javascript
const {
  // State
  organization,   // Full org data
  branches,       // Org branches
  loading,
  error,

  // Org methods
  updateOrganization, // (updates) => Promise
  updateSettings,     // (settings) => Promise
  updateAIConfig,     // (aiConfig) => Promise
  updateColors,       // (colors) => Promise
  scrapeWebsite,      // (url) => Promise
  applyScrapedData,   // (data) => Promise
  getUsageStats,      // () => Promise

  // Branch methods
  createBranch,
  updateBranch,
  deleteBranch,
  refreshBranches,

  // Convenience
  name,
  logo,
  colors,
  settings,
  subscriptionStatus,
  trainingHoursIncluded,
  trainingHoursUsed
} = useOrganization();
```

### ConfigContext API

```javascript
const {
  config,           // Full config
  settings,         // Call settings
  currentScenario,  // Active scenario
  currentCall,      // Active call info
  lastResults,      // Last call results

  setCurrentScenario,
  setCurrentCall,
  setLastResults,
  clearSession,
  updateSettings
} = useConfig();
```

### NotificationContext API

```javascript
const {
  // Notifications
  notifications,
  unreadCount,
  loading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,

  // Toasts
  toasts,
  showToast,
  dismissToast,
  showSuccess,  // (title, message)
  showError,    // (title, message)
  showWarning,  // (title, message)
  showInfo,     // (title, message)
  showAchievement // (title, message)
} = useNotifications();
```

### useRetellCall Hook

```javascript
const {
  // State
  callState,      // 'idle' | 'connecting' | 'connected' | 'ending' | 'ended' | 'error'
  transcript,     // Array of { role, content }
  error,          // Error message
  callDuration,   // Seconds
  isMuted,        // Mute state

  // Computed
  isConnecting,
  isConnected,
  isEnding,
  isEnded,
  hasError,

  // Methods
  startCall,      // (scenario) => Promise
  endCall,        // () => Promise<callData>
  toggleMute,     // () => void
  reset           // () => void
} = useRetellCall();
```

### Route Structure

```jsx
<Routes>
  {/* Auth Routes */}
  <Route path="/auth/login/*" element={<SignIn />} />
  <Route path="/auth/signup/*" element={<SignUp />} />

  {/* Protected Routes */}
  <Route path="/*" element={
    <ProtectedRoute>
      <Layout>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Training */}
          <Route path="/scenarios" element={<Home />} />
          <Route path="/scenario/:id" element={<PreCall />} />
          <Route path="/training" element={<Training />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<SessionHistory />} />

          {/* Assignments */}
          <Route path="/my-assignments" element={<MyAssignments />} />
          <Route path="/assignments" element={
            <RoleProtectedRoute allowedRoles={['manager', 'admin', 'owner']}>
              <Assignments />
            </RoleProtectedRoute>
          } />

          {/* Reports & Leaderboard */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/leaderboard" element={<Leaderboard />} />

          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/profile" element={<ProfileSettings />} />
          <Route path="/settings/billing" element={<BillingSettings />} />
          <Route path="/settings/ai" element={<AISettings />} />
          <Route path="/settings/team" element={<TeamSettings />} />
          <Route path="/settings/branches" element={<BranchSettings />} />

          {/* Admin */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/builder" element={<Builder />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  } />
</Routes>
```

---

## Core Features

### Training Call Flow

```
1. User selects scenario from /scenarios
   └── ScenarioGrid displays available scenarios

2. User views scenario details on /scenario/:id
   └── PreCall shows customer profile, situation, objectives

3. User starts call → /training
   ├── useRetellCall.startCall(scenario)
   │   ├── POST /api/calls/create-training-call
   │   │   ├── buildAgentPrompt(scenario, company, customTemplate)
   │   │   ├── Create Retell LLM with prompt
   │   │   ├── Create Retell Agent
   │   │   └── Create WebCall, return access token
   │   └── retellClient.startCall(accessToken)
   │
   ├── Real-time transcript updates via Retell events
   └── UI shows live transcript, duration, controls

4. User ends call
   ├── useRetellCall.endCall()
   │   ├── retellClient.stopCall()
   │   └── POST /api/calls/end → returns transcript
   │
   └── Navigate to analysis

5. Call analyzed → /results
   ├── POST /api/analysis/analyze
   │   ├── buildCoachingPrompt(transcript, context, customTemplates)
   │   └── Claude analyzes and returns scores/feedback
   │
   └── UI shows:
       ├── Overall score with circular visualization
       ├── Category breakdown
       ├── Strengths and improvements
       ├── Key moment analysis
       └── Next steps
```

### Multi-Tenant Data Isolation

```
Organization A                    Organization B
┌─────────────────┐              ┌─────────────────┐
│ Users           │              │ Users           │
│ Branches        │              │ Branches        │
│ Sessions        │              │ Sessions        │
│ Assignments     │              │ Assignments     │
│ Custom Prompts  │              │ Custom Prompts  │
│ Branding        │              │ Branding        │
└─────────────────┘              └─────────────────┘
        │                                │
        └────────────┬───────────────────┘
                     │
            Row Level Security
            (organization_id filter)
```

### Template Variable System

The system uses `{{variable}}` syntax for dynamic content:

**Company Variables:**
- `{{company.name}}` - Organization name
- `{{company.phone}}` - Phone number
- `{{company.services}}` - Comma-separated services
- `{{company.pricing.quarterlyPrice}}` - Quarterly price
- `{{company.guarantees}}` - Service guarantees
- `{{company.valuePropositions}}` - Value props
- `{{company.serviceAreas}}` - Service areas
- `{{company.businessHours}}` - Business hours

**Scenario Variables:**
- `{{scenario.customerName}}` - Customer name
- `{{scenario.personality}}` - Personality description
- `{{scenario.emotionalState}}` - Emotional state
- `{{scenario.situation}}` - Scenario situation
- `{{scenario.customerBackground}}` - Background
- `{{scenario.customerGoals}}` - Customer goals
- `{{scenario.escalationTriggers}}` - What escalates
- `{{scenario.deescalationTriggers}}` - What calms
- `{{scenario.resolutionConditions}}` - Resolution conditions

**Analysis Variables:**
- `{{transcript}}` - Call transcript
- `{{callDuration}}` - Call duration in seconds

---

## AI Integration

### Retell Voice Integration

```javascript
// Create training call
const createTrainingCall = async (scenario, company) => {
  // 1. Build agent prompt with company/scenario data
  const agentPrompt = buildAgentPrompt(scenario, company, customTemplate);

  // 2. Create Retell LLM
  const llm = await retellClient.llm.create({
    model: 'gpt-4o',
    general_prompt: agentPrompt,
    begin_message: scenario.openingLine
  });

  // 3. Create Retell Agent
  const agent = await retellClient.agent.create({
    agent_name: `CSR Training - ${scenario.name}`,
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    voice_id: scenario.voiceId || '11labs-Brian',
    language: 'en-US'
  });

  // 4. Create Web Call
  const webCall = await retellClient.call.createWebCall({
    agent_id: agent.agent_id
  });

  return {
    callId: webCall.call_id,
    agentId: agent.agent_id,
    accessToken: webCall.access_token
  };
};
```

### Claude Coaching Analysis

```javascript
// Analyze call transcript
const analyzeTranscript = async (transcript, context) => {
  const { system, user } = buildCoachingPrompt(
    transcript,
    context,
    customTemplates
  );

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }]
  });

  // Parse JSON response
  const analysis = JSON.parse(response.content[0].text);

  return {
    overallScore: analysis.overallScore,
    categories: analysis.categories,
    strengths: analysis.strengths,
    improvements: analysis.improvements,
    keyMoment: analysis.keyMoment,
    summary: analysis.summary,
    nextSteps: analysis.nextSteps
  };
};
```

### Default Prompt Templates

**Agent Prompt Template:**
```
You are playing the role of a customer calling {{company.name}}.
You are participating in a training simulation for customer service representatives.

## Your Character
Name: {{scenario.customerName}}
Personality: {{scenario.personality}}
Emotional State: {{scenario.emotionalState}}
Background: {{scenario.customerBackground}}

## The Situation
{{scenario.situation}}

## Your Goals
{{scenario.customerGoals}}

## How to Behave
- Stay in character throughout the call
- React naturally to what the CSR says
- Escalate if: {{scenario.escalationTriggers}}
- Calm down if: {{scenario.deescalationTriggers}}
- Use natural speech patterns with occasional filler words
- Don't be a pushover - advocate for yourself realistically

## Company Context
- Company: {{company.name}}
- Services: {{company.services}}
- Quarterly price: ${{company.pricing.quarterlyPrice}}
- Guarantee: {{company.guarantees}}

## Resolution Conditions
{{scenario.resolutionConditions}}

Remember: This is training - challenge the CSR but be fair.
```

**Coaching System Prompt:**
```
You are an expert CSR coach specializing in pest control customer service training.
Provide detailed, constructive feedback on call performance.
Always respond with valid JSON matching the exact schema provided.
```

**Coaching User Prompt Template:**
```
Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Scenario: {{scenario.name}}
- Difficulty: {{scenario.difficulty}}
- Company: {{company.name}}
- Call Duration: {{callDuration}} seconds

## Transcript
{{transcript}}

Respond with JSON:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "...", "keyMoments": [] },
    "problemResolution": { "score": 0-100, "feedback": "...", "keyMoments": [] },
    "productKnowledge": { "score": 0-100, "feedback": "...", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "...", "keyMoments": [] },
    "scenarioSpecific": { "score": 0-100, "feedback": "...", "keyMoments": [] }
  },
  "strengths": [{ "title": "...", "description": "...", "quote": "..." }],
  "improvements": [{ "title": "...", "issue": "...", "quote": "...", "alternative": "..." }],
  "keyMoment": { "timestamp": "...", "description": "...", "impact": "...", "betterApproach": "..." },
  "summary": "...",
  "nextSteps": ["...", "...", "..."]
}
```

---

## Billing & Subscriptions

### Subscription Plans

| Plan | Monthly Price | Training Hours | Users | Features |
|------|---------------|----------------|-------|----------|
| Starter | $99 | 10 hours | 5 | Basic scenarios, email support |
| Professional | $299 | 50 hours | 25 | All scenarios, custom prompts, priority support |
| Enterprise | $799 | 200 hours | Unlimited | Custom scenarios, API access, dedicated support |

### Overage Billing

- **Rate**: $0.15/minute ($9/hour)
- **Billing**: Metered, reported to Stripe at session end
- **Tracking**: Stored in `usage_records` table

### Stripe Integration Flow

```
1. User selects plan
   └── POST /api/billing/checkout { planId }
       └── Creates Stripe Checkout Session

2. User completes checkout
   └── Stripe Webhook: checkout.session.completed
       ├── Update organization.stripe_customer_id
       ├── Update organization.subscription_status
       └── Update organization.subscription_plan

3. Training session completed
   └── Record usage
       ├── Insert usage_records
       ├── Update organization.training_hours_used
       └── If overage: stripe.subscriptionItems.createUsageRecord()

4. Monthly billing cycle
   └── Stripe Webhook: invoice.paid
       └── Insert invoices record

5. User manages subscription
   └── POST /api/billing/portal
       └── Creates Stripe Billing Portal Session
```

### Webhook Events

```javascript
const handleWebhookEvent = async (event) => {
  switch (event.type) {
    case 'checkout.session.completed':
      // Activate subscription
      await activateSubscription(event.data.object);
      break;

    case 'customer.subscription.updated':
      // Handle plan changes
      await updateSubscription(event.data.object);
      break;

    case 'customer.subscription.deleted':
      // Handle cancellation
      await cancelSubscription(event.data.object);
      break;

    case 'invoice.paid':
      // Record invoice
      await recordInvoice(event.data.object);
      break;

    case 'invoice.payment_failed':
      // Handle failed payment
      await handlePaymentFailure(event.data.object);
      break;
  }
};
```

---

## Gamification System

### Points Calculation

```javascript
const POINTS = {
  SESSION_COMPLETE: 10,
  SCORE_BONUS: {
    '90-100': 50,
    '80-89': 30,
    '70-79': 20,
    '60-69': 10
  },
  DIFFICULTY_MULTIPLIER: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0
  },
  STREAK_BONUS: {
    3: 25,
    7: 75,
    14: 150,
    30: 500,
    90: 2000
  }
};

const calculatePoints = (score, difficulty, streak) => {
  let points = POINTS.SESSION_COMPLETE;

  // Score bonus
  if (score >= 90) points += POINTS.SCORE_BONUS['90-100'];
  else if (score >= 80) points += POINTS.SCORE_BONUS['80-89'];
  else if (score >= 70) points += POINTS.SCORE_BONUS['70-79'];
  else if (score >= 60) points += POINTS.SCORE_BONUS['60-69'];

  // Difficulty multiplier
  points *= POINTS.DIFFICULTY_MULTIPLIER[difficulty] || 1;

  // Streak bonus (one-time at milestones)
  const streakBonus = POINTS.STREAK_BONUS[streak] || 0;
  points += streakBonus;

  return Math.round(points);
};
```

### Badge System

**Badge Types:**
- `session_count` - Complete X sessions
- `streak` - Maintain X-day streak
- `perfect_score` - Score 100%
- `category_mastery` - Score 95%+ in category X times
- `difficulty_master` - Complete X hard scenarios with 80%+
- `speed` - Complete scenario under X minutes with good score

**Example Badges:**

| Badge | Criteria | Rarity | Points |
|-------|----------|--------|--------|
| First Steps | 1 session | Common | 10 |
| Getting Started | 5 sessions | Common | 25 |
| Dedicated | 25 sessions | Uncommon | 100 |
| Week Warrior | 7-day streak | Uncommon | 75 |
| Perfect Call | 100% score | Rare | 200 |
| Empathy Master | 95%+ Empathy 5x | Rare | 150 |
| Hard Mode Hero | 10 hard scenarios 80%+ | Epic | 500 |
| Monthly Master | 30-day streak | Legendary | 1000 |

### Leaderboard

```javascript
// Leaderboard query
const getLeaderboard = async (orgId, timeframe, branchId) => {
  let dateFilter;
  if (timeframe === 'weekly') {
    dateFilter = 'created_at >= NOW() - INTERVAL \'7 days\'';
  } else if (timeframe === 'monthly') {
    dateFilter = 'created_at >= NOW() - INTERVAL \'30 days\'';
  }

  const query = supabase
    .from('users')
    .select(`
      id, full_name, avatar_url, total_points, current_streak, level,
      training_sessions!inner(overall_score, created_at)
    `)
    .eq('organization_id', orgId)
    .order('total_points', { ascending: false });

  if (branchId) query.eq('branch_id', branchId);

  return query;
};
```

---

## Environment Configuration

### Frontend Environment (.env)

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# API
VITE_API_URL=http://localhost:3001
```

### Backend Environment (.env)

```env
# Server
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Clerk
CLERK_SECRET_KEY=sk_test_xxx

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxx

# Retell
RETELL_API_KEY=key_xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PROFESSIONAL_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_OVERAGE_PRICE_ID=price_xxx
```

---

## Deployment

### Vercel Configuration (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

### Deployment Checklist

1. **Environment Variables**: Set all required env vars in Vercel dashboard
2. **Supabase**:
   - Run all migrations
   - Enable Row Level Security
   - Set up RLS policies
3. **Clerk**:
   - Configure production domain
   - Set webhook endpoints
4. **Stripe**:
   - Create products/prices
   - Configure webhook endpoint
   - Enable required events
5. **Retell**:
   - Verify API key works
   - Test voice agents

### Database Migrations

Run in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (see Database Schema section)

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Create RLS policies
CREATE POLICY "Users can view own organization"
ON organizations FOR SELECT
USING (id = (SELECT organization_id FROM users WHERE clerk_id = auth.uid()));

-- ... additional policies
```

---

## Hardcoded Scenarios

The system includes 5 default training scenarios:

### 1. The Cancellation Save
- **Difficulty**: Hard
- **Category**: Retention
- **Duration**: 5-8 minutes
- **Customer**: Margaret Thompson (68, retired teacher)
- **Situation**: 3-year customer wants to cancel due to competitor's lower price
- **Objective**: Demonstrate value, offer price match or loyalty discount

### 2. The Furious Callback
- **Difficulty**: Hard
- **Category**: Complaint Resolution
- **Duration**: 6-10 minutes
- **Customer**: David Martinez (32, marketing manager)
- **Situation**: Ant treatment failed twice, extremely angry
- **Objective**: De-escalate, apologize sincerely, offer immediate solution

### 3. The Price Shopper
- **Difficulty**: Medium
- **Category**: Sales
- **Duration**: 4-6 minutes
- **Customer**: Jennifer Walsh (35, financial analyst)
- **Situation**: New homeowner comparing 3 companies
- **Objective**: Articulate value vs. cheaper competitors

### 4. The New Customer Inquiry
- **Difficulty**: Easy
- **Category**: Sales
- **Duration**: 3-5 minutes
- **Customer**: Michael Torres (28, first-time homeowner)
- **Situation**: Found roaches, never hired pest control
- **Objective**: Educate, build trust, book service

### 5. The Wildlife Emergency
- **Difficulty**: Medium
- **Category**: Emergency Response
- **Duration**: 4-6 minutes
- **Customer**: Karen Mitchell (35, single mom)
- **Situation**: Animal in attic, scared, home alone with kids
- **Objective**: Calm customer, schedule same-day service

---

## Support & Maintenance

### Logging

API requests are logged with timestamp and path:
```javascript
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});
```

### Debug Endpoints

- `GET /api/debug/env` - Check environment variable status
- `GET /api/debug/test-retell` - Test Retell API connection
- `GET /api/health` - Health check

### Error Handling

```javascript
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});
```

---

*Last Updated: January 2025*
*Version: 1.0.0*
