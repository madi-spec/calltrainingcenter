# CSR Training Simulator

An AI-powered customer service training platform for pest control companies. Features real-time voice calls with AI customers, company branding personalization, and comprehensive coaching feedback.

## Features

- **Real-time Voice Calls**: Practice handling customer calls with AI-powered voice interactions via Retell AI
- **8 Pre-built Scenarios**: From easy new customer inquiries to hard cancellation saves
- **Company Personalization**: Automatically scrape company websites for branding, services, and pricing
- **AI Coaching**: Instant feedback and scoring powered by Claude AI
- **Custom Scenario Builder**: Create training scenarios from real conversations
- **Transcript Intelligence**: Extract insights from existing call transcripts

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express
- **Voice AI**: Retell AI (Web SDK)
- **Coaching AI**: Anthropic Claude API
- **Web Scraping**: Cheerio + Puppeteer

## Quick Start

### Prerequisites

- Node.js 18+
- Retell AI API key ([get one here](https://www.retellai.com/))
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd csr-training-simulator

# Install dependencies
npm run install:all
```

### Configuration

Create `server/.env`:

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
RETELL_API_KEY=key_xxxxx
CLIENT_URL=http://localhost:5173
```

### Running

```bash
# Development (both server and client)
npm run dev

# Or separately
npm run dev:server  # Backend on :3001
npm run dev:client  # Frontend on :5173
```

Open http://localhost:5173 in your browser.

## Project Structure

```
csr-training-simulator/
├── server/                 # Express backend
│   ├── routes/            # API routes
│   │   ├── admin.js       # Config & scraping
│   │   ├── calls.js       # Call management
│   │   ├── scenarios.js   # Scenario CRUD
│   │   └── analysis.js    # Coaching analysis
│   ├── services/          # Business logic
│   │   ├── retell.js      # Retell AI integration
│   │   ├── claude.js      # Claude AI integration
│   │   ├── scraper.js     # Website scraping
│   │   └── prompts.js     # AI prompts
│   ├── utils/             # Utilities
│   └── data/              # JSON data files
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Route pages
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom hooks
│   │   └── context/       # React context
│   └── public/            # Static assets
├── scripts/               # CLI utilities
└── docs/                  # Documentation
```

## Usage

### 1. Company Setup

Navigate to **Setup** > **Website Scraper**:
1. Enter your company website URL
2. Click "Scrape Website"
3. Review extracted data
4. Click "Apply Configuration"

### 2. Select a Scenario

Browse available scenarios on the home page:
- **Easy**: New Customer Inquiry
- **Medium**: Price Shopper, Upsell Opportunity, Missed Appointment, Wildlife Emergency
- **Hard**: Cancellation Save, Furious Callback, Warranty Dispute

### 3. Review Briefing

Before each call, review:
- Customer profile and personality
- The situation
- Your objective
- Success criteria

### 4. Start Training Call

- Click "Start Training Call"
- Allow microphone access
- Speak naturally with the AI customer
- End call when ready

### 5. Review Coaching

After the call, receive:
- Overall score (0-100)
- Category breakdown
- Specific strengths
- Areas to improve with alternatives
- Key moment analysis
- Next steps

### 6. Create Custom Scenarios

Navigate to **Create** to build custom scenarios:
- Define customer personality and emotional state
- Set the situation and key points
- Configure behavior triggers
- Save and train

## Pre-built Scenarios

| Scenario | Difficulty | Category |
|----------|------------|----------|
| The Cancellation Save | Hard | Retention |
| The Furious Callback | Hard | Complaint Resolution |
| The Price Shopper | Medium | Sales |
| The Upsell Opportunity | Medium | Sales |
| The Missed Appointment | Medium | Service Recovery |
| The New Customer Inquiry | Easy | Sales |
| The Warranty Dispute | Hard | Complaint Resolution |
| The Wildlife Emergency | Medium | Emergency Response |

## CLI Scripts

### Analyze Transcript
```bash
node scripts/load-transcript.js conversation.txt
node scripts/load-transcript.js --text "CSR: Hello..."
```

### Scrape Company Website
```bash
node scripts/scrape-company.js https://www.example.com
```

## API Endpoints

### Scenarios
- `GET /api/scenarios` - List all scenarios
- `GET /api/scenarios/:id` - Get single scenario
- `POST /api/scenarios` - Create custom scenario
- `GET /api/scenarios/meta/voices` - List available voices

### Calls
- `POST /api/calls/create-training-call` - Start a training call
- `POST /api/calls/end` - End call and get transcript
- `GET /api/calls/transcript/:callId` - Get call transcript

### Analysis
- `POST /api/analysis/analyze` - Analyze transcript for coaching

### Admin
- `POST /api/admin/scrape-company` - Scrape company website
- `POST /api/admin/apply-company` - Apply company config
- `GET /api/admin/current-config` - Get current config
- `POST /api/admin/load-transcript` - Extract intelligence from transcript

## Documentation

- [Setup Checklist](docs/SETUP_CHECKLIST.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## License

MIT
