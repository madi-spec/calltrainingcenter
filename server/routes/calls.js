import express from 'express';
import { createRetellAgent, createWebCall, endCall, getCallTranscript } from '../services/retell.js';
import { buildAgentPrompt } from '../services/prompts.js';
import { loadConfig } from '../utils/config.js';
import { processTemplate } from '../utils/templateEngine.js';

const router = express.Router();

// Store active calls in memory (in production, use Redis/database)
const activeCalls = new Map();

// Create a training call with dynamic agent
router.post('/create-training-call', async (req, res, next) => {
  try {
    const { scenarioId, scenario } = req.body;

    if (!scenario) {
      return res.status(400).json({ error: 'Scenario is required' });
    }

    const config = loadConfig();
    const company = config.company || {};

    // Process scenario template with company context
    const processedScenario = {
      ...scenario,
      systemPrompt: processTemplate(scenario.systemPrompt, { company }),
      customerBackground: processTemplate(scenario.customerBackground, { company }),
      situation: processTemplate(scenario.situation, { company })
    };

    // Build the agent prompt
    const agentPrompt = buildAgentPrompt(processedScenario, company);

    console.log('Creating Retell agent with scenario:', processedScenario.name);

    // Create dynamic agent
    const agent = await createRetellAgent({
      name: `CSR Training - ${processedScenario.name}`,
      prompt: agentPrompt,
      voiceId: scenario.voiceId || 'eleven_labs_female_1',
      firstMessage: processedScenario.openingLine || "Hello?"
    });

    // Create web call
    const webCall = await createWebCall(agent.agent_id);

    // Store call info
    activeCalls.set(webCall.call_id, {
      callId: webCall.call_id,
      agentId: agent.agent_id,
      scenarioId,
      scenario: processedScenario,
      company,
      startTime: new Date().toISOString()
    });

    res.json({
      success: true,
      callId: webCall.call_id,
      agentId: agent.agent_id,
      accessToken: webCall.access_token,
      sampleRate: webCall.sample_rate || 24000
    });
  } catch (error) {
    console.error('Error creating training call:', error);
    next(error);
  }
});

// End a call and retrieve transcript
router.post('/end', async (req, res, next) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'Call ID is required' });
    }

    const callInfo = activeCalls.get(callId);

    // End the call
    await endCall(callId);

    // Wait a moment for transcript to be available
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get transcript
    const transcript = await getCallTranscript(callId);

    // Clean up
    activeCalls.delete(callId);

    res.json({
      success: true,
      callId,
      transcript,
      callInfo: callInfo || null
    });
  } catch (error) {
    console.error('Error ending call:', error);
    next(error);
  }
});

// Get call status
router.get('/status/:callId', async (req, res, next) => {
  try {
    const { callId } = req.params;
    const callInfo = activeCalls.get(callId);

    if (!callInfo) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({
      success: true,
      callInfo
    });
  } catch (error) {
    next(error);
  }
});

// Get transcript for a call
router.get('/transcript/:callId', async (req, res, next) => {
  try {
    const { callId } = req.params;
    const transcript = await getCallTranscript(callId);

    res.json({
      success: true,
      transcript
    });
  } catch (error) {
    next(error);
  }
});

export default router;
