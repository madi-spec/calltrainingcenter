/**
 * Invitations API Routes
 *
 * Handles sending and managing team invitations.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';
import { sendInvitationEmail } from '../lib/email.js';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/invitations
 * List all pending invitations for the organization
 */
router.get('/', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: invitations, error } = await adminClient
      .from('invitations')
      .select('*')
      .eq('organization_id', req.organization.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, invitations: invitations || [] });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invitations/send
 * Send an invitation to a new team member
 */
router.post('/send', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { email, role = 'trainee', team_id } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Validate role (managers can only invite trainees)
    const validRoles = req.user.role === 'manager' ? ['trainee'] : ['trainee', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Cannot invite with role: ${role}` });
    }

    const adminClient = createAdminClient();

    // Check if user already exists in organization
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('organization_id', req.organization.id)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists in organization' });
    }

    // Check if invitation already pending
    const { data: existingInvite } = await adminClient
      .from('invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('organization_id', req.organization.id)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already pending for this email' });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { data: invitation, error } = await adminClient
      .from('invitations')
      .insert({
        organization_id: req.organization.id,
        email: email.toLowerCase(),
        role,
        team_id,
        token,
        invited_by: req.user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Generate invite URL
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/auth/accept-invite?token=${token}`;

    // Get organization name for email
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', req.organization.id)
      .single();

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: req.user.full_name || req.user.email,
      organizationName: org?.name || req.organization.name,
      role,
      inviteUrl
    });

    if (emailResult.success) {
      console.log(`[INVITE] Email sent successfully to ${email}`);
    } else if (emailResult.skipped) {
      console.log(`[INVITE] Email sending skipped (not configured), invitation URL: ${inviteUrl}`);
    } else {
      console.error(`[INVITE] Failed to send email to ${email}:`, emailResult.error);
    }

    res.json({
      success: true,
      message: emailResult.success
        ? `Invitation sent to ${email}`
        : `Invitation created for ${email} (email not configured)`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at
      },
      emailSent: emailResult.success,
      // Include URL in response if email wasn't sent
      ...(!emailResult.success && { inviteUrl })
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invitations/accept
 * Accept an invitation (public endpoint)
 */
router.post('/accept', async (req, res) => {
  try {
    const { token, clerk_user_id, full_name } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required' });
    }

    if (!clerk_user_id) {
      return res.status(400).json({ error: 'Clerk user ID is required. Please ensure your account was created successfully.' });
    }

    const adminClient = createAdminClient();

    // Find invitation
    const { data: invitation, error: inviteError } = await adminClient
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await adminClient
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check if a user with this clerk_id already exists (prevent duplicates)
    const { data: existingClerkUser } = await adminClient
      .from('users')
      .select('id, email, clerk_id')
      .eq('clerk_id', clerk_user_id)
      .single();

    if (existingClerkUser) {
      // This clerk_id is already associated with a user - possible session contamination
      console.warn(`[INVITE] clerk_id ${clerk_user_id} already belongs to user ${existingClerkUser.email}. Invitation email: ${invitation.email}`);
      return res.status(400).json({
        error: 'This account is already registered. Please sign out first, then try accepting the invitation again.'
      });
    }

    // Check if a user with this email already exists in the organization (from a previous failed attempt)
    const { data: existingEmailUser } = await adminClient
      .from('users')
      .select('id, email, clerk_id')
      .eq('email', invitation.email)
      .eq('organization_id', invitation.organization_id)
      .single();

    let user;
    if (existingEmailUser && !existingEmailUser.clerk_id) {
      // User record exists with null clerk_id from a previous failed attempt - update it
      console.log(`[INVITE] Updating existing user record (null clerk_id) for ${invitation.email}`);
      const { data: updatedUser, error: updateError } = await adminClient
        .from('users')
        .update({
          clerk_id: clerk_user_id,
          full_name: full_name || existingEmailUser.full_name || invitation.email.split('@')[0],
          status: 'active'
        })
        .eq('id', existingEmailUser.id)
        .select()
        .single();

      if (updateError) throw updateError;
      user = updatedUser;
    } else if (existingEmailUser) {
      // User already exists with a different clerk_id - this shouldn't happen normally
      console.warn(`[INVITE] User ${invitation.email} already exists with clerk_id ${existingEmailUser.clerk_id}, new clerk_id: ${clerk_user_id}`);
      // Update the clerk_id to the new one (user may have re-registered with Clerk)
      const { data: updatedUser, error: updateError } = await adminClient
        .from('users')
        .update({
          clerk_id: clerk_user_id,
          full_name: full_name || invitation.email.split('@')[0],
          status: 'active'
        })
        .eq('id', existingEmailUser.id)
        .select()
        .single();

      if (updateError) throw updateError;
      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: userError } = await adminClient
        .from('users')
        .insert({
          organization_id: invitation.organization_id,
          clerk_id: clerk_user_id,
          email: invitation.email,
          full_name: full_name || invitation.email.split('@')[0],
          role: invitation.role,
          branch_id: invitation.branch_id,
          status: 'active',
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          level: 1
        })
        .select()
        .single();

      if (userError) throw userError;
      user = newUser;
    }

    // Mark invitation as accepted
    await adminClient
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id
      }
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invitations/validate/:token
 * Validate an invitation token (public endpoint)
 */
router.get('/validate/:token', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: invitation, error } = await adminClient
      .from('invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        status,
        organization:organizations(id, name)
      `)
      .eq('token', req.params.token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invalid invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation already used or expired' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization?.name
      }
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/invitations/:id
 * Cancel an invitation
 */
router.delete('/:id', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invitations/:id/resend
 * Resend an invitation
 */
router.post('/:id/resend', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Generate new token and extend expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error } = await adminClient
      .from('invitations')
      .update({
        token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/auth/accept-invite?token=${token}`;

    // Get organization name for email
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', req.organization.id)
      .single();

    // Resend invitation email
    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      inviterName: req.user.full_name || req.user.email,
      organizationName: org?.name || req.organization.name,
      role: invitation.role,
      inviteUrl
    });

    if (emailResult.success) {
      console.log(`[INVITE] Email resent successfully to ${invitation.email}`);
    } else if (emailResult.skipped) {
      console.log(`[INVITE] Email sending skipped (not configured), invitation URL: ${inviteUrl}`);
    } else {
      console.error(`[INVITE] Failed to resend email to ${invitation.email}:`, emailResult.error);
    }

    res.json({
      success: true,
      message: emailResult.success
        ? `Invitation resent to ${invitation.email}`
        : `Invitation updated for ${invitation.email} (email not configured)`,
      invitation,
      emailSent: emailResult.success,
      // Include URL in response if email wasn't sent
      ...(!emailResult.success && { inviteUrl })
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
