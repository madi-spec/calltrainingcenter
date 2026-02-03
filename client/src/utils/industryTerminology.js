/**
 * Industry-specific terminology and configuration
 * Adapts language based on company's industry type
 */

export const INDUSTRIES = {
  PEST_CONTROL: 'pest_control',
  LAWN_CARE: 'lawn_care',
  BOTH: 'both'
};

export const INDUSTRY_LABELS = {
  [INDUSTRIES.PEST_CONTROL]: 'Pest Control',
  [INDUSTRIES.LAWN_CARE]: 'Lawn Care',
  [INDUSTRIES.BOTH]: 'Pest Control & Lawn Care'
};

/**
 * Get industry-specific terminology
 * @param {string} industry - Industry type from INDUSTRIES
 * @param {string} term - The term to translate
 * @returns {string} Industry-specific term
 */
export function getIndustryTerm(industry, term) {
  const terminology = {
    // Job titles
    technician: {
      [INDUSTRIES.PEST_CONTROL]: 'Service Technician',
      [INDUSTRIES.LAWN_CARE]: 'Lawn Care Specialist',
      [INDUSTRIES.BOTH]: 'Service Professional'
    },
    technicians: {
      [INDUSTRIES.PEST_CONTROL]: 'Service Technicians',
      [INDUSTRIES.LAWN_CARE]: 'Lawn Care Specialists',
      [INDUSTRIES.BOTH]: 'Service Professionals'
    },

    // Services
    treatment: {
      [INDUSTRIES.PEST_CONTROL]: 'Treatment',
      [INDUSTRIES.LAWN_CARE]: 'Application',
      [INDUSTRIES.BOTH]: 'Service'
    },
    treatments: {
      [INDUSTRIES.PEST_CONTROL]: 'Treatments',
      [INDUSTRIES.LAWN_CARE]: 'Applications',
      [INDUSTRIES.BOTH]: 'Services'
    },

    // Issues
    issue: {
      [INDUSTRIES.PEST_CONTROL]: 'Pest Issue',
      [INDUSTRIES.LAWN_CARE]: 'Lawn Issue',
      [INDUSTRIES.BOTH]: 'Service Issue'
    },
    issues: {
      [INDUSTRIES.PEST_CONTROL]: 'Pest Issues',
      [INDUSTRIES.LAWN_CARE]: 'Lawn Issues',
      [INDUSTRIES.BOTH]: 'Service Issues'
    },

    // Customer concerns
    concern: {
      [INDUSTRIES.PEST_CONTROL]: 'Pest Concern',
      [INDUSTRIES.LAWN_CARE]: 'Lawn Concern',
      [INDUSTRIES.BOTH]: 'Service Concern'
    },

    // Service types
    service: {
      [INDUSTRIES.PEST_CONTROL]: 'Pest Control',
      [INDUSTRIES.LAWN_CARE]: 'Lawn Care',
      [INDUSTRIES.BOTH]: 'Services'
    },

    // Training context
    trainingFor: {
      [INDUSTRIES.PEST_CONTROL]: 'Pest Control CSRs',
      [INDUSTRIES.LAWN_CARE]: 'Lawn Care CSRs',
      [INDUSTRIES.BOTH]: 'Service CSRs'
    }
  };

  const industryTerms = terminology[term];
  if (!industryTerms) return term; // Fallback to original term

  return industryTerms[industry] || industryTerms[INDUSTRIES.PEST_CONTROL]; // Default to pest control
}

/**
 * Get industry display name
 */
export function getIndustryLabel(industry) {
  return INDUSTRY_LABELS[industry] || INDUSTRY_LABELS[INDUSTRIES.PEST_CONTROL];
}

/**
 * Get industry-specific placeholder scenarios
 */
export function getIndustryScenarios(industry) {
  const scenarios = {
    [INDUSTRIES.PEST_CONTROL]: [
      'Bed Bug Initial Call',
      'Termite Inspection Request',
      'Quarterly Service Question',
      'Emergency Rodent Issue',
      'Annual Renewal Call'
    ],
    [INDUSTRIES.LAWN_CARE]: [
      'Fertilization Program Inquiry',
      'Grub Problem Call',
      'Weed Control Question',
      'Lawn Analysis Request',
      'Service Renewal Discussion'
    ],
    [INDUSTRIES.BOTH]: [
      'Quarterly Pest Service',
      'Lawn Treatment Plan',
      'Combination Package Inquiry',
      'Service Upgrade Call',
      'Multi-Service Question'
    ]
  };

  return scenarios[industry] || scenarios[INDUSTRIES.PEST_CONTROL];
}

/**
 * Get industry-specific colors/theme
 */
export function getIndustryTheme(industry) {
  return {
    [INDUSTRIES.PEST_CONTROL]: {
      primary: '#2563eb', // Blue
      accent: '#f59e0b', // Amber
      icon: '🐛'
    },
    [INDUSTRIES.LAWN_CARE]: {
      primary: '#10b981', // Green
      accent: '#84cc16', // Lime
      icon: '🌱'
    },
    [INDUSTRIES.BOTH]: {
      primary: '#6366f1', // Indigo
      accent: '#8b5cf6', // Purple
      icon: '🏡'
    }
  }[industry] || { primary: '#2563eb', accent: '#f59e0b', icon: '🐛' };
}
