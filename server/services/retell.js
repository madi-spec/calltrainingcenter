import Retell from 'retell-sdk';

// Lazy initialization to ensure env vars are loaded
let retell = null;

function getRetellClient() {
  if (!retell) {
    retell = new Retell({
      apiKey: process.env.RETELL_API_KEY
    });
  }
  return retell;
}

/**
 * Create a Retell LLM with the scenario prompt
 */
async function createRetellLLM(prompt, firstMessage) {
  try {
    const llm = await getRetellClient().llm.create({
      model: 'gpt-4o',
      general_prompt: prompt,
      begin_message: firstMessage,
      general_tools: [],
      inbound_dynamic_variables_webhook_url: null,
      starting_state: null,
      states: null
    });

    console.log(`Created Retell LLM: ${llm.llm_id}`);
    return llm;
  } catch (error) {
    console.error('Error creating Retell LLM:', error);
    throw error;
  }
}

/**
 * Create a dynamic Retell agent with scenario-specific prompt
 */
export async function createRetellAgent({ name, prompt, voiceId, firstMessage }) {
  try {
    // First create an LLM with the prompt
    const llm = await createRetellLLM(prompt, firstMessage);

    // Then create the agent using the LLM
    const agent = await getRetellClient().agent.create({
      agent_name: name,
      response_engine: {
        type: 'retell-llm',
        llm_id: llm.llm_id
      },
      voice_id: voiceId || '11labs-Adrian',
      language: 'en-US',
      opt_out_sensitive_data_storage: false,
      ambient_sound: 'coffee-shop',
      backchannel_frequency: 0.5,
      enable_backchannel: true,
      interruption_sensitivity: 0.8,
      responsiveness: 0.8
    });

    console.log(`Created Retell agent: ${agent.agent_id}`);
    return { ...agent, llm_id: llm.llm_id };
  } catch (error) {
    console.error('Error creating Retell agent:', error);
    throw error;
  }
}

/**
 * Create a web call for browser-based voice interaction
 */
export async function createWebCall(agentId) {
  try {
    const webCall = await getRetellClient().call.createWebCall({
      agent_id: agentId,
      metadata: {
        source: 'csr-training-simulator'
      }
    });

    console.log(`Created web call: ${webCall.call_id}`);
    return webCall;
  } catch (error) {
    console.error('Error creating web call:', error);
    throw error;
  }
}

/**
 * End an active call
 */
export async function endCall(callId) {
  try {
    await getRetellClient().call.end(callId);
    console.log(`Ended call: ${callId}`);
    return true;
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
}

/**
 * Get transcript for a completed call
 */
export async function getCallTranscript(callId) {
  try {
    const call = await getRetellClient().call.retrieve(callId);

    if (!call.transcript) {
      return {
        raw: '',
        formatted: [],
        duration: call.end_timestamp
          ? (new Date(call.end_timestamp) - new Date(call.start_timestamp)) / 1000
          : 0
      };
    }

    // Format transcript into structured format
    const formatted = call.transcript.split('\n').map(line => {
      const match = line.match(/^(Agent|User):\s*(.*)$/);
      if (match) {
        return {
          role: match[1].toLowerCase() === 'agent' ? 'customer' : 'csr',
          content: match[2].trim(),
          timestamp: null
        };
      }
      return null;
    }).filter(Boolean);

    return {
      raw: call.transcript,
      formatted,
      duration: call.end_timestamp
        ? (new Date(call.end_timestamp) - new Date(call.start_timestamp)) / 1000
        : 0,
      callStatus: call.call_status,
      disconnectionReason: call.disconnection_reason
    };
  } catch (error) {
    console.error('Error getting call transcript:', error);
    throw error;
  }
}

/**
 * List available voices
 */
export async function listVoices() {
  try {
    const voices = await getRetellClient().voice.list();
    return voices;
  } catch (error) {
    console.error('Error listing voices:', error);
    throw error;
  }
}

/**
 * Delete an agent (cleanup)
 */
export async function deleteAgent(agentId) {
  try {
    await getRetellClient().agent.delete(agentId);
    console.log(`Deleted agent: ${agentId}`);
    return true;
  } catch (error) {
    console.error('Error deleting agent:', error);
    // Don't throw - cleanup errors shouldn't break flow
    return false;
  }
}
