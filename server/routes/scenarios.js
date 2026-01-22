import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processTemplate } from '../utils/templateEngine.js';
import { loadConfig } from '../utils/config.js';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const scenariosPath = join(__dirname, '../data/scenarios.json');

// Load scenarios from file
function loadScenarios() {
  if (!existsSync(scenariosPath)) {
    return [];
  }
  const data = readFileSync(scenariosPath, 'utf-8');
  return JSON.parse(data);
}

// Save scenarios to file
function saveScenarios(scenarios) {
  writeFileSync(scenariosPath, JSON.stringify(scenarios, null, 2));
}

// Get all scenarios with template variables resolved
router.get('/', async (req, res, next) => {
  try {
    const scenarios = loadScenarios();
    const config = loadConfig();
    const company = config.company || {};

    // Process templates for each scenario
    const processedScenarios = scenarios.map(scenario => ({
      ...scenario,
      situation: processTemplate(scenario.situation, { company }),
      customerBackground: processTemplate(scenario.customerBackground, { company }),
      // Keep system prompt as template for call creation
    }));

    res.json({
      success: true,
      scenarios: processedScenarios
    });
  } catch (error) {
    next(error);
  }
});

// Get single scenario by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const scenarios = loadScenarios();
    const scenario = scenarios.find(s => s.id === id);

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    const config = loadConfig();
    const company = config.company || {};

    const processedScenario = {
      ...scenario,
      situation: processTemplate(scenario.situation, { company }),
      customerBackground: processTemplate(scenario.customerBackground, { company })
    };

    res.json({
      success: true,
      scenario: processedScenario
    });
  } catch (error) {
    next(error);
  }
});

// Create custom scenario
router.post('/', async (req, res, next) => {
  try {
    const newScenario = req.body;

    if (!newScenario.name || !newScenario.systemPrompt) {
      return res.status(400).json({ error: 'Name and system prompt are required' });
    }

    const scenarios = loadScenarios();

    // Generate ID
    newScenario.id = `custom-${Date.now()}`;
    newScenario.isCustom = true;
    newScenario.createdAt = new Date().toISOString();

    scenarios.push(newScenario);
    saveScenarios(scenarios);

    res.json({
      success: true,
      scenario: newScenario
    });
  } catch (error) {
    next(error);
  }
});

// Update scenario
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const scenarios = loadScenarios();
    const index = scenarios.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    scenarios[index] = {
      ...scenarios[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveScenarios(scenarios);

    res.json({
      success: true,
      scenario: scenarios[index]
    });
  } catch (error) {
    next(error);
  }
});

// Delete scenario
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const scenarios = loadScenarios();
    const index = scenarios.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    scenarios.splice(index, 1);
    saveScenarios(scenarios);

    res.json({
      success: true,
      message: 'Scenario deleted'
    });
  } catch (error) {
    next(error);
  }
});

// Get available Retell voices
router.get('/meta/voices', async (req, res, next) => {
  try {
    // Common Retell voice options
    const voices = [
      { id: '11labs-Adrian', name: 'Adrian', gender: 'male', description: 'Professional male voice' },
      { id: '11labs-Myra', name: 'Myra', gender: 'female', description: 'Warm female voice' },
      { id: '11labs-Dorothy', name: 'Dorothy', gender: 'female', description: 'Elderly female voice' },
      { id: '11labs-Josh', name: 'Josh', gender: 'male', description: 'Young male voice' },
      { id: '11labs-Arnold', name: 'Arnold', gender: 'male', description: 'Deep male voice' },
      { id: '11labs-Charlotte', name: 'Charlotte', gender: 'female', description: 'British female voice' },
      { id: '11labs-Brian', name: 'Brian', gender: 'male', description: 'American male voice' },
      { id: '11labs-Lily', name: 'Lily', gender: 'female', description: 'Soft female voice' }
    ];

    res.json({
      success: true,
      voices
    });
  } catch (error) {
    next(error);
  }
});

export default router;
