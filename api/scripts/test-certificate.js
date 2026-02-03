/**
 * Test certificate generation
 * Usage: node scripts/test-certificate.js
 */

import 'dotenv/config';
import { generateCertificate } from '../services/certificateGenerator.js';

async function testCertificate() {
  console.log('[TEST] Testing certificate generation...\n');

  try {
    // Test data - you'll need to replace these with actual IDs from your database
    const testData = {
      userId: '00000000-0000-0000-0000-000000000001', // Replace with real user ID
      courseId: '00000000-0000-0000-0000-000000000001', // Replace with real course ID
      userName: 'John Doe',
      courseName: 'Customer Service Excellence',
      organizationName: 'Accel Pest & Termite Control',
      userEmail: 'test@example.com'
    };

    console.log('[TEST] Generating certificate with data:', testData);

    const certificate = await generateCertificate(testData);

    console.log('\n[TEST] Certificate generated successfully!');
    console.log('Certificate ID:', certificate.id);
    console.log('Verification Code:', certificate.verification_code);
    console.log('Score:', certificate.score);
    console.log('Issued At:', certificate.issued_at);

    console.log('\n[TEST] You can verify this certificate at:');
    console.log(`http://localhost:5173/verify-certificate/${certificate.verification_code}`);

  } catch (error) {
    console.error('[TEST] Error:', error.message);
    console.error(error);
  }
}

testCertificate();
