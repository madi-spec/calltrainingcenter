/**
 * Social Features API Routes
 *
 * Handles colleague challenges, achievement sharing, and social interactions
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ========== COLLEAGUE CHALLENGES ==========

/**
 * GET /api/social/challenges/pending
 * Get pending challenges (sent to or from the user)
 */
router.get('/challenges/pending', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get challenges where user is challenger or challenged
    const { data: challenges } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .select(`
        *,
        challenger:users!colleague_challenges_challenger_id_fkey(id, full_name, email),
        challenged:users!colleague_challenges_challenged_id_fkey(id, full_name, email)
      `)
      .or(`challenger_id.eq.${req.user.id},challenged_id.eq.${req.user.id}`)
      .in('status', ['pending', 'accepted', 'in_progress'])
      .order('created_at', { ascending: false });

    // Separate into incoming and outgoing
    const incoming = challenges?.filter(c => c.challenged_id === req.user.id && c.status === 'pending') || [];
    const outgoing = challenges?.filter(c => c.challenger_id === req.user.id && c.status === 'pending') || [];
    const active = challenges?.filter(c => ['accepted', 'in_progress'].includes(c.status)) || [];

    res.json({
      success: true,
      incoming,
      outgoing,
      active
    });
  } catch (error) {
    console.error('Error fetching pending challenges:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/challenges/history
 * Get completed challenge history
 */
router.get('/challenges/history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const adminClient = createAdminClient();

    const { data: challenges } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .select(`
        *,
        challenger:users!colleague_challenges_challenger_id_fkey(id, full_name),
        challenged:users!colleague_challenges_challenged_id_fkey(id, full_name),
        results:challenge_results(user_id, score, duration_seconds)
      `)
      .or(`challenger_id.eq.${req.user.id},challenged_id.eq.${req.user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(parseInt(limit));

    // Calculate stats
    const wins = challenges?.filter(c => c.winner_id === req.user.id).length || 0;
    const total = challenges?.length || 0;

    res.json({
      success: true,
      challenges: challenges || [],
      stats: {
        wins,
        losses: total - wins,
        total,
        winRate: total > 0 ? Math.round(wins / total * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching challenge history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/challenges
 * Send a challenge to a colleague
 */
router.post('/challenges', async (req, res) => {
  try {
    const { challenged_id, scenario_id, wager_points, message } = req.body;

    if (!challenged_id || !scenario_id) {
      return res.status(400).json({ error: 'challenged_id and scenario_id are required' });
    }

    if (challenged_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot challenge yourself' });
    }

    const adminClient = createAdminClient();

    // Verify challenged user exists and is in same org
    const { data: challenged } = await adminClient
      .from(TABLES.USERS)
      .select('id, full_name, organization_id')
      .eq('id', challenged_id)
      .eq('organization_id', req.organization.id)
      .single();

    if (!challenged) {
      return res.status(404).json({ error: 'User not found in your organization' });
    }

    // Check for existing pending challenge with same users and scenario
    const { data: existing } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .select('id')
      .eq('challenger_id', req.user.id)
      .eq('challenged_id', challenged_id)
      .eq('scenario_id', scenario_id)
      .in('status', ['pending', 'accepted', 'in_progress'])
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Challenge already exists' });
    }

    // Set expiry (48 hours)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { data: challenge, error } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .insert({
        organization_id: req.organization.id,
        challenger_id: req.user.id,
        challenged_id,
        scenario_id,
        wager_points: wager_points || 0,
        message: message || null,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for challenged user
    await adminClient
      .from(TABLES.NOTIFICATIONS)
      .insert({
        organization_id: req.organization.id,
        user_id: challenged_id,
        type: 'system',
        title: 'New Challenge!',
        message: `${req.user.full_name} has challenged you!`,
        data: { challenge_id: challenge.id, scenario_id },
        social_reference_type: 'colleague_challenge',
        social_reference_id: challenge.id
      });

    res.json({
      success: true,
      challenge
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/challenges/:id/respond
 * Accept or decline a challenge
 */
router.post('/challenges/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const adminClient = createAdminClient();

    // Get challenge
    const { data: challenge } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .select('*')
      .eq('id', id)
      .eq('challenged_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found or already responded' });
    }

    // Check if expired
    if (new Date(challenge.expires_at) < new Date()) {
      await adminClient
        .from(TABLES.COLLEAGUE_CHALLENGES)
        .update({ status: 'expired' })
        .eq('id', id);

      return res.status(400).json({ error: 'Challenge has expired' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const { data: updated, error } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .update({
        status: newStatus,
        accepted_at: action === 'accept' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify challenger
    await adminClient
      .from(TABLES.NOTIFICATIONS)
      .insert({
        organization_id: req.organization.id,
        user_id: challenge.challenger_id,
        type: 'system',
        title: action === 'accept' ? 'Challenge Accepted!' : 'Challenge Declined',
        message: `${req.user.full_name} has ${action}ed your challenge!`,
        data: { challenge_id: id },
        social_reference_type: 'colleague_challenge',
        social_reference_id: id
      });

    res.json({
      success: true,
      challenge: updated
    });
  } catch (error) {
    console.error('Error responding to challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/challenges/:id/submit
 * Submit result for a challenge
 */
router.post('/challenges/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { session_id, score, duration_seconds } = req.body;

    const adminClient = createAdminClient();

    // Get challenge
    const { data: challenge } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .select('*')
      .eq('id', id)
      .in('status', ['accepted', 'in_progress'])
      .single();

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found or not active' });
    }

    // Verify user is participant
    if (challenge.challenger_id !== req.user.id && challenge.challenged_id !== req.user.id) {
      return res.status(403).json({ error: 'Not a participant in this challenge' });
    }

    // Check if already submitted
    const { data: existing } = await adminClient
      .from(TABLES.CHALLENGE_RESULTS)
      .select('id')
      .eq('challenge_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already submitted result' });
    }

    // Submit result
    const { data: result, error } = await adminClient
      .from(TABLES.CHALLENGE_RESULTS)
      .insert({
        challenge_id: id,
        user_id: req.user.id,
        session_id,
        score,
        duration_seconds
      })
      .select()
      .single();

    if (error) throw error;

    // Update challenge to in_progress if first submission
    if (challenge.status === 'accepted') {
      await adminClient
        .from(TABLES.COLLEAGUE_CHALLENGES)
        .update({ status: 'in_progress' })
        .eq('id', id);
    }

    // Check if both participants have submitted
    const { data: allResults } = await adminClient
      .from(TABLES.CHALLENGE_RESULTS)
      .select('user_id, score')
      .eq('challenge_id', id);

    if (allResults?.length === 2) {
      // Determine winner
      const challengerResult = allResults.find(r => r.user_id === challenge.challenger_id);
      const challengedResult = allResults.find(r => r.user_id === challenge.challenged_id);

      let winnerId = null;
      if (challengerResult && challengedResult) {
        if (challengerResult.score > challengedResult.score) {
          winnerId = challenge.challenger_id;
        } else if (challengedResult.score > challengerResult.score) {
          winnerId = challenge.challenged_id;
        }
        // If tie, no winner (null)
      }

      // Complete the challenge
      await adminClient
        .from(TABLES.COLLEAGUE_CHALLENGES)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner_id: winnerId
        })
        .eq('id', id);

      // Award wager points to winner
      if (winnerId && challenge.wager_points > 0) {
        await adminClient
          .from(TABLES.POINT_TRANSACTIONS)
          .insert({
            user_id: winnerId,
            organization_id: req.organization.id,
            points: challenge.wager_points,
            reason: 'Won colleague challenge',
            reference_type: 'colleague_challenge',
            reference_id: id
          });
      }

      // Notify both users
      const notifyUsers = [challenge.challenger_id, challenge.challenged_id];
      for (const userId of notifyUsers) {
        const won = userId === winnerId;
        const tied = winnerId === null;

        await adminClient
          .from(TABLES.NOTIFICATIONS)
          .insert({
            organization_id: req.organization.id,
            user_id: userId,
            type: 'achievement',
            title: tied ? 'Challenge Tied!' : (won ? 'Challenge Won!' : 'Challenge Complete'),
            message: tied ? 'You both scored the same!' :
                     (won ? 'Congratulations!' : 'Better luck next time!'),
            data: { challenge_id: id, won, tied },
            social_reference_type: 'colleague_challenge',
            social_reference_id: id
          });
      }
    }

    res.json({
      success: true,
      result,
      challenge_completed: allResults?.length === 2
    });
  } catch (error) {
    console.error('Error submitting challenge result:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/challenges/:id/results
 * Get results for a completed challenge
 */
router.get('/challenges/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { data: challenge } = await adminClient
      .from(TABLES.COLLEAGUE_CHALLENGES)
      .select(`
        *,
        challenger:users!colleague_challenges_challenger_id_fkey(id, full_name),
        challenged:users!colleague_challenges_challenged_id_fkey(id, full_name),
        winner:users!colleague_challenges_winner_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Verify user is participant
    if (challenge.challenger_id !== req.user.id && challenge.challenged_id !== req.user.id) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const { data: results } = await adminClient
      .from(TABLES.CHALLENGE_RESULTS)
      .select(`
        *,
        user:users(id, full_name)
      `)
      .eq('challenge_id', id);

    res.json({
      success: true,
      challenge,
      results: results || []
    });
  } catch (error) {
    console.error('Error fetching challenge results:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ACHIEVEMENT SHARING ==========

/**
 * GET /api/social/feed
 * Get social feed of shared achievements
 */
router.get('/feed', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const adminClient = createAdminClient();

    // Get shares visible to user (their own, team, or org)
    const { data: shares } = await adminClient
      .from(TABLES.ACHIEVEMENT_SHARES)
      .select(`
        *,
        user:users(id, full_name)
      `)
      .eq('organization_id', req.organization.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by visibility
    const visibleShares = shares?.filter(share => {
      if (share.user_id === req.user.id) return true;
      if (share.visibility === 'organization') return true;
      if (share.visibility === 'team' && share.user?.team_id === req.user.team_id) return true;
      return false;
    }) || [];

    // Check if user liked each share
    const shareIds = visibleShares.map(s => s.id);
    const { data: userLikes } = await adminClient
      .from(TABLES.ACHIEVEMENT_LIKES)
      .select('share_id')
      .eq('user_id', req.user.id)
      .in('share_id', shareIds);

    const likedIds = new Set(userLikes?.map(l => l.share_id) || []);

    const sharesWithLikeStatus = visibleShares.map(s => ({
      ...s,
      user_liked: likedIds.has(s.id)
    }));

    res.json({
      success: true,
      feed: sharesWithLikeStatus
    });
  } catch (error) {
    console.error('Error fetching social feed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/share
 * Share an achievement
 */
router.post('/share', async (req, res) => {
  try {
    const { achievement_type, achievement_id, achievement_data, message, visibility } = req.body;

    if (!achievement_type) {
      return res.status(400).json({ error: 'achievement_type is required' });
    }

    const adminClient = createAdminClient();

    const { data: share, error } = await adminClient
      .from(TABLES.ACHIEVEMENT_SHARES)
      .insert({
        user_id: req.user.id,
        organization_id: req.organization.id,
        achievement_type,
        achievement_id: achievement_id || null,
        achievement_data: achievement_data || {},
        message: message || null,
        visibility: visibility || 'team'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      share
    });
  } catch (error) {
    console.error('Error sharing achievement:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/shares/:id/like
 * Like/unlike a shared achievement
 */
router.post('/shares/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    // Check if already liked
    const { data: existing } = await adminClient
      .from(TABLES.ACHIEVEMENT_LIKES)
      .select('id')
      .eq('share_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      // Unlike
      await adminClient
        .from(TABLES.ACHIEVEMENT_LIKES)
        .delete()
        .eq('id', existing.id);

      await adminClient
        .from(TABLES.ACHIEVEMENT_SHARES)
        .update({
          likes_count: adminClient.raw('likes_count - 1')
        })
        .eq('id', id);

      return res.json({ success: true, liked: false });
    } else {
      // Like
      await adminClient
        .from(TABLES.ACHIEVEMENT_LIKES)
        .insert({
          share_id: id,
          user_id: req.user.id
        });

      await adminClient
        .from(TABLES.ACHIEVEMENT_SHARES)
        .update({
          likes_count: adminClient.raw('likes_count + 1')
        })
        .eq('id', id);

      return res.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('Error liking share:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/shares/:id/comments
 * Get comments for a shared achievement
 */
router.get('/shares/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { data: comments } = await adminClient
      .from(TABLES.ACHIEVEMENT_COMMENTS)
      .select(`
        *,
        user:users(id, full_name)
      `)
      .eq('share_id', id)
      .order('created_at', { ascending: true });

    res.json({
      success: true,
      comments: comments || []
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/shares/:id/comments
 * Add a comment to a shared achievement
 */
router.post('/shares/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const adminClient = createAdminClient();

    const { data: comment, error } = await adminClient
      .from(TABLES.ACHIEVEMENT_COMMENTS)
      .insert({
        share_id: id,
        user_id: req.user.id,
        content: content.trim()
      })
      .select(`
        *,
        user:users(id, full_name)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/colleagues
 * Get list of colleagues for challenging
 */
router.get('/colleagues', async (req, res) => {
  try {
    const { search } = req.query;
    const adminClient = createAdminClient();

    let query = adminClient
      .from(TABLES.USERS)
      .select('id, full_name, email, level, total_points, team_id')
      .eq('organization_id', req.organization.id)
      .eq('status', 'active')
      .neq('id', req.user.id)
      .order('full_name');

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: colleagues, error } = await query.limit(20);

    if (error) throw error;

    res.json({
      success: true,
      colleagues: colleagues || []
    });
  } catch (error) {
    console.error('Error fetching colleagues:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
