# Certificate Generation System

## Overview

The certificate generation system automatically creates professional PDF certificates when users complete courses. Certificates include company branding, user information, course details, scores, unique verification codes, and QR codes for easy verification.

## Features

- ✅ Auto-generates PDF certificates on course completion
- ✅ Professional design with company branding
- ✅ Unique verification codes and QR codes
- ✅ Email delivery with PDF attachment
- ✅ Certificate gallery in user profile
- ✅ Public verification page
- ✅ Download functionality
- ✅ Share functionality (copy verification link)
- ✅ No duplicate certificates

## Architecture

### Backend Components

#### 1. Database Schema (`api/migrations/add_certificates.sql`)

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  issued_at TIMESTAMPTZ,
  verification_code TEXT UNIQUE,
  pdf_url TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

- Unique constraint on (user_id, course_id) prevents duplicates
- RLS policies for secure access
- Indexed for fast lookups

#### 2. Certificate Generator Service (`api/services/certificateGenerator.js`)

**Key Functions:**

- `generateCertificate()` - Main function to create certificate
- `createCertificatePDF()` - Generates PDF using PDFKit
- `calculateCourseScore()` - Calculates average close rate across modules
- `generateVerificationCode()` - Creates unique 12-character code (format: XXXX-XXXX-XXXX)
- `getCertificateByCode()` - Retrieves certificate for verification
- `getUserCertificates()` - Gets all certificates for a user

**PDF Features:**

- Landscape orientation (Letter size)
- Professional border design
- Company branding colors
- User name prominently displayed
- Course name and category
- Organization name
- Overall score badge (if score > 0)
- Issue date
- QR code (bottom left)
- Verification code (bottom right)
- "Powered by Sell Every Call" footer

#### 3. Email Service (`api/lib/email.js`)

**New Functions:**

- `sendCertificateEmail()` - Sends certificate as PDF attachment
- `generateCertificateEmailHTML()` - Creates professional email template

**Email Features:**

- Congratulatory message
- Certificate attached as PDF
- Verification code displayed
- Link to online verification
- Professional HTML design

#### 4. Certificates API Routes (`api/routes/certificates.js`)

**Endpoints:**

- `GET /api/certificates` - List all user's certificates
- `GET /api/certificates/:id` - Get specific certificate
- `GET /api/certificates/verify/:code` - Public verification (no auth required)
- `POST /api/certificates/generate` - Manually generate certificate
- `GET /api/certificates/:id/download` - Download PDF

#### 5. Course Completion Hook (`api/routes/modules.js`)

Certificate generation is automatically triggered when:
1. All modules in a course are completed
2. User's course_progress status changes to 'completed'
3. Hook in `complete-scenario` endpoint generates certificate

### Frontend Components

#### 1. My Certificates Page (`client/src/pages/certificates/MyCertificates.jsx`)

**Features:**

- Grid layout of all earned certificates
- Beautiful gradient cards with course icons
- Score badges
- Issue dates
- Verification codes
- Actions: Download, Verify, Share
- Empty state with call-to-action

**UI/UX:**

- Responsive grid (1 column mobile, 2 columns desktop)
- Hover effects and animations
- Professional color scheme
- Copy verification link functionality

#### 2. Certificate Verification Page (`client/src/pages/certificates/VerifyCertificate.jsx`)

**Features:**

- Public page (no authentication required)
- Search by verification code
- Displays certificate details if valid
- Shows error message if invalid
- Professional verification badge
- Recipient information
- Course details
- Issue date
- Score with progress bar
- Print functionality

**UI/UX:**

- Clean, professional design
- Success/error states
- Search form
- Printable layout
- Mobile responsive

#### 3. Navigation (`client/src/components/Layout.jsx`)

- Added "Certificates" link to main navigation
- Award icon
- Available to all roles

## Installation

### 1. Install Dependencies

```bash
cd api
npm install pdfkit qrcode
```

### 2. Environment Variables

Add to `api/.env`:

```env
RESEND_API_KEY=your_resend_api_key_here
APP_URL=http://localhost:5173  # or your production URL
```

### 3. Run Database Migration

Option A - Using Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy and paste contents of `api/migrations/add_certificates.sql`
4. Execute

Option B - Using psql:
```bash
psql your_connection_string -f api/migrations/add_certificates.sql
```

### 4. Update API Routes

The certificate routes are automatically registered in `api/index.js`:

```javascript
app.use('/api/certificates', certificatesRoutes);
```

## Usage

### Automatic Generation

Certificates are automatically generated when a user completes all modules in a course:

1. User completes final scenario in last module
2. Module completion triggers course completion check
3. If course is complete, certificate is generated
4. Email is sent with PDF attachment
5. Certificate is stored in database

### Manual Generation

Users can manually regenerate certificates via API:

```bash
POST /api/certificates/generate
{
  "courseId": "course-uuid"
}
```

### Viewing Certificates

Users can view their certificates at:
- `/certificates` - Certificate gallery

### Verification

Anyone can verify a certificate at:
- `/verify-certificate/:code` - Public verification page
- `/verify-certificate` - Search form

## Testing

### Test Checklist

- [ ] **Certificate Generation**
  - [ ] Complete a test course
  - [ ] Verify certificate is created in database
  - [ ] Check PDF formatting and content
  - [ ] Verify QR code is generated
  - [ ] Test score calculation

- [ ] **Email Delivery**
  - [ ] Configure Resend API key
  - [ ] Complete a course
  - [ ] Verify email is received
  - [ ] Check PDF attachment
  - [ ] Test email template rendering

- [ ] **Certificate Gallery**
  - [ ] Navigate to /certificates
  - [ ] Verify all certificates are displayed
  - [ ] Test download button
  - [ ] Test verify button (opens new tab)
  - [ ] Test share button (copies link)
  - [ ] Check empty state (no certificates)

- [ ] **Verification Page**
  - [ ] Navigate to /verify-certificate
  - [ ] Enter valid verification code
  - [ ] Verify certificate details are correct
  - [ ] Test invalid code (error message)
  - [ ] Test direct URL with code
  - [ ] Test print functionality

- [ ] **No Duplicates**
  - [ ] Complete same course twice
  - [ ] Verify only one certificate exists
  - [ ] Check existing certificate is returned

- [ ] **Navigation**
  - [ ] Verify "Certificates" link appears in nav
  - [ ] Check icon displays correctly
  - [ ] Test routing

- [ ] **Permissions**
  - [ ] Verify only user can see their own certificates
  - [ ] Test verification page is public (no auth)
  - [ ] Test download requires authentication

### Manual Testing Steps

1. **Setup Test User and Course:**
   ```bash
   # Create test user in Supabase
   # Create test course with 2-3 modules
   ```

2. **Complete Course:**
   - Login as test user
   - Navigate to test course
   - Complete all modules
   - Verify certificate appears in /certificates

3. **Test Email:**
   - Check test user's email
   - Verify certificate email received
   - Download PDF from email
   - Verify PDF content

4. **Test Verification:**
   - Copy verification code from certificate
   - Navigate to /verify-certificate
   - Enter code
   - Verify details match

5. **Test Edge Cases:**
   - Complete course again (should not create duplicate)
   - Invalid verification code
   - Expired/deleted certificates
   - Missing course/user data

## Troubleshooting

### Common Issues

**PDF Not Generating:**
- Check PDFKit and QRCode packages are installed
- Verify no errors in certificate generator logs
- Check user and course data exists

**Email Not Sending:**
- Verify RESEND_API_KEY is set in .env
- Check Resend dashboard for delivery status
- Verify email service is not rate limited
- Check email logs in API console

**Certificate Not Found:**
- Verify database migration ran successfully
- Check certificates table exists
- Verify RLS policies are correct
- Check user_id and course_id references

**Verification Code Issues:**
- Ensure code is uppercase and no spaces
- Check unique constraint on verification_code
- Verify code generation logic

**QR Code Not Scanning:**
- Verify APP_URL is set correctly in .env
- Check QR code data URL generation
- Test QR code with different scanners

## Future Enhancements

- [ ] Certificate templates (multiple designs)
- [ ] Custom branding per organization
- [ ] LinkedIn sharing integration
- [ ] Blockchain verification
- [ ] Certificate expiration dates
- [ ] Recertification reminders
- [ ] Certificate revocation
- [ ] Batch certificate generation
- [ ] Certificate analytics dashboard
- [ ] PDF storage in Supabase Storage (instead of base64)
- [ ] Signature support (digital signatures)
- [ ] Certificate levels (Bronze, Silver, Gold)
- [ ] Social media sharing cards

## API Reference

### Generate Certificate

```http
POST /api/certificates/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "uuid"
}

Response 200:
{
  "success": true,
  "certificate": {
    "id": "uuid",
    "verification_code": "XXXX-XXXX-XXXX",
    "score": 85,
    "issued_at": "2024-02-03T10:00:00Z"
  }
}
```

### List User Certificates

```http
GET /api/certificates
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "certificates": [
    {
      "id": "uuid",
      "verification_code": "XXXX-XXXX-XXXX",
      "score": 85,
      "issued_at": "2024-02-03T10:00:00Z",
      "course": {
        "name": "Customer Service Excellence",
        "category": "Phone Skills",
        "icon": "📞"
      }
    }
  ]
}
```

### Verify Certificate

```http
GET /api/certificates/verify/:code

Response 200:
{
  "success": true,
  "verified": true,
  "certificate": {
    "id": "uuid",
    "verification_code": "XXXX-XXXX-XXXX",
    "score": 85,
    "issued_at": "2024-02-03T10:00:00Z",
    "user": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "course": {
      "name": "Customer Service Excellence",
      "category": "Phone Skills"
    }
  }
}

Response 404:
{
  "success": false,
  "error": "Certificate not found"
}
```

### Download Certificate

```http
GET /api/certificates/:id/download
Authorization: Bearer <token>

Response 200:
Content-Type: application/pdf
Content-Disposition: attachment; filename="certificate-XXXX-XXXX-XXXX.pdf"

<PDF binary data>
```

## Security Considerations

1. **RLS Policies:**
   - Users can only view their own certificates (via authenticated routes)
   - Public verification uses specific policy
   - No direct inserts allowed via API

2. **Verification Codes:**
   - 12 characters, alphanumeric (excluding ambiguous chars)
   - Unique constraint enforced
   - Format: XXXX-XXXX-XXXX for readability

3. **PDF Storage:**
   - Currently stored as base64 in database
   - Production should use Supabase Storage or S3
   - Consider signed URLs for downloads

4. **Email Security:**
   - Uses Resend's secure email delivery
   - From address: certificates@selleverycall.com
   - Rate limiting via Resend

5. **Authentication:**
   - Download requires authentication
   - Verification is public (by design)
   - Certificate listing requires authentication

## Performance Considerations

1. **PDF Generation:**
   - Async operation
   - Cached in database
   - Consider moving to background job for large volumes

2. **Email Delivery:**
   - Async, non-blocking
   - Failure doesn't block certificate creation
   - Consider queue for retries

3. **Database Queries:**
   - Indexed on user_id, course_id, verification_code
   - Unique constraint prevents duplicates
   - RLS policies optimized

4. **QR Code Generation:**
   - Generated once during certificate creation
   - Embedded in PDF
   - No runtime generation needed

## License

Part of Sell Every Call Training Platform
