# Certificate System - Quick Start Guide

## What Was Implemented

A complete professional certificate generation and delivery system that automatically creates and emails PDF certificates when users complete courses.

## Files Created/Modified

### Backend Files
```
api/
├── services/
│   └── certificateGenerator.js          ✨ NEW - PDF generation service
├── routes/
│   ├── certificates.js                  ✨ NEW - Certificate API endpoints
│   └── modules.js                       📝 MODIFIED - Added auto-generation hook
├── migrations/
│   └── add_certificates.sql             ✨ NEW - Database schema
├── lib/
│   └── email.js                         📝 MODIFIED - Added certificate email
├── scripts/
│   └── test-certificate.js              ✨ NEW - Testing script
├── index.js                             📝 MODIFIED - Registered routes
├── package.json                         📝 MODIFIED - Added dependencies
└── .env                                 📝 MODIFIED - Added config vars
```

### Frontend Files
```
client/src/
├── pages/
│   └── certificates/
│       ├── MyCertificates.jsx           ✨ NEW - Certificate gallery
│       └── VerifyCertificate.jsx        ✨ NEW - Public verification page
├── components/
│   └── Layout.jsx                       📝 MODIFIED - Added nav link
└── App.jsx                              📝 MODIFIED - Added routes
```

### Documentation
```
CERTIFICATE_SYSTEM.md                     ✨ NEW - Complete documentation
CERTIFICATE_QUICKSTART.md                 ✨ NEW - This file
```

## Setup Instructions

### 1. Install Dependencies (✅ Already Done)

```bash
cd api
npm install pdfkit qrcode
```

### 2. Configure Environment Variables

Edit `api/.env` and add:

```env
# Resend API Key (for email delivery)
RESEND_API_KEY=your_resend_api_key_here

# App URL (for certificate verification links)
APP_URL=http://localhost:5173
```

To get a Resend API key:
1. Go to https://resend.com
2. Sign up for free account
3. Generate API key
4. Paste into .env file

**Note:** System works without Resend (certificates generate, just no email)

### 3. Run Database Migration

#### Option A: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste contents of `api/migrations/add_certificates.sql`
6. Click **Run** or press Cmd/Ctrl + Enter

#### Option B: Using psql
```bash
# If you have psql installed
psql your_connection_string -f api/migrations/add_certificates.sql
```

### 4. Start the Development Servers

```bash
# Terminal 1 - API Server
cd api
npm run dev

# Terminal 2 - Client Server
cd client
npm run dev
```

## Testing the System

### End-to-End Test

#### 1. Complete a Test Course

**Using the UI:**
1. Login to the app: http://localhost:5173
2. Navigate to **Courses** in the sidebar
3. Select any course
4. Click **Start Course**
5. Complete all modules in the course:
   - Start each module
   - Complete all scenarios in each module
   - Achieve passing score (60%+)
6. When you complete the last scenario in the last module:
   - ✅ Certificate should auto-generate
   - ✅ Email should be sent (if Resend configured)
   - ✅ You'll see success message

#### 2. View Your Certificates

1. Click **Certificates** in the sidebar (Award icon)
2. You should see your certificate card with:
   - Course name and icon
   - Your score badge
   - Issue date
   - Verification code
3. Test the buttons:
   - **Download** - Downloads PDF certificate
   - **Verify** (eye icon) - Opens verification page in new tab
   - **Share** (share icon) - Copies verification link to clipboard

#### 3. Verify Certificate

**Public Verification (No Login Required):**
1. Copy your verification code from the certificate
2. Open new incognito/private browser window
3. Navigate to: http://localhost:5173/verify-certificate
4. Enter the verification code
5. Click **Verify**
6. You should see:
   - ✅ Green "Certificate Verified" banner
   - Certificate details (name, course, score, date)
   - Recipient information
   - Course information

**Direct Link Verification:**
- Navigate to: http://localhost:5173/verify-certificate/XXXX-XXXX-XXXX
- (Replace XXXX-XXXX-XXXX with your actual code)

#### 4. Check Email (If Resend Configured)

1. Check the email address of the user who completed the course
2. Look for email with subject: "Congratulations! Your [Course Name] Certificate"
3. Email should include:
   - Congratulations message
   - PDF attachment
   - Verification code
   - Link to verify online

#### 5. Test PDF Download

1. Click **Download** button on certificate
2. PDF should download with filename: `certificate-XXXX-XXXX-XXXX.pdf`
3. Open PDF and verify:
   - Professional landscape layout
   - User name displayed prominently
   - Course name and organization
   - Score badge (if score > 0)
   - Issue date
   - QR code (bottom left)
   - Verification code (bottom right)
   - "Powered by Sell Every Call" footer

#### 6. Test QR Code

1. Open downloaded PDF
2. Use phone camera or QR code scanner
3. Scan QR code in bottom left
4. Should open verification page with your certificate details

### Edge Cases to Test

#### Test No Duplicates
1. Complete the same course again
2. Certificate gallery should still show only 1 certificate
3. Certificate should not be regenerated

#### Test Invalid Verification Code
1. Go to /verify-certificate
2. Enter random code: "INVALID-CODE-123"
3. Should see "Certificate Not Found" error

#### Test Empty State
1. Login as new user who hasn't completed any courses
2. Navigate to /certificates
3. Should see empty state with:
   - Trophy icon
   - "No certificates yet" message
   - "Browse Courses" button

#### Test Incomplete Course
1. Start a course but don't complete all modules
2. Certificate should NOT be generated
3. /certificates page should not show certificate

## Manual Testing Script

If you want to test without completing a course, you can use the test script:

```bash
cd api
node scripts/test-certificate.js
```

**Note:** You'll need to edit the script first and add real user ID and course ID from your database.

## Troubleshooting

### Certificate Not Generating

**Check Console Logs:**
```bash
# In API terminal, look for:
[COURSE] Certificate generated for course completion
[CERTIFICATE] Generated certificate: [uuid]
```

**Common Issues:**
- Course not fully completed (check all modules have status='completed')
- Database migration not run (check certificates table exists)
- User or course data missing

**Solution:**
```bash
# Manually generate for a completed course
curl -X POST http://localhost:3000/api/certificates/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID"}'
```

### Email Not Sending

**Check Configuration:**
```bash
# Verify RESEND_API_KEY is set in .env
cat api/.env | grep RESEND
```

**Check Logs:**
```bash
# Look for:
[EMAIL] Certificate sent to [email], message ID: [id]
# Or:
[EMAIL] Resend not configured - skipping certificate email send
```

**Note:** Certificate still generates even if email fails!

### PDF Not Displaying

**Check Browser Console:**
- Right-click on page → Inspect → Console tab
- Look for errors

**Try Different Browser:**
- Chrome, Firefox, Safari, Edge
- PDF viewing varies by browser

**Check PDF Generation:**
```bash
# In API logs, look for:
[CERTIFICATE] Generated certificate: [uuid]
```

### Verification Page Not Loading

**Check Route Registration:**
```javascript
// In client/src/App.jsx, verify:
<Route path="/verify-certificate/:code?" element={...} />
```

**Check API Endpoint:**
```bash
# Test API directly:
curl http://localhost:3000/api/certificates/verify/YOUR-CODE
```

### QR Code Not Scanning

**Check APP_URL:**
```bash
# Make sure APP_URL is set correctly in .env
echo $APP_URL  # Should be http://localhost:5173 for dev
```

**Try Different QR Readers:**
- Phone camera app
- Dedicated QR code scanner app
- Browser extension

## QA Checklist

Use this checklist to verify everything works:

- [ ] **Setup**
  - [ ] Dependencies installed (pdfkit, qrcode)
  - [ ] Database migration executed
  - [ ] Environment variables configured
  - [ ] Servers running (API + Client)

- [ ] **Certificate Generation**
  - [ ] Auto-generates on course completion
  - [ ] Certificate appears in gallery immediately
  - [ ] Database record created
  - [ ] No duplicates on re-completion

- [ ] **PDF Generation**
  - [ ] PDF downloads successfully
  - [ ] Professional layout (landscape)
  - [ ] All elements present (name, course, score, date)
  - [ ] QR code visible and scannable
  - [ ] Verification code formatted correctly

- [ ] **Email Delivery** (if Resend configured)
  - [ ] Email received within 1 minute
  - [ ] Subject line correct
  - [ ] PDF attached
  - [ ] Email template renders correctly
  - [ ] Verification link works

- [ ] **Certificate Gallery** (/certificates)
  - [ ] All certificates displayed
  - [ ] Cards show correct information
  - [ ] Download button works
  - [ ] Verify button opens new tab
  - [ ] Share button copies link
  - [ ] Empty state shows for new users

- [ ] **Verification Page** (/verify-certificate)
  - [ ] Search form works
  - [ ] Valid codes show certificate details
  - [ ] Invalid codes show error
  - [ ] Direct URL with code works
  - [ ] Public (no login required)
  - [ ] Print button works

- [ ] **Navigation**
  - [ ] "Certificates" link visible in sidebar
  - [ ] Award icon displays
  - [ ] Link navigates correctly
  - [ ] Active state highlights correctly

- [ ] **Permissions**
  - [ ] Users can only see own certificates (via /certificates)
  - [ ] Anyone can verify certificates (via /verify-certificate)
  - [ ] Download requires authentication

## API Endpoints Reference

```
GET    /api/certificates              - List user's certificates
GET    /api/certificates/:id          - Get specific certificate
GET    /api/certificates/verify/:code - Verify certificate (public)
POST   /api/certificates/generate     - Generate certificate manually
GET    /api/certificates/:id/download - Download PDF
```

## Frontend Routes

```
/certificates                    - Certificate gallery (auth required)
/verify-certificate              - Verification search page (public)
/verify-certificate/:code        - Direct verification (public)
```

## Next Steps

1. **Run Database Migration** (if not done)
   - Follow instructions in Setup Section 3

2. **Configure Resend** (optional, for email)
   - Get API key from https://resend.com
   - Add to .env file

3. **Test Complete Flow**
   - Complete a test course
   - View certificate in gallery
   - Download PDF
   - Verify online
   - Check email (if configured)

4. **Production Deployment**
   - Update APP_URL in .env to production URL
   - Configure Resend with production domain
   - Test email delivery in production
   - Verify QR codes work with production URL

## Support

For issues or questions:
1. Check `CERTIFICATE_SYSTEM.md` for detailed documentation
2. Review console logs (API and browser)
3. Test with provided scripts
4. Verify database migration ran successfully

## Success Criteria

✅ **System is working correctly when:**

1. Certificate auto-generates on course completion
2. PDF downloads with all correct information
3. Verification page shows correct certificate details
4. QR code scans to verification page
5. Email delivers (if Resend configured)
6. No duplicate certificates created
7. Gallery displays all user certificates
8. Navigation link is visible and functional

**Congratulations! Your certificate system is ready to use!** 🎉
