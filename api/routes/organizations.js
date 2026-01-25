/**
 * Organizations API Routes
 *
 * Handles organization settings, setup wizard, and invitations.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic();

/**
 * Fetch a URL and convert to text
 */
async function fetchPageContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CSRTrainingBot/1.0)'
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    const html = await response.text();
    // Basic HTML to text conversion
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit content size
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * Extract links from HTML
 */
function extractLinks(html, baseUrl) {
  const links = new Set();
  const linkRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    if (href.startsWith('/')) {
      href = new URL(href, baseUrl).href;
    }
    if (href.startsWith(baseUrl) && !href.includes('#') && !href.match(/\.(pdf|jpg|png|gif|css|js)$/i)) {
      links.add(href);
    }
  }

  return Array.from(links);
}

/**
 * Extract logo URL from HTML
 */
function extractLogoUrl(html, baseUrl) {
  // Common patterns for logos
  const logoPatterns = [
    // Look for img tags with logo in class/id/alt
    /<img[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    /<img[^>]*src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*logo[^"']*["']/gi,
    /<img[^>]*alt=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    // Look for header/nav images
    /<header[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/gi,
    /<nav[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/gi,
    // Look for link with logo
    /<a[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/gi,
    // Open Graph image (often the logo)
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/gi
  ];

  for (const pattern of logoPatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      let logoUrl = match[1];
      // Make absolute URL
      if (logoUrl.startsWith('//')) {
        logoUrl = 'https:' + logoUrl;
      } else if (logoUrl.startsWith('/')) {
        logoUrl = new URL(logoUrl, baseUrl).href;
      } else if (!logoUrl.startsWith('http')) {
        logoUrl = new URL(logoUrl, baseUrl).href;
      }
      // Skip tiny images and icons
      if (!logoUrl.includes('favicon') && !logoUrl.includes('icon')) {
        return logoUrl;
      }
    }
  }
  return null;
}

/**
 * Extract brand colors from HTML/CSS
 */
function extractBrandColors(html) {
  const colors = {
    primary: null,
    secondary: null,
    accent: null
  };

  // Look for theme-color meta tag
  const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
  if (themeColorMatch) {
    colors.primary = themeColorMatch[1];
  }

  // Look for CSS custom properties (common in modern sites)
  const primaryVarMatch = html.match(/--(?:primary|brand|main)(?:-color)?:\s*([#\w(),.%\s]+);/i);
  if (primaryVarMatch) {
    colors.primary = primaryVarMatch[1].trim();
  }

  const secondaryVarMatch = html.match(/--(?:secondary|accent)(?:-color)?:\s*([#\w(),.%\s]+);/i);
  if (secondaryVarMatch) {
    colors.secondary = secondaryVarMatch[1].trim();
  }

  // Look for common header/button background colors in inline styles
  const headerBgMatch = html.match(/(?:header|nav)[^{]*\{[^}]*background(?:-color)?:\s*([#\w(),.%\s]+);/i);
  if (headerBgMatch && !colors.primary) {
    colors.primary = headerBgMatch[1].trim();
  }

  return colors;
}

const router = Router();

/**
 * GET /api/organizations/current
 * Get current organization details
 */
router.get('/current', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: org, error } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', req.organization.id)
      .single();

    if (error) throw error;

    console.log('[ORG CURRENT] Returning org data:', {
      id: org.id,
      name: org.name,
      logo_url: org.logo_url,
      brand_colors: org.brand_colors
    });

    res.json({ success: true, organization: org });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/organizations/update
 * Update organization details
 */
router.put('/update', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { name, phone, website, address, services, guarantees, settings, service_areas, value_propositions, business_hours, pricing, logo_url, brand_colors, tagline } = req.body;
    const adminClient = createAdminClient();

    // Build update data with only defined fields
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) {
      // Normalize website URL to consistent format
      let normalizedUrl = website.trim().replace(/\\/g, '/');
      normalizedUrl = normalizedUrl.replace(/^https?:\/\//i, '');
      normalizedUrl = normalizedUrl.replace(/\/+$/, '');
      updateData.website = 'https://' + normalizedUrl;
    }
    if (services !== undefined) updateData.services = services;
    if (guarantees !== undefined) updateData.guarantees = guarantees;
    if (settings !== undefined) updateData.settings = settings;

    // These fields might not exist in older schemas - handle gracefully
    const optionalFields = { address, service_areas, value_propositions, business_hours, pricing, logo_url, brand_colors, tagline };

    console.log('[ORG UPDATE] Updating organization with:', {
      ...updateData,
      optionalFields: Object.keys(optionalFields).filter(k => optionalFields[k] !== undefined)
    });

    // First, try to update with all fields
    try {
      for (const [key, value] of Object.entries(optionalFields)) {
        if (value !== undefined) updateData[key] = value;
      }

      const { data: org, error } = await adminClient
        .from('organizations')
        .update(updateData)
        .eq('id', req.organization.id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, organization: org });
    } catch (firstError) {
      // If error mentions a column, retry without optional fields
      if (firstError.message?.includes('column')) {
        console.log('[ORG UPDATE] Column error, retrying without optional fields:', firstError.message);
        console.log('[ORG UPDATE] WARNING: logo_url, brand_colors, tagline will NOT be saved. Run schema migration to fix.');
        const basicUpdateData = {
          updated_at: new Date().toISOString()
        };
        if (name) basicUpdateData.name = name;
        if (phone !== undefined) basicUpdateData.phone = phone;
        if (website !== undefined) basicUpdateData.website = website;
        if (services !== undefined) basicUpdateData.services = services;
        if (guarantees !== undefined) basicUpdateData.guarantees = guarantees;
        if (settings !== undefined) basicUpdateData.settings = settings;

        const { data: org, error } = await adminClient
          .from('organizations')
          .update(basicUpdateData)
          .eq('id', req.organization.id)
          .select()
          .single();

        if (error) throw error;
        return res.json({ success: true, organization: org });
      }
      throw firstError;
    }
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/organizations/complete-setup
 * Mark organization setup as complete and save all step data
 */
router.post('/complete-setup', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { setupData } = req.body;

    // Get current organization settings, defaulting to empty object if null
    const currentSettings = req.organization?.settings || {};

    console.log('[SETUP] Completing setup for org:', req.organization?.id);
    console.log('[SETUP] Current settings:', JSON.stringify(currentSettings));
    console.log('[SETUP] Step data received:', JSON.stringify(setupData));

    // Build update data from step data
    const updateData = {
      settings: {
        ...currentSettings,
        setupComplete: true,
        setupCompletedAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    // Extract company info step data
    if (setupData?.company) {
      const company = setupData.company;
      if (company.name) updateData.name = company.name;
      if (company.phone) updateData.phone = company.phone;
      if (company.website) {
        // Normalize website URL to consistent format
        let normalizedUrl = company.website.trim().replace(/\\/g, '/');
        normalizedUrl = normalizedUrl.replace(/^https?:\/\//i, '');
        normalizedUrl = normalizedUrl.replace(/\/+$/, '');
        updateData.website = 'https://' + normalizedUrl;
      }
      if (company.logo_url) updateData.logo_url = company.logo_url;
      if (company.tagline) updateData.tagline = company.tagline;
      if (company.brand_colors) updateData.brand_colors = company.brand_colors;
      if (company.services) updateData.services = company.services;
      if (company.guarantees) updateData.guarantees = company.guarantees;
      if (company.service_areas) updateData.service_areas = company.service_areas;
      if (company.value_propositions) updateData.value_propositions = company.value_propositions;
      if (company.business_hours) updateData.business_hours = company.business_hours;
    }

    // Extract packages from packages step
    if (setupData?.packages?.packages) {
      updateData.pricing = { packages: setupData.packages.packages };
    }

    // Note: Service lines are stored in company_service_lines table, not on organizations
    // They would be saved via a separate endpoint if needed

    // Extract objections step data
    if (setupData?.objections?.objections) {
      updateData.settings = {
        ...updateData.settings,
        objections: setupData.objections.objections
      };
    }

    // Extract competitors step data
    if (setupData?.competitors?.competitors) {
      updateData.settings = {
        ...updateData.settings,
        competitors: setupData.competitors.competitors
      };
    }

    console.log('[SETUP] Final update data:', JSON.stringify(updateData, null, 2));

    const { data: org, error } = await adminClient
      .from('organizations')
      .update(updateData)
      .eq('id', req.organization.id)
      .select()
      .single();

    if (error) {
      console.error('[SETUP] Database error:', error);
      throw error;
    }

    console.log('[SETUP] Setup completed successfully');
    console.log('[SETUP] Saved org data:', {
      name: org.name,
      logo_url: org.logo_url,
      brand_colors: org.brand_colors
    });
    res.json({ success: true, organization: org });
  } catch (error) {
    console.error('[SETUP] Error completing setup:', error);
    res.status(500).json({ error: error.message || 'Failed to complete setup' });
  }
});

/**
 * POST /api/organizations/scrape-website
 * Extract company info from website using AI
 */
router.post('/scrape-website', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { website } = req.body;

    if (!website) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    // Normalize URL to handle various input formats:
    // go-forth.com, www.go-forth.com, https://go-forth.com, etc.
    let baseUrl = website.trim();
    // Replace backslashes with forward slashes (Windows path issue)
    baseUrl = baseUrl.replace(/\\/g, '/');
    // Remove any protocol prefix to normalize
    baseUrl = baseUrl.replace(/^https?:\/\//i, '');
    // Remove trailing slashes
    baseUrl = baseUrl.replace(/\/+$/, '');
    // Add https:// prefix
    baseUrl = 'https://' + baseUrl;

    console.log(`[SCRAPE] Starting website scrape: ${baseUrl}`);

    // Fetch homepage
    const homepageResponse = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CSRTrainingBot/1.0)' },
      signal: AbortSignal.timeout(15000)
    });

    if (!homepageResponse.ok) {
      return res.status(400).json({ error: 'Could not access website' });
    }

    const homepageHtml = await homepageResponse.text();

    // Extract logo and brand colors from HTML before stripping tags
    const logoUrl = extractLogoUrl(homepageHtml, baseUrl);
    const brandColors = extractBrandColors(homepageHtml);

    console.log(`[SCRAPE] Extracted logo: ${logoUrl}`);
    console.log(`[SCRAPE] Extracted brand colors:`, brandColors);

    const homepageText = homepageHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Find important pages to scrape
    const links = extractLinks(homepageHtml, baseUrl);
    const importantPages = links.filter(link => {
      const lower = link.toLowerCase();
      return lower.includes('service') ||
             lower.includes('pricing') ||
             lower.includes('price') ||
             lower.includes('package') ||
             lower.includes('plan') ||
             lower.includes('about') ||
             lower.includes('residential') ||
             lower.includes('commercial') ||
             lower.includes('pest') ||
             lower.includes('termite') ||
             lower.includes('rodent') ||
             lower.includes('mosquito') ||
             lower.includes('contact');
    }).slice(0, 5); // Limit to 5 additional pages

    console.log(`[SCRAPE] Found ${importantPages.length} important pages to scrape`);

    // Fetch additional pages
    const pageContents = [{ url: baseUrl, content: homepageText.slice(0, 10000) }];

    for (const pageUrl of importantPages) {
      const content = await fetchPageContent(pageUrl);
      if (content) {
        pageContents.push({ url: pageUrl, content: content.slice(0, 8000) });
      }
    }

    console.log(`[SCRAPE] Scraped ${pageContents.length} pages total`);

    // Build content for AI analysis
    const allContent = pageContents
      .map(p => `=== Page: ${p.url} ===\n${p.content}`)
      .join('\n\n');

    // Use Claude to extract structured data
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are analyzing a pest control company's website to extract business information.

Website content from multiple pages:
${allContent.slice(0, 30000)}

Extract all available information and return ONLY valid JSON (no markdown, no explanation):
{
  "name": "Company name",
  "phone": "Main phone number",
  "address": "Full address if found",
  "services": ["List of services offered - be specific: General Pest Control, Termite Control, Rodent Control, etc."],
  "guarantees": ["List of guarantees or warranties mentioned"],
  "packages": [
    {
      "name": "Package/Plan name",
      "description": "What's included",
      "price": "Price if mentioned",
      "frequency": "monthly/quarterly/annual/one-time"
    }
  ],
  "competitors_mentioned": ["Any competitor names mentioned"],
  "service_areas": ["Cities or regions served"],
  "value_propositions": ["Key selling points, differentiators, or unique benefits mentioned"],
  "business_hours": "Business hours if found",
  "brand_colors": {
    "primary": "Primary brand color as hex code (e.g., #1a5f2c) - look for header backgrounds, buttons, logos",
    "secondary": "Secondary brand color as hex code if visible",
    "accent": "Accent color as hex code if visible"
  },
  "tagline": "Company tagline or slogan if found"
}

Important:
- Extract actual data found on the website, don't make up information
- For services, be specific to pest control (e.g., "Ant Control", "Bed Bug Treatment", not generic terms)
- For packages, extract any pricing plans, service tiers, or subscription options
- For brand_colors, try to identify the dominant colors used in the website design (headers, buttons, CTAs)
- Return null for fields where no information was found
- Return valid JSON only`
      }]
    });

    const responseText = message.content[0].text;
    console.log('[SCRAPE] AI response received');

    // Parse AI response
    let extracted;
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        extracted = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('[SCRAPE] Failed to parse AI response:', parseError);
      return res.status(500).json({ error: 'Failed to parse website data' });
    }

    // Add logo URL extracted from HTML (prefer HTML extraction over AI guess)
    if (logoUrl) {
      extracted.logo_url = logoUrl;
    }

    // Merge brand colors - prefer HTML-extracted colors, fall back to AI-extracted
    if (extracted.brand_colors || brandColors.primary) {
      extracted.brand_colors = {
        primary: brandColors.primary || extracted.brand_colors?.primary || null,
        secondary: brandColors.secondary || extracted.brand_colors?.secondary || null,
        accent: brandColors.accent || extracted.brand_colors?.accent || null
      };
    }

    console.log('[SCRAPE] Extraction complete:', {
      name: extracted.name,
      servicesCount: extracted.services?.length,
      packagesCount: extracted.packages?.length,
      logoUrl: extracted.logo_url,
      brandColors: extracted.brand_colors
    });

    res.json({
      success: true,
      extracted,
      pagesScraped: pageContents.map(p => p.url)
    });
  } catch (error) {
    console.error('Error scraping website:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/organizations/members
 * Get all organization members
 */
router.get('/members', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: members, error } = await adminClient
      .from('users')
      .select('id, full_name, email, role, status, team_id, created_at, last_training_at')
      .eq('organization_id', req.organization.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, members: members || [] });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/organizations/members/:id/role
 * Update a member's role
 */
router.put('/members/:id/role', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['trainee', 'manager', 'admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent demoting owners
    if (req.params.id === req.user.id && req.user.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const adminClient = createAdminClient();

    const { data: member, error } = await adminClient
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, member });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/organizations/members/:id
 * Remove a member from the organization
 */
router.delete('/members/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const adminClient = createAdminClient();

    // Soft delete by setting status to inactive
    const { error } = await adminClient
      .from('users')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
