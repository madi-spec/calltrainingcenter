# Email Setup Guide

The invitation system uses [Resend](https://resend.com) to send invitation emails.

## Setup Steps

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day)
3. Verify your email address

### 2. Get Your API Key

1. Log into your Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Sell Every Call Production")
5. Copy the API key (starts with `re_`)

### 3. Add Domain (for production email sending)

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add `selleverycall.com`
4. Follow the DNS verification steps:
   - Add the provided DNS records to your domain registrar
   - Wait for verification (usually 5-15 minutes)

### 4. Configure Environment Variable

Add the API key to your environment:

**For local development:**
Add to `api/.env`:
```
RESEND_API_KEY=re_your_api_key_here
```

**For production (Vercel):**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add a new variable:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_your_api_key_here`
   - **Environments:** Production, Preview, Development
4. Redeploy your application

### 5. Update Email "From" Address (after domain verification)

Once your domain is verified, the system will automatically send emails from:
`invites@selleverycall.com`

This is already configured in `api/lib/email.js`.

## Testing

### Local Testing
Without a Resend API key, the system will:
- Still create invitation records in the database
- Log a warning that email is not configured
- Return the `inviteUrl` in the API response so you can manually share it

### With API Key
Once configured, invitations will be automatically sent via email.

## Free Tier Limits

Resend's free tier includes:
- 100 emails per day
- 3,000 emails per month
- All features included

For higher volume, check Resend's pricing page.

## Troubleshooting

**Email not sending:**
1. Check that `RESEND_API_KEY` is set in your environment
2. Verify the API key is valid (starts with `re_`)
3. Check server logs for error messages
4. Ensure your Resend account is verified

**Domain verification issues:**
1. Double-check DNS records match exactly what Resend provides
2. Wait up to 48 hours for DNS propagation (usually much faster)
3. Use a DNS checker tool to verify records are visible

**Still having issues?**
Check the API server logs - all email operations are logged with `[EMAIL]` prefix.
