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

  // Helper to validate and normalize hex colors
  const normalizeColor = (color) => {
    if (!color) return null;
    color = color.trim();

    // Already a valid hex color
    if (/^#[0-9a-fA-F]{6}$/i.test(color)) return color.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/i.test(color)) {
      // Expand 3-digit hex to 6-digit
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
    }

    // Try to extract hex from string
    const hexMatch = color.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/i);
    if (hexMatch) return normalizeColor(hexMatch[0]);

    // Skip common non-brand colors
    const skipColors = ['transparent', 'inherit', 'initial', 'none', 'white', 'black', '#fff', '#000', '#ffffff', '#000000'];
    if (skipColors.includes(color.toLowerCase())) return null;

    return null;
  };

  // Collect all potential brand colors with weights
  const colorCandidates = [];

  // 1. Theme-color meta tag (high priority)
  const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
  if (themeColorMatch) {
    const color = normalizeColor(themeColorMatch[1]);
    if (color) colorCandidates.push({ color, weight: 100, source: 'theme-color' });
  }

  // 2. CSS custom properties (high priority)
  const cssVarPatterns = [
    { pattern: /--(?:primary|brand|main)(?:-color)?:\s*([^;]+);/gi, weight: 90, type: 'primary' },
    { pattern: /--(?:secondary)(?:-color)?:\s*([^;]+);/gi, weight: 80, type: 'secondary' },
    { pattern: /--(?:accent|highlight|cta)(?:-color)?:\s*([^;]+);/gi, weight: 70, type: 'accent' },
    { pattern: /--(?:color-primary|primary-500|brand-500):\s*([^;]+);/gi, weight: 85, type: 'primary' },
  ];

  for (const { pattern, weight, type } of cssVarPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const color = normalizeColor(match[1]);
      if (color) colorCandidates.push({ color, weight, source: `css-var-${type}`, type });
    }
  }

  // 3. Button and CTA colors (medium-high priority)
  const buttonPatterns = [
    /\.(?:btn|button|cta)[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/gi,
    /button[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/gi,
    /\.(?:primary|main|brand)[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/gi,
  ];

  for (const pattern of buttonPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const color = normalizeColor(match[1]);
      if (color) colorCandidates.push({ color, weight: 60, source: 'button' });
    }
  }

  // 4. Header and nav colors (medium priority)
  const headerPatterns = [
    /(?:header|\.header|#header)[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/gi,
    /(?:nav|\.nav|\.navbar|\.navigation)[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/gi,
    /\.(?:top-bar|topbar|site-header)[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/gi,
  ];

  for (const pattern of headerPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const color = normalizeColor(match[1]);
      if (color) colorCandidates.push({ color, weight: 50, source: 'header' });
    }
  }

  // 5. Link colors (often brand color)
  const linkMatch = html.match(/\ba\b[^{]*\{[^}]*color:\s*([^;]+);/i);
  if (linkMatch) {
    const color = normalizeColor(linkMatch[1]);
    if (color) colorCandidates.push({ color, weight: 40, source: 'link' });
  }

  // 6. Inline styles on key elements
  const inlinePatterns = [
    /style=["'][^"']*background(?:-color)?:\s*([#][0-9a-fA-F]{3,6})[^"']*/gi,
    /style=["'][^"']*(?:^|;)\s*color:\s*([#][0-9a-fA-F]{3,6})[^"']*/gi,
  ];

  for (const pattern of inlinePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const color = normalizeColor(match[1]);
      if (color) colorCandidates.push({ color, weight: 30, source: 'inline' });
    }
  }

  // 7. Count color frequency in the HTML (lower weight but useful for common colors)
  const hexColorMatches = html.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}(?=[^0-9a-fA-F])/gi) || [];
  const colorCounts = {};
  for (const hex of hexColorMatches) {
    const color = normalizeColor(hex);
    if (color) {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }

  // Add frequent colors with frequency-based weight
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count >= 3) {
      colorCandidates.push({ color, weight: Math.min(count * 5, 35), source: 'frequency' });
    }
  }

  // Sort by weight and deduplicate
  colorCandidates.sort((a, b) => b.weight - a.weight);

  console.log('[COLORS] Extracted candidates:', colorCandidates.slice(0, 10));

  // Assign colors - skip similar colors for variety
  const usedColors = [];
  const isSimilar = (c1, c2) => {
    if (!c1 || !c2) return false;
    // Simple check - same color
    return c1 === c2;
  };

  for (const candidate of colorCandidates) {
    if (!colors.primary && !usedColors.some(c => isSimilar(c, candidate.color))) {
      colors.primary = candidate.color;
      usedColors.push(candidate.color);
    } else if (!colors.secondary && !usedColors.some(c => isSimilar(c, candidate.color))) {
      colors.secondary = candidate.color;
      usedColors.push(candidate.color);
    } else if (!colors.accent && !usedColors.some(c => isSimilar(c, candidate.color))) {
      colors.accent = candidate.color;
      usedColors.push(candidate.color);
    }

    if (colors.primary && colors.secondary && colors.accent) break;
  }

  console.log('[COLORS] Final extracted colors:', colors);
  return colors;
}

/**
 * Extract brand colors from logo using Claude Vision
 */
async function extractColorsFromLogo(logoUrl, anthropicClient) {
  try {
    // Fetch the logo image
    const imageResponse = await fetch(logoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CSRTrainingBot/1.0)' },
      signal: AbortSignal.timeout(10000)
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch logo: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Determine media type
    let mediaType = 'image/png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      mediaType = 'image/jpeg';
    } else if (contentType.includes('gif')) {
      mediaType = 'image/gif';
    } else if (contentType.includes('webp')) {
      mediaType = 'image/webp';
    } else if (contentType.includes('svg')) {
      // SVG needs special handling - skip for now
      throw new Error('SVG logos not supported for color extraction');
    }

    // Use Claude Vision to analyze the logo
    const message = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image
            }
          },
          {
            type: 'text',
            text: `Analyze this company logo and extract the brand colors.

Return ONLY valid JSON with the hex color codes (e.g., #ff0000):
{
  "primary": "The main/dominant brand color in the logo (hex code)",
  "secondary": "A secondary color if present (hex code or null)",
  "accent": "An accent/highlight color if present (hex code or null)"
}

Important:
- Return actual hex codes like #e00b40, not color names
- primary should be the most prominent/dominant color
- If the logo is mostly one color, use that as primary
- Ignore white, black, and gray unless they are clearly the brand color
- Return null for colors that aren't clearly present`
          }
        ]
      }]
    });

    const responseText = message.content[0].text;
    console.log('[COLORS] Claude Vision response:', responseText);

    // Parse the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const colors = JSON.parse(jsonMatch[0]);
      return {
        primary: colors.primary || null,
        secondary: colors.secondary || null,
        accent: colors.accent || null
      };
    }

    throw new Error('Failed to parse color response');
  } catch (error) {
    console.error('[COLORS] Logo color extraction failed:', error.message);
    throw error;
  }
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

    // Extract logo URL from HTML
    const logoUrl = extractLogoUrl(homepageHtml, baseUrl);
    console.log(`[SCRAPE] Extracted logo: ${logoUrl}`);

    // Extract brand colors from logo using Claude Vision
    let brandColors = { primary: null, secondary: null, accent: null };
    if (logoUrl) {
      try {
        console.log(`[SCRAPE] Analyzing logo for brand colors: ${logoUrl}`);
        brandColors = await extractColorsFromLogo(logoUrl, anthropic);
        console.log(`[SCRAPE] Colors from logo:`, brandColors);
      } catch (logoError) {
        console.error(`[SCRAPE] Failed to extract colors from logo:`, logoError.message);
        // Fall back to HTML extraction
        brandColors = extractBrandColors(homepageHtml);
        console.log(`[SCRAPE] Fallback to HTML colors:`, brandColors);
      }
    } else {
      // No logo found, try HTML extraction
      brandColors = extractBrandColors(homepageHtml);
      console.log(`[SCRAPE] No logo, using HTML colors:`, brandColors);
    }

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
      "initial_price": "One-time setup/initial price if mentioned (number only, e.g., 99)",
      "recurring_price": "Recurring price if mentioned (number only, e.g., 49)",
      "frequency": "monthly/quarterly/bi-monthly/annually/one-time - the billing frequency for recurring_price"
    }
  ],
  "competitors_mentioned": ["Any competitor names mentioned"],
  "service_areas": ["Cities or regions served"],
  "value_propositions": ["Key selling points, differentiators, or unique benefits mentioned"],
  "business_hours": "Business hours if found",
  "logo_url": "Full URL to the company logo if you can identify it from image references",
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
- For packages: extract pricing plans, service tiers, or subscription options
  - initial_price is the one-time setup fee (if any)
  - recurring_price is the ongoing monthly/quarterly/annual price
  - frequency should match the recurring_price billing cycle (monthly, quarterly, bi-monthly, annually)
  - If only one price is shown, use it as recurring_price
- For brand_colors, extract hex codes (e.g., #ff0000) for the dominant colors in headers, buttons, and CTAs
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

    // Add logo URL - prefer HTML extraction over AI guess
    if (logoUrl) {
      extracted.logo_url = logoUrl;
    } else if (!extracted.logo_url) {
      extracted.logo_url = null;
    }

    // Merge brand colors - prefer logo-extracted colors, fall back to AI-extracted
    const finalBrandColors = {
      primary: brandColors.primary || extracted.brand_colors?.primary || null,
      secondary: brandColors.secondary || extracted.brand_colors?.secondary || null,
      accent: brandColors.accent || extracted.brand_colors?.accent || null
    };
    extracted.brand_colors = finalBrandColors;

    console.log('[SCRAPE] Extraction complete:', {
      name: extracted.name,
      servicesCount: extracted.services?.length,
      packagesCount: extracted.packages?.length,
      logoUrl: extracted.logo_url,
      brandColors: extracted.brand_colors,
      logoSource: logoUrl ? 'HTML' : (extracted.logo_url ? 'AI' : 'none'),
      colorSource: brandColors.primary ? 'logo-vision' : (extracted.brand_colors?.primary ? 'AI' : 'none')
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
