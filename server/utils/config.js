import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '../data/config.json');

// Default configuration
const defaultConfig = {
  company: {
    name: 'Accel Pest & Termite Control',
    phone: '(555) 123-4567',
    website: 'https://www.accelpest.com',
    logo: null,
    colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#3b82f6'
    },
    serviceAreas: ['Phoenix Metro', 'Scottsdale', 'Tempe', 'Mesa', 'Gilbert'],
    services: [
      'Termite Control',
      'Ant Control',
      'Scorpion Control',
      'Rodent Control',
      'Bed Bug Treatment',
      'Mosquito Control',
      'Wildlife Removal'
    ],
    pricing: {
      quarterlyPrice: '149',
      initialPrice: '199',
      hasPublicPricing: true
    },
    guarantees: [
      '100% Satisfaction Guarantee',
      'Free Re-treatment if pests return'
    ],
    valuePropositions: [
      'Same-day service available',
      'Family and pet safe treatments',
      'Licensed and insured technicians'
    ],
    businessHours: 'Mon-Sat 7am-7pm'
  },
  settings: {
    defaultVoiceId: '11labs-Adrian',
    callTimeout: 600000, // 10 minutes
    enableAnalytics: true
  },
  extractedIntelligence: {
    companies: [],
    terminology: [],
    suggestedScenarios: []
  }
};

/**
 * Load configuration from file or return default
 */
export function loadConfig() {
  try {
    if (existsSync(configPath)) {
      const data = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(data);
      // Merge with defaults to ensure all fields exist
      return deepMerge(defaultConfig, config);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }

  // Save and return default if no config exists
  saveConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Save configuration to file
 */
export function saveConfig(config) {
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Configuration saved');
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object') {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
  saveConfig(defaultConfig);
  return defaultConfig;
}
