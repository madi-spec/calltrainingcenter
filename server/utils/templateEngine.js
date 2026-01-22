/**
 * Process template string with variable replacement
 * Supports {{variable.path}} syntax
 *
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {object} context - Context object with values to replace
 * @returns {string} Processed string with variables replaced
 */
export function processTemplate(template, context) {
  if (!template || typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Get nested value from object using dot notation
 *
 * @param {object} obj - Object to get value from
 * @param {string} path - Dot-notation path (e.g., 'company.name')
 * @returns {any} Value at path or undefined
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Process all string values in an object recursively
 *
 * @param {object} obj - Object with template strings
 * @param {object} context - Context for replacement
 * @returns {object} New object with processed values
 */
export function processObjectTemplates(obj, context) {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    return processTemplate(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processObjectTemplates(item, context));
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processObjectTemplates(value, context);
    }
    return result;
  }

  return obj;
}

/**
 * Extract all template variables from a string
 *
 * @param {string} template - Template string
 * @returns {string[]} Array of variable paths found
 */
export function extractTemplateVariables(template) {
  if (!template || typeof template !== 'string') {
    return [];
  }

  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.map(match => match.slice(2, -2).trim());
}

/**
 * Check if all required template variables are available in context
 *
 * @param {string} template - Template string
 * @param {object} context - Context object
 * @returns {object} { valid: boolean, missing: string[] }
 */
export function validateTemplate(template, context) {
  const variables = extractTemplateVariables(template);
  const missing = [];

  for (const variable of variables) {
    if (getNestedValue(context, variable) === undefined) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}
