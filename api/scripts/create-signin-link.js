/**
 * Create a sign-in link for a user via Clerk
 * Usage: node api/scripts/create-signin-link.js <email>
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function createSignInLink(email) {
  if (!email) {
    console.error('Usage: node api/scripts/create-signin-link.js <email>');
    process.exit(1);
  }

  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });

    console.log(`\n=== Creating Sign-In Link for ${email} ===\n`);

    // Find user by email
    const users = await clerkClient.users.getUserList({
      emailAddress: [email]
    });

    if (!users || users.data.length === 0) {
      console.error('❌ User not found in Clerk');
      process.exit(1);
    }

    const user = users.data[0];
    console.log('✓ User found in Clerk:');
    console.log(`  User ID: ${user.id}`);
    console.log(`  Email: ${user.emailAddresses[0]?.emailAddress}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);

    // Create sign-in token
    const signInToken = await clerkClient.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 3600 // 1 hour
    });

    const signInUrl = signInToken.url;

    console.log('\n✓ Sign-in link created!\n');
    console.log('─'.repeat(80));
    console.log(signInUrl);
    console.log('─'.repeat(80));
    console.log('\n✓ This link expires in 1 hour');
    console.log('✓ Copy this URL and paste it in your browser to sign in as this user\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

const email = process.argv[2];
createSignInLink(email);
