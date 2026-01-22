# CSR Training Simulator - Setup Checklist

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] NPM or Yarn package manager
- [ ] Retell AI API key
- [ ] Anthropic Claude API key
- [ ] Microphone access in browser

## Installation

```bash
# Clone or navigate to project
cd csr-training-simulator

# Install all dependencies
npm run install:all
# Or manually:
cd server && npm install && cd ../client && npm install
```

## Configuration

### 1. Environment Variables

Create `server/.env` file:

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
RETELL_API_KEY=key_xxxxx
CLIENT_URL=http://localhost:5173
```

### 2. Company Configuration

Option A: Use the Admin Panel
1. Start the application
2. Navigate to Setup > Website Scraper
3. Enter company website URL
4. Review and apply extracted data

Option B: Edit config directly
Edit `server/data/config.json` with company information.

Option C: Use CLI script
```bash
node scripts/scrape-company.js https://www.yourcompany.com
```

## Running the Application

```bash
# Development mode (both server and client)
npm run dev

# Or separately:
npm run dev:server  # Backend on port 3001
npm run dev:client  # Frontend on port 5173
```

## Verification Steps

### 1. Server Health Check
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Scenarios Loading
- Navigate to http://localhost:5173
- Verify 8 scenarios are displayed
- Check that company name appears in scenarios

### 3. Voice Call Test
- Select any scenario
- Click "Start Training Call"
- Verify microphone permission prompt
- Speak and verify AI responds

### 4. Coaching Analysis Test
- Complete a short call
- End the call
- Verify scorecard displays with scores

## Troubleshooting

### Microphone Not Working
- Check browser permissions
- Ensure HTTPS or localhost
- Try different browser

### Call Not Connecting
- Verify RETELL_API_KEY is valid
- Check browser console for errors
- Ensure microphone is not in use

### Analysis Not Generating
- Verify ANTHROPIC_API_KEY is valid
- Check server logs for errors
- Ensure transcript was captured

## Demo Preparation

1. [ ] Test all 8 scenarios
2. [ ] Verify company branding displays
3. [ ] Complete at least one full call
4. [ ] Review coaching feedback
5. [ ] Test scenario builder
6. [ ] Clear browser cache before demo
