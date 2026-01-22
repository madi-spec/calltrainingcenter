import express from 'express';
import { analyzeTranscript } from '../services/claude.js';
import { loadConfig } from '../utils/config.js';

const router = express.Router();

// Analyze transcript and generate coaching scorecard
router.post('/analyze', async (req, res, next) => {
  try {
    const { transcript, scenario, callDuration } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const config = loadConfig();
    const company = config.company || {};

    console.log('Analyzing transcript for coaching feedback...');

    const analysis = await analyzeTranscript(transcript, 'coaching', {
      scenario,
      company,
      callDuration
    });

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    next(error);
  }
});

// Quick sentiment analysis (for real-time feedback)
router.post('/sentiment', async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const analysis = await analyzeTranscript(text, 'sentiment');

    res.json({
      success: true,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence
    });
  } catch (error) {
    next(error);
  }
});

export default router;
