import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Volume2, Play, User } from 'lucide-react';
import VoicePreviewPlayer from './VoicePreviewPlayer';

/**
 * Voice selector dropdown with preview functionality
 */
export default function VoiceSelector({
  voices = [],
  selectedVoiceId,
  onSelect,
  label = 'Voice',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewVoiceId, setPreviewVoiceId] = useState(null);
  const dropdownRef = useRef(null);

  const selectedVoice = voices.find(v => v.voice_id === selectedVoiceId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setPreviewVoiceId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (voice) => {
    onSelect(voice.voice_id);
    setIsOpen(false);
    setPreviewVoiceId(null);
  };

  const handlePreview = (e, voiceId) => {
    e.stopPropagation();
    setPreviewVoiceId(previewVoiceId === voiceId ? null : voiceId);
  };

  const getVoiceGender = (voice) => {
    if (voice.gender) return voice.gender;
    // Infer from voice name if not specified
    const name = voice.voice_name?.toLowerCase() || '';
    if (['brian', 'marcus', 'chris', 'james', 'michael', 'david', 'josh'].some(n => name.includes(n))) {
      return 'male';
    }
    if (['sarah', 'jennifer', 'emma', 'mary', 'ashley', 'nicole', 'jessica'].some(n => name.includes(n))) {
      return 'female';
    }
    return null;
  };

  const getProviderLabel = (voiceId) => {
    if (voiceId?.startsWith('11labs')) return 'ElevenLabs';
    if (voiceId?.startsWith('openai')) return 'OpenAI';
    if (voiceId?.startsWith('deepgram')) return 'Deepgram';
    if (voiceId?.startsWith('playht')) return 'PlayHT';
    return 'Custom';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-left hover:bg-gray-650 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            getVoiceGender(selectedVoice) === 'male' ? 'bg-blue-500/20' :
            getVoiceGender(selectedVoice) === 'female' ? 'bg-pink-500/20' :
            'bg-gray-600'
          }`}>
            <User className={`w-4 h-4 ${
              getVoiceGender(selectedVoice) === 'male' ? 'text-blue-400' :
              getVoiceGender(selectedVoice) === 'female' ? 'text-pink-400' :
              'text-gray-400'
            }`} />
          </div>
          <div>
            <p className="text-gray-100 font-medium">
              {selectedVoice?.voice_name || 'Select a voice'}
            </p>
            {selectedVoice && (
              <p className="text-xs text-gray-400">
                {getProviderLabel(selectedVoice.voice_id)}
                {selectedVoice.accent && ` \u2022 ${selectedVoice.accent}`}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto">
              {voices.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No voices available
                </div>
              ) : (
                voices.map((voice) => {
                  const isSelected = voice.voice_id === selectedVoiceId;
                  const isPreviewing = previewVoiceId === voice.voice_id;
                  const gender = getVoiceGender(voice);

                  return (
                    <div
                      key={voice.voice_id}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600/20 border-l-2 border-blue-500'
                          : 'hover:bg-gray-750 border-l-2 border-transparent'
                      }`}
                      onClick={() => handleSelect(voice)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            gender === 'male' ? 'bg-blue-500/20' :
                            gender === 'female' ? 'bg-pink-500/20' :
                            'bg-gray-600'
                          }`}>
                            <User className={`w-4 h-4 ${
                              gender === 'male' ? 'text-blue-400' :
                              gender === 'female' ? 'text-pink-400' :
                              'text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className={`font-medium ${isSelected ? 'text-blue-400' : 'text-gray-100'}`}>
                              {voice.voice_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {getProviderLabel(voice.voice_id)}
                              {voice.accent && ` \u2022 ${voice.accent}`}
                              {voice.description && ` \u2022 ${voice.description}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Preview button */}
                          {voice.sample_url && (
                            <button
                              onClick={(e) => handlePreview(e, voice.voice_id)}
                              className={`p-2 rounded-full transition-colors ${
                                isPreviewing
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                              title="Preview voice"
                            >
                              {isPreviewing ? (
                                <Volume2 className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Selected check */}
                          {isSelected && (
                            <Check className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                      </div>

                      {/* Preview player */}
                      {isPreviewing && voice.sample_url && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pl-11"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <VoicePreviewPlayer
                            sampleUrl={voice.sample_url}
                            voiceName={voice.voice_name}
                            autoPlay={true}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
