import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware } from '../lib/auth.js';

const router = Router();

/**
 * POST /api/auth/sync-user
 * Sync Clerk user to Supabase database
 * Creates organization and user profile on first login
 */
router.post('/sync-user', authMiddleware, async (req, res) => {
  try {
    const { clerkId, email, fullName, imageUrl } = req.body;

    // If user already exists in database, return their profile
    if (req.user) {
      return res.json({
        success: true,
        user: req.user,
        organization: req.organization,
        isNewUser: false
      });
    }

    // User authenticated with Clerk but not in database - create new user
    if (!clerkId || !email) {
      return res.status(400).json({ error: 'Missing required fields: clerkId, email' });
    }

    const adminClient = createAdminClient();

    // Create organization for new user
    const organizationName = fullName ? `${fullName}'s Organization` : 'My Organization';
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    // Calculate trial end date (10 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 10);

    const { data: org, error: orgError } = await adminClient
      .from(TABLES.ORGANIZATIONS)
      .insert({
        name: organizationName,
        slug: slug,
        subscription_status: 'trialing',
        subscription_plan: 'trial',
        training_hours_included: 1,
        training_hours_used: 0,
        trial_ends_at: trialEndsAt.toISOString(),
        settings: {
          aiModel: 'claude-sonnet-4-20250514',
          customPromptAdditions: '',
          scoringWeights: {
            empathyRapport: 20,
            problemResolution: 25,
            productKnowledge: 20,
            professionalism: 15,
            scenarioSpecific: 20
          },
          voicePreferences: {
            defaultVoiceId: '11labs-Brian'
          }
        }
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return res.status(500).json({ error: 'Failed to create organization' });
    }

    // Create primary branch
    const { data: branch, error: branchError } = await adminClient
      .from(TABLES.BRANCHES)
      .insert({
        organization_id: org.id,
        name: 'Main Office',
        is_primary: true,
        timezone: 'America/New_York'
      })
      .select()
      .single();

    if (branchError) {
      console.error('Error creating branch:', branchError);
    }

    // Create user profile with clerk_id
    const { data: userProfile, error: userError } = await adminClient
      .from(TABLES.USERS)
      .insert({
        clerk_id: clerkId,
        organization_id: org.id,
        branch_id: branch?.id,
        email: email,
        full_name: fullName || 'User',
        avatar_url: imageUrl,
        role: 'owner',
        status: 'active',
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        level: 1
      })
      .select(`
        *,
        organization:organizations(*),
        branch:branches(*)
      `)
      .single();

    if (userError) {
      console.error('Error creating user profile:', userError);
      // Cleanup: delete org if user creation failed
      await adminClient.from(TABLES.ORGANIZATIONS).delete().eq('id', org.id);
      return res.status(500).json({ error: 'Failed to create user profile', details: userError.message });
    }

    res.json({
      success: true,
      user: userProfile,
      organization: userProfile.organization,
      isNewUser: true
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/verify-invite
 * Verify an invitation token
 */
router.get('/verify-invite', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // In a real implementation, you'd store invitation tokens in a table
    // For now, we'll decode a simple JWT-like token
    // This is a placeholder - implement proper invitation token handling

    res.json({
      email: 'invited@example.com',
      organization_name: 'Example Org',
      role: 'trainee',
      full_name: ''
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired invitation' });
  }
});

/**
 * POST /api/auth/accept-invite
 * Accept an invitation and create user account
 */
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password, fullName } = req.body;

    if (!token || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Placeholder - implement proper invitation acceptance
    res.json({
      success: true,
      email: 'invited@example.com'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
