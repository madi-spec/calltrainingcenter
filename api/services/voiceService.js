/**
 * Voice Service
 *
 * Manages Retell voice cache and provides voice selection utilities.
 * Fetches available voices from Retell and caches them for 1 hour.
 */

import Retell from 'retell-sdk';

let retellClient = null;

function getRetellClient() {
  if (!retellClient) {
    retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY });
  }
  return retellClient;
}

// Cache for available Retell voices
let voiceCache = {
  voices: [],
  lastFetched: null,
  fetchError: null
};

/**
 * Fetch and cache available voices from Retell
 */
export async function refreshVoiceCache() {
  try {
    console.log('[VOICES] Refreshing voice cache from Retell...');
    const voices = await getRetellClient().voice.list();
    voiceCache = {
      voices: voices.map(v => ({
        id: v.voice_id,
        name: v.voice_name,
        gender: v.gender?.toLowerCase() || 'unknown',
        provider: v.provider
      })),
      lastFetched: Date.now(),
      fetchError: null
    };
    console.log(`[VOICES] Cached ${voiceCache.voices.length} voices:`, voiceCache.voices.map(v => v.id).join(', '));
    return voiceCache.voices;
  } catch (error) {
    console.error('[VOICES] Failed to fetch voices from Retell:', error.message);
    voiceCache.fetchError = error.message;
    return voiceCache.voices; // Return existing cache if available
  }
}

/**
 * Get cached voices, refreshing if needed (cache for 1 hour)
 */
export async function getAvailableVoices() {
  const ONE_HOUR = 60 * 60 * 1000;
  if (!voiceCache.lastFetched || (Date.now() - voiceCache.lastFetched) > ONE_HOUR || voiceCache.voices.length === 0) {
    await refreshVoiceCache();
  }
  return voiceCache.voices;
}

/**
 * Get voice cache metadata
 */
export function getVoiceCacheInfo() {
  return {
    count: voiceCache.voices.length,
    lastFetched: voiceCache.lastFetched ? new Date(voiceCache.lastFetched).toISOString() : null,
    error: voiceCache.fetchError
  };
}

/**
 * Get a random voice by gender preference
 */
export async function getRandomVoice(preferredGender = null) {
  const voices = await getAvailableVoices();

  if (voices.length === 0) {
    console.warn('[VOICES] No voices available, returning null');
    return null;
  }

  let candidates = voices;
  if (preferredGender) {
    const genderMatches = voices.filter(v => v.gender === preferredGender.toLowerCase());
    if (genderMatches.length > 0) {
      candidates = genderMatches;
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Get a valid voice ID, falling back to first available if requested voice doesn't exist
 */
export async function getValidVoiceId(requestedVoiceId) {
  const voices = await getAvailableVoices();

  // If no voices cached, return the requested one and let Retell handle it
  if (voices.length === 0) {
    return requestedVoiceId;
  }

  // Check if requested voice exists
  const exists = voices.some(v => v.id === requestedVoiceId);
  if (exists) {
    return requestedVoiceId;
  }

  // Fall back to first available voice
  console.warn(`[VOICES] Voice ${requestedVoiceId} not found, using fallback: ${voices[0].id}`);
  return voices[0].id;
}

/**
 * Get a voice ID for a customer profile based on gender
 */
export async function getVoiceForProfile(profile) {
  const gender = profile?.gender?.toLowerCase();

  let preferredGender = null;
  if (gender === 'female' || gender === 'f') {
    preferredGender = 'female';
  } else if (gender === 'male' || gender === 'm') {
    preferredGender = 'male';
  }

  const voice = await getRandomVoice(preferredGender);
  return voice?.id || null;
}

// Initialize voice cache on module load
refreshVoiceCache().catch(err => console.error('[VOICES] Initial cache refresh failed:', err.message));
