import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Loader2 } from 'lucide-react';

/**
 * Audio sample player for voice previews
 */
export default function VoicePreviewPlayer({
  sampleUrl,
  voiceName,
  compact = false,
  autoPlay = false
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // Handle autoPlay
  useEffect(() => {
    if (autoPlay && sampleUrl && audioRef.current) {
      handlePlay();
    }
  }, [autoPlay, sampleUrl]);

  // Reset when sample URL changes
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [sampleUrl]);

  const handlePlay = async () => {
    if (!sampleUrl || !audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        setError(null);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Unable to play sample');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const percentage = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(percentage || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleLoadError = () => {
    setError('Sample unavailable');
    setIsLoading(false);
  };

  if (!sampleUrl) {
    return compact ? null : (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Volume2 className="w-4 h-4" />
        <span>No preview available</span>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={handlePlay}
        disabled={isLoading}
        className={`p-2 rounded-full transition-colors ${
          isPlaying
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title={`Preview ${voiceName}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        <audio
          ref={audioRef}
          src={sampleUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleLoadError}
          preload="none"
        />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handlePlay}
        disabled={isLoading}
        className={`p-2.5 rounded-full transition-colors ${
          isPlaying
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title={isPlaying ? 'Pause' : 'Play preview'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-300">{voiceName}</span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={sampleUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleLoadError}
        preload="none"
      />
    </div>
  );
}
