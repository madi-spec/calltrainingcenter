/**
 * Weekly Digest Email Template
 * HTML email template for manager weekly digest emails
 */

/**
 * Generate the HTML email for weekly digest
 * @param {Object} data - Email data
 * @param {Object} data.manager - Manager information {full_name, email}
 * @param {Object} data.organization - Organization information {name, logo_url}
 * @param {Object} data.teamStats - Team statistics
 * @param {Array} data.topPerformers - Top 3 performers
 * @param {Array} data.needsAttention - Team members needing attention
 * @param {Array} data.focusAreas - Suggested focus areas
 * @param {string} data.weekRange - Date range string (e.g., "Jan 27 - Feb 2, 2026")
 * @param {string} data.unsubscribeUrl - Unsubscribe/preferences URL
 * @returns {string} HTML email content
 */
export function generateWeeklyDigestHTML(data) {
  const {
    manager,
    organization,
    teamStats,
    topPerformers,
    needsAttention,
    focusAreas,
    weekRange,
    unsubscribeUrl
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Team Performance Digest</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f1f5f9;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
      color: #334155;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .stats-grid {
      display: table;
      width: 100%;
      border-collapse: collapse;
    }
    .stat-item {
      display: table-cell;
      padding: 16px;
      text-align: center;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #2563eb;
      display: block;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 14px;
      color: #64748b;
      display: block;
    }
    .performer-card, .attention-card {
      background-color: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .attention-card {
      border-left-color: #ef4444;
      background-color: #fef2f2;
    }
    .performer-name {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }
    .performer-stats {
      font-size: 14px;
      color: #475569;
      margin: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    .badge-gold {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-silver {
      background-color: #e5e7eb;
      color: #374151;
    }
    .badge-bronze {
      background-color: #fed7aa;
      color: #9a3412;
    }
    .focus-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .focus-list li {
      padding: 12px 16px;
      background-color: #fef9c3;
      border-left: 3px solid #eab308;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 15px;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
    .empty-state {
      text-align: center;
      padding: 24px;
      color: #64748b;
      font-style: italic;
    }
    @media only screen and (max-width: 600px) {
      .stats-grid {
        display: block;
      }
      .stat-item {
        display: block;
        border-bottom: none;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Weekly Team Digest</h1>
      <p>${weekRange}</p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <p class="greeting">Hi ${manager.full_name},</p>

      <p>Here's your weekly team performance summary for <strong>${organization.name}</strong>.</p>

      <!-- Quick Stats Section -->
      <div class="section">
        <h2 class="section-title">📈 Quick Stats</h2>
        <table class="stats-grid" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="stat-item">
              <span class="stat-value">${teamStats.avgScore}%</span>
              <span class="stat-label">Avg Score</span>
            </td>
            <td class="stat-item">
              <span class="stat-value">${teamStats.totalSessions}</span>
              <span class="stat-label">Total Sessions</span>
            </td>
            <td class="stat-item">
              <span class="stat-value">${teamStats.completionRate}%</span>
              <span class="stat-label">Completion Rate</span>
            </td>
          </tr>
        </table>
        <p style="margin-top: 16px; font-size: 15px; color: #475569;">
          <strong>Practice Compliance:</strong> ${teamStats.completedRequired}/${teamStats.totalRequired} team members completed required practice this week
        </p>
      </div>

      <!-- Top Performers Section -->
      <div class="section">
        <h2 class="section-title">🏆 Top Performers</h2>
        ${topPerformers.length > 0 ? topPerformers.map((performer, index) => `
          <div class="performer-card">
            <p class="performer-name">
              ${performer.full_name}
              ${index === 0 ? '<span class="badge badge-gold">🥇 #1</span>' : ''}
              ${index === 1 ? '<span class="badge badge-silver">🥈 #2</span>' : ''}
              ${index === 2 ? '<span class="badge badge-bronze">🥉 #3</span>' : ''}
            </p>
            <p class="performer-stats">
              ${performer.sessions} sessions • Avg score: <strong>${performer.avgScore}%</strong> • ${performer.totalMinutes} minutes practiced
            </p>
          </div>
        `).join('') : '<div class="empty-state">No sessions completed this week</div>'}
      </div>

      <!-- Needs Attention Section -->
      ${needsAttention.length > 0 ? `
      <div class="section">
        <h2 class="section-title">⚠️ Team Members Needing Attention</h2>
        ${needsAttention.map(member => `
          <div class="attention-card">
            <p class="performer-name">${member.full_name}</p>
            <p class="performer-stats">
              ${member.reason}
              ${member.sessions !== undefined ? ` • ${member.sessions} sessions` : ''}
              ${member.avgScore !== undefined ? ` • Avg score: ${member.avgScore}%` : ''}
            </p>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Focus Areas Section -->
      ${focusAreas.length > 0 ? `
      <div class="section">
        <h2 class="section-title">💡 Suggested Focus Areas</h2>
        <ul class="focus-list">
          ${focusAreas.map(area => `<li>${area}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <!-- Call to Action -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.APP_URL || 'https://selleverycall.com'}/dashboard" class="cta-button">
          View Full Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 16px 0;">
        <strong>Sell Every Call</strong><br>
        AI-Powered CSR Training Platform
      </p>
      <p style="margin: 0 0 8px 0;">
        <a href="${unsubscribeUrl}">Manage Email Preferences</a>
      </p>
      <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Sell Every Call. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version for email clients that don't support HTML
 */
export function generateWeeklyDigestText(data) {
  const {
    manager,
    organization,
    teamStats,
    topPerformers,
    needsAttention,
    focusAreas,
    weekRange,
    unsubscribeUrl
  } = data;

  let text = `WEEKLY TEAM DIGEST\n`;
  text += `${weekRange}\n\n`;
  text += `Hi ${manager.full_name},\n\n`;
  text += `Here's your weekly team performance summary for ${organization.name}.\n\n`;

  text += `QUICK STATS\n`;
  text += `===========\n`;
  text += `Average Score: ${teamStats.avgScore}%\n`;
  text += `Total Sessions: ${teamStats.totalSessions}\n`;
  text += `Completion Rate: ${teamStats.completionRate}%\n`;
  text += `Practice Compliance: ${teamStats.completedRequired}/${teamStats.totalRequired} completed required practice\n\n`;

  text += `TOP PERFORMERS\n`;
  text += `==============\n`;
  if (topPerformers.length > 0) {
    topPerformers.forEach((performer, index) => {
      text += `${index + 1}. ${performer.full_name}\n`;
      text += `   ${performer.sessions} sessions • Avg score: ${performer.avgScore}% • ${performer.totalMinutes} min\n\n`;
    });
  } else {
    text += `No sessions completed this week\n\n`;
  }

  if (needsAttention.length > 0) {
    text += `TEAM MEMBERS NEEDING ATTENTION\n`;
    text += `==============================\n`;
    needsAttention.forEach(member => {
      text += `- ${member.full_name}: ${member.reason}\n`;
    });
    text += `\n`;
  }

  if (focusAreas.length > 0) {
    text += `SUGGESTED FOCUS AREAS\n`;
    text += `=====================\n`;
    focusAreas.forEach(area => {
      text += `- ${area}\n`;
    });
    text += `\n`;
  }

  text += `View full dashboard: ${process.env.APP_URL || 'https://selleverycall.com'}/dashboard\n\n`;
  text += `---\n`;
  text += `Manage email preferences: ${unsubscribeUrl}\n`;
  text += `© ${new Date().getFullYear()} Sell Every Call. All rights reserved.\n`;

  return text;
}
