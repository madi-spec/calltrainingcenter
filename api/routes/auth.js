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
    console.log('[Auth] User not found in database, creating new user...');
    console.log('[Auth] Request body:', { clerkId, email, fullName, imageUrl: imageUrl ? 'present' : 'missing' });

    if (!clerkId || !email) {
      console.log('[Auth] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: clerkId, email' });
    }

    console.log('[Auth] Creating admin client for insert...');
    const adminClient = createAdminClient();

    // Create organization for new user
    const organizationName = fullName ? `${fullName}'s Organization` : 'My Organization';
    console.log('[Auth] Creating organization:', organizationName);
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
      console.error('[Auth] Error creating organization:', orgError);
      return res.status(500).json({ error: 'Failed to create organization', details: orgError.message });
    }
    console.log('[Auth] Organization created:', { id: org.id, name: org.name });

    // Create primary branch
    console.log('[Auth] Creating branch...');
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
      console.error('[Auth] Error creating branch:', branchError);
    } else {
      console.log('[Auth] Branch created:', { id: branch?.id, name: branch?.name });
    }

    // Create user profile with clerk_id
    const userInsertData = {
      clerk_id: clerkId,
      organization_id: org.id,
      branch_id: branch?.id,
      email: email,
      full_name: fullName || 'User',
      avatar_url: imageUrl,
      role: 'super_admin',
      status: 'active',
      total_points: 0,
      current_streak: 0,
      longest_streak: 0,
      level: 1
    };
    console.log('[Auth] Creating user with data:', JSON.stringify(userInsertData, null, 2));

    const { data: userProfile, error: userError } = await adminClient
      .from(TABLES.USERS)
      .insert(userInsertData)
      .select(`
        *,
        organization:organizations(*),
        branch:branches(*)
      `)
      .single();

    console.log('[Auth] User created result:', userProfile ? { id: userProfile.id, role: userProfile.role, email: userProfile.email } : 'null');

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
 * Note: Invitation endpoints have been moved to /api/invitations
 *
 * For invitation functionality, use:
 * - GET /api/invitations/validate/:token - Validate an invitation token
 * - POST /api/invitations/accept - Accept an invitation
 * - POST /api/invitations/send - Send a new invitation
 */

export default router;
