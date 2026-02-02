import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send an invitation email to a new user
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.inviterName - Name of the person who invited them
 * @param {string} params.organizationName - Name of the organization
 * @param {string} params.role - Role they're being invited as
 * @param {string} params.inviteUrl - The invitation acceptance URL
 * @returns {Promise<Object>} Result of the email send operation
 */
export async function sendInvitationEmail({ to, inviterName, organizationName, role, inviteUrl }) {
  if (!resend) {
    console.warn('[EMAIL] Resend not configured - skipping email send');
    return {
      success: false,
      error: 'Email service not configured',
      skipped: true
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Sell Every Call <invites@selleverycall.com>',
      to: [to],
      subject: `You've been invited to join ${organizationName}`,
      html: generateInvitationEmailHTML({
        inviterName,
        organizationName,
        role,
        inviteUrl
      })
    });

    if (error) {
      console.error('[EMAIL] Error sending invitation:', JSON.stringify(error, null, 2));
      return {
        success: false,
        error: error.message || 'Unknown error',
        errorDetails: error
      };
    }

    console.log(`[EMAIL] Invitation sent to ${to}, message ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[EMAIL] Exception sending invitation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML content for invitation email
 */
function generateInvitationEmailHTML({ inviterName, organizationName, role, inviteUrl }) {
  const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to ${organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Sell Every Call</h1>
    <p style="color: #666; margin-top: 8px;">CSR Training Platform</p>
  </div>

  <!-- Main Content -->
  <div style="background: #f8fafc; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
    <h2 style="margin-top: 0; color: #1e293b; font-size: 24px;">You've been invited!</h2>

    <p style="font-size: 16px; margin: 16px 0;">
      <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong>
      on Sell Every Call as a <strong>${roleDisplay}</strong>.
    </p>

    <p style="font-size: 16px; color: #475569; margin: 16px 0;">
      Sell Every Call is a powerful CSR training platform that helps teams improve their
      customer service skills through realistic call simulations and AI-powered coaching.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteUrl}"
         style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
      This invitation will expire in 7 days. If you didn't expect this invitation,
      you can safely ignore this email.
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; color: #94a3b8; font-size: 14px; padding: 20px 0; border-top: 1px solid #e2e8f0;">
    <p style="margin: 8px 0;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0; word-break: break-all;">
      <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
    </p>
    <p style="margin-top: 24px;">
      &copy; ${new Date().getFullYear()} Sell Every Call. All rights reserved.
    </p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
  return !!resend;
}
