/**
 * Extract color values from CSS content
 */
export function extractColorsFromCSS(cssContent) {
  const colors = {
    primary: null,
    secondary: null,
    accent: null,
    background: null,
    text: null
  };

  if (!cssContent) return colors;

  // Look for CSS custom properties (variables)
  const varPatterns = [
    { pattern: /--(?:primary|main|brand)(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi, type: 'primary' },
    { pattern: /--(?:secondary)(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi, type: 'secondary' },
    { pattern: /--(?:accent|highlight)(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi, type: 'accent' },
    { pattern: /--(?:bg|background)(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi, type: 'background' },
    { pattern: /--(?:text|foreground)(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi, type: 'text' }
  ];

  for (const { pattern, type } of varPatterns) {
    const match = cssContent.match(pattern);
    if (match && match[0]) {
      const colorMatch = match[0].match(/(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/i);
      if (colorMatch) {
        colors[type] = normalizeToHex(colorMatch[1]);
      }
    }
  }

  // Look for common class patterns if variables not found
  if (!colors.primary) {
    const headerBg = cssContent.match(/(?:header|navbar|nav|\.brand)[^{]*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/i);
    if (headerBg) {
      colors.primary = normalizeToHex(headerBg[1]);
    }
  }

  if (!colors.accent) {
    const buttonBg = cssContent.match(/(?:\.btn|button)[^{]*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/i);
    if (buttonBg) {
      colors.accent = normalizeToHex(buttonBg[1]);
    }
  }

  return colors;
}

/**
 * Normalize any color format to hex
 */
function normalizeToHex(color) {
  if (!color) return null;

  color = color.trim().toLowerCase();

  // Already hex
  if (color.startsWith('#')) {
    // Expand short hex
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
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
 * Generate complementary colors from a base color
 */
export function generateColorPalette(primaryHex) {
  if (!primaryHex || !primaryHex.startsWith('#')) {
    return {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#3b82f6',
      light: '#dbeafe',
      dark: '#1e3a8a'
    };
  }

  const primary = hexToHSL(primaryHex);

  return {
    primary: primaryHex,
    secondary: hslToHex({ ...primary, l: Math.max(0, primary.l - 15) }),
    accent: hslToHex({ ...primary, s: Math.min(100, primary.s + 10), l: Math.min(70, primary.l + 10) }),
    light: hslToHex({ ...primary, s: Math.max(20, primary.s - 30), l: Math.min(95, primary.l + 40) }),
    dark: hslToHex({ ...primary, l: Math.max(10, primary.l - 30) })
  };
}

/**
 * Convert hex to HSL
 */
function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Convert HSL to hex
 */
function hslToHex({ h, s, l }) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determine if a color is light or dark
 */
export function isLightColor(hex) {
  if (!hex || !hex.startsWith('#')) return true;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
