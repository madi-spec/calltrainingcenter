import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractCompanyIntelligence } from './claude.js';
import { extractColorsFromCSS } from '../utils/colorExtractor.js';

/**
 * Scrape company website for branding and business data
 */
export async function scrapeCompanyWebsite(url) {
  try {
    // Normalize URL
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    console.log(`Fetching: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Extract basic data
    const scrapedData = {
      url,
      logo: extractLogo($, url),
      colors: await extractColors($, response.data, url),
      textContent: extractTextContent($),
      metadata: extractMetadata($)
    };

    // Try to get services page
    const servicesContent = await tryFetchPage($, url, ['services', 'pest-control', 'what-we-do']);
    if (servicesContent) {
      scrapedData.textContent += '\n\nSERVICES PAGE:\n' + servicesContent;
    }

    // Try to get about page
    const aboutContent = await tryFetchPage($, url, ['about', 'about-us', 'our-company']);
    if (aboutContent) {
      scrapedData.textContent += '\n\nABOUT PAGE:\n' + aboutContent;
    }

    // Use Claude to extract structured intelligence
    console.log('Extracting intelligence with Claude...');
    const intelligence = await extractCompanyIntelligence(scrapedData.textContent);

    return {
      ...scrapedData,
      extracted: intelligence
    };
  } catch (error) {
    console.error('Error scraping website:', error.message);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

/**
 * Extract logo URL from page
 */
function extractLogo($, baseUrl) {
  const candidates = [];

  // Check header for logo
  $('header img, .logo img, .navbar img, .header img, [class*="logo"] img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) candidates.push({ src, priority: 1 });
  });

  // Check for image with logo in name/alt/class
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    const className = $(el).attr('class') || '';

    if (src.toLowerCase().includes('logo') ||
        alt.toLowerCase().includes('logo') ||
        className.toLowerCase().includes('logo')) {
      candidates.push({ src, priority: 2 });
    }
  });

  // Check favicon
  $('link[rel*="icon"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) candidates.push({ src: href, priority: 3 });
  });

  // Check og:image
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) candidates.push({ src: ogImage, priority: 4 });

  // Sort by priority and return best match
  candidates.sort((a, b) => a.priority - b.priority);

  if (candidates.length > 0) {
    let logoUrl = candidates[0].src;
    // Make absolute URL
    if (logoUrl && !logoUrl.startsWith('http')) {
      const base = new URL(baseUrl);
      logoUrl = logoUrl.startsWith('//')
        ? 'https:' + logoUrl
        : logoUrl.startsWith('/')
          ? `${base.origin}${logoUrl}`
          : `${base.origin}/${logoUrl}`;
    }
    return logoUrl;
  }

  return null;
}

/**
 * Extract colors from CSS
 */
async function extractColors($, html, baseUrl) {
  const colors = {
    primary: null,
    secondary: null,
    accent: null,
    background: null,
    text: null
  };

  // Extract inline styles
  const inlineStyles = [];
  $('style').each((_, el) => {
    inlineStyles.push($(el).html());
  });

  // Extract from inline styles
  const cssColors = extractColorsFromCSS(inlineStyles.join('\n'));

  // Try to identify primary color from common patterns
  const colorMatches = html.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g) || [];
  const colorCounts = {};

  colorMatches.forEach(color => {
    // Normalize to hex
    const normalized = normalizeColor(color);
    if (normalized && normalized !== '#ffffff' && normalized !== '#000000') {
      colorCounts[normalized] = (colorCounts[normalized] || 0) + 1;
    }
  });

  // Sort by frequency
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  colors.primary = cssColors.primary || sortedColors[0] || '#2563eb';
  colors.secondary = cssColors.secondary || sortedColors[1] || '#1e40af';
  colors.accent = cssColors.accent || sortedColors[2] || '#3b82f6';

  return colors;
}

/**
 * Normalize color to hex
 */
function normalizeColor(color) {
  if (!color) return null;

  // Already hex
  if (color.startsWith('#')) {
    // Expand short hex
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color.toLowerCase();
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return null;
}

/**
 * Extract text content from page
 */
function extractTextContent($) {
  // Remove script, style, and nav elements
  $('script, style, nav, footer, .nav, .footer, .menu').remove();

  // Get main content
  let content = '';

  // Try main content areas
  const contentSelectors = ['main', 'article', '.content', '.main', '#content', '#main', 'body'];

  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      break;
    }
  }

  // Clean up whitespace
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
    .substring(0, 15000); // Limit content length
}

/**
 * Extract metadata from page
 */
function extractMetadata($) {
  return {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    ogDescription: $('meta[property="og:description"]').attr('content') || ''
  };
}

/**
 * Try to fetch additional pages
 */
async function tryFetchPage($, baseUrl, pathCandidates) {
  const base = new URL(baseUrl);

  // Check for links to these pages
  for (const path of pathCandidates) {
    const link = $(`a[href*="${path}"]`).first().attr('href');
    if (link) {
      try {
        const pageUrl = link.startsWith('http') ? link : `${base.origin}${link.startsWith('/') ? '' : '/'}${link}`;
        const response = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });
        const page$ = cheerio.load(response.data);
        page$('script, style, nav, footer').remove();
        return page$('main, article, .content, body').text()
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 5000);
      } catch {
        // Continue to next candidate
      }
    }
  }

  // Try direct paths
  for (const path of pathCandidates) {
    try {
      const pageUrl = `${base.origin}/${path}`;
      const response = await axios.get(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      });
      const page$ = cheerio.load(response.data);
      page$('script, style, nav, footer').remove();
      return page$('main, article, .content, body').text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000);
    } catch {
      // Continue
    }
  }

  return null;
}
