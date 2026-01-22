import express from 'express';
import { scrapeCompanyWebsite } from '../services/scraper.js';
import { analyzeTranscript } from '../services/claude.js';
import { loadConfig, saveConfig } from '../utils/config.js';

const router = express.Router();

// Scrape company website for branding data
router.post('/scrape-company', async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Scraping company website: ${url}`);
    const companyData = await scrapeCompanyWebsite(url);

    res.json({
      success: true,
      data: companyData
    });
  } catch (error) {
    next(error);
  }
});

// Apply company configuration
router.post('/apply-company', async (req, res, next) => {
  try {
    const { companyData } = req.body;

    if (!companyData) {
      return res.status(400).json({ error: 'Company data is required' });
    }

    const config = loadConfig();
    config.company = {
      ...config.company,
      ...companyData
    };
    saveConfig(config);

    res.json({
      success: true,
      config: config.company
    });
  } catch (error) {
    next(error);
  }
});

// Get current configuration
router.get('/current-config', async (req, res, next) => {
  try {
    const config = loadConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// Load and analyze transcript for intelligence extraction
router.post('/load-transcript', async (req, res, next) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    console.log('Analyzing transcript for intelligence extraction...');
    const intelligence = await analyzeTranscript(transcript, 'extract');

    res.json({
      success: true,
      intelligence
    });
  } catch (error) {
    next(error);
  }
});

// Update configuration
router.post('/update-config', async (req, res, next) => {
  try {
    const updates = req.body;
    const config = loadConfig();

    // Deep merge updates
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
        config[key] = { ...config[key], ...updates[key] };
      } else {
        config[key] = updates[key];
      }
    });

    saveConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
});

export default router;
