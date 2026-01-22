# CSR Training Simulator - Troubleshooting Guide

## Common Issues

### 1. Application Won't Start

**Symptoms:**
- Error when running `npm run dev`
- Port already in use
- Module not found errors

**Solutions:**

```bash
# Check if ports are in use
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# Kill processes on ports (Windows)
taskkill /PID <PID> /F

# Reinstall dependencies
rm -rf node_modules
cd server && rm -rf node_modules && npm install
cd ../client && rm -rf node_modules && npm install
```

---

### 2. API Keys Not Working

**Symptoms:**
- 401 Unauthorized errors
- "Invalid API key" messages
- Calls not connecting

**Solutions:**

1. Verify `.env` file exists in `server/` directory
2. Check API key format:
   - Anthropic: starts with `sk-ant-api03-`
   - Retell: starts with `key_`
3. Ensure no quotes around values in `.env`
4. Restart server after changing `.env`

```bash
# Test Anthropic API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

---

### 3. Voice Calls Not Working

**Symptoms:**
- "Connecting..." never completes
- No audio
- Call ends immediately

**Solutions:**

**Browser Permissions:**
1. Click lock icon in URL bar
2. Ensure microphone is set to "Allow"
3. Refresh page

**Microphone Issues:**
1. Test microphone in system settings
2. Close other apps using microphone
3. Try different browser (Chrome recommended)

**Network Issues:**
1. Check firewall settings
2. Ensure WebSocket connections allowed
3. Try different network

**Retell API Issues:**
1. Verify API key is valid
2. Check Retell dashboard for quota
3. Review server logs for error details

---

### 4. Scenarios Not Loading

**Symptoms:**
- Empty scenario grid
- "No scenarios found"
- Loading spinner never stops

**Solutions:**

1. Check `server/data/scenarios.json` exists
2. Verify JSON is valid:
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('server/data/scenarios.json')))"
   ```
3. Check server console for errors
4. Restart server

---

### 5. Analysis/Coaching Not Generating

**Symptoms:**
- Scorecard shows "Analysis Unavailable"
- Scores are missing
- Feedback is generic

**Solutions:**

1. Verify Anthropic API key is valid
2. Check server logs for Claude API errors
3. Ensure transcript was captured:
   - Check transcript appeared during call
   - Verify call ended properly
4. Try with a longer conversation (30+ seconds)

---

### 6. Company Scraper Failing

**Symptoms:**
- "Failed to scrape website" error
- No data extracted
- Timeout errors

**Solutions:**

1. Verify URL is accessible in browser
2. Try with `https://` prefix
3. Some sites block scrapers - try different site
4. Check for CAPTCHA or bot protection
5. For complex sites, use manual configuration

---

### 7. Styling/Theme Issues

**Symptoms:**
- Broken layouts
- Missing colors
- Components not rendering

**Solutions:**

1. Clear browser cache
2. Rebuild client:
   ```bash
   cd client && npm run build
   ```
3. Check browser console for CSS errors
4. Verify Tailwind is building:
   ```bash
   cd client && npx tailwindcss -i ./src/styles/index.css -o ./dist/output.css
   ```

---

### 8. Database/Config Issues

**Symptoms:**
- Settings not saving
- Config reverting to defaults
- Custom scenarios disappearing

**Solutions:**

1. Check write permissions on `server/data/` directory
2. Verify `config.json` and `scenarios.json` are valid JSON
3. Backup and reset:
   ```bash
   cp server/data/config.json server/data/config.backup.json
   # Delete and let app recreate
   rm server/data/config.json
   ```

---

## Debug Mode

### Enable Verbose Logging

Add to `server/.env`:
```env
NODE_ENV=development
DEBUG=*
```

### Check API Responses

```bash
# Test scenarios endpoint
curl http://localhost:3001/api/scenarios

# Test config endpoint
curl http://localhost:3001/api/admin/current-config

# Test health
curl http://localhost:3001/api/health
```

### Browser Developer Tools

1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Check Application tab for storage issues

---

## Getting Help

If issues persist:

1. Collect error logs from:
   - Browser console
   - Server terminal
   - Network requests

2. Document:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment (OS, browser, Node version)

3. Check:
   - Retell AI status page
   - Anthropic API status

---

## Reset to Defaults

If all else fails, reset to clean state:

```bash
# Backup data
cp -r server/data server/data.backup

# Reset config
rm server/data/config.json

# Keep only default scenarios
# (custom scenarios will be lost)
git checkout server/data/scenarios.json

# Reinstall dependencies
rm -rf node_modules server/node_modules client/node_modules
npm run install:all

# Restart
npm run dev
```
