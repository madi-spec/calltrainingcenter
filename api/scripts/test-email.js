/**
 * Test Resend email configuration
 * Usage: node api/scripts/test-email.js <recipient-email>
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function testEmail(recipientEmail) {
  if (!recipientEmail) {
    console.error('Usage: node api/scripts/test-email.js <recipient-email>');
    process.exit(1);
  }

  console.log('\n=== Testing Resend Email Configuration ===\n');

  // Check if API key exists
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in environment variables');
    console.log('\nMake sure RESEND_API_KEY is set in api/.env file\n');
    process.exit(1);
  }

  console.log('✓ RESEND_API_KEY found:', process.env.RESEND_API_KEY.substring(0, 10) + '...');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log(`\n📧 Attempting to send test email to: ${recipientEmail}`);
    console.log('From: Sell Every Call <invites@selleverycall.com>\n');

    const { data, error } = await resend.emails.send({
      from: 'Sell Every Call <invites@selleverycall.com>',
      to: [recipientEmail],
      subject: 'Test Email from Sell Every Call',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend configuration.</p>
        <p>If you received this, the email service is working correctly!</p>
      `
    });

    if (error) {
      console.error('❌ Error sending email:');
      console.error(JSON.stringify(error, null, 2));

      // Common error diagnostics
      if (error.message?.includes('domain')) {
        console.log('\n💡 Domain Issue Detected:');
        console.log('   - Make sure selleverycall.com is verified in Resend dashboard');
        console.log('   - Check that all DNS records are properly configured');
        console.log('   - DNS changes can take up to 48 hours to propagate');
      }

      if (error.message?.includes('api key') || error.message?.includes('authentication')) {
        console.log('\n💡 API Key Issue Detected:');
        console.log('   - Verify the API key is correct');
        console.log('   - Make sure the API key has permission to send emails');
        console.log('   - Try regenerating the API key in Resend dashboard');
      }

      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log('\nEmail Details:');
    console.log('  Message ID:', data.id);
    console.log('  Status: Sent');
    console.log(`\n✓ Check ${recipientEmail} inbox for the test email\n`);

  } catch (error) {
    console.error('❌ Exception:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

const recipientEmail = process.argv[2];
testEmail(recipientEmail);
