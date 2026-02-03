import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Gauge
} from 'lucide-react';

export default function SessionPlayer({
  audioUrl,
  onTimeUpdate,
  onSeek,
  currentTime: externalTime,
  duration: audioDuration,
  className = ''
}) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [buffered, setBuffered] = useState(0);

  // Sync with external time updates (from transcript clicks)
  useEffect(() => {
    if (externalTime !== undefined && audioRef.current && !isDragging) {
      audioRef.current.currentTime = externalTime;
      setCurrentTime(externalTime);
    }
  }, [externalTime, isDragging]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        const time = audio.currentTime;
        setCurrentTime(time);
        onTimeUpdate?.(time);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / audio.duration) * 100;
        setBuffered(bufferedPercent);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', handleProgress);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', handleProgress);
    };
  }, [isDragging, onTimeUpdate]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error('Play error:', err));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSkipBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, audio.currentTime - 10);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    onSeek?.(newTime);
  }, [onSeek]);

  const handleSkipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.min(duration, audio.currentTime + 10);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    onSeek?.(newTime);
  }, [duration, onSeek]);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const changePlaybackRate = useCallback(() => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const handleProgressClick = useCallback((e) => {
    const progressBar = progressBarRef.current;
    if (!progressBar || !audioRef.current) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onSeek?.(newTime);
  }, [duration, onSeek]);

  const handleProgressDrag = useCallback((e) => {
    if (!isDragging) return;

    const progressBar = progressBarRef.current;
    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;

    setCurrentTime(newTime);
  }, [isDragging, duration]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
      onSeek?.(currentTime);
    }
    setIsDragging(false);
  }, [currentTime, onSeek]);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Progress Bar */}
      <div className="mb-6">
        <div
          ref={progressBarRef}
          className="relative h-2 bg-gray-700 rounded-full cursor-pointer group"
          onClick={handleProgressClick}
          onMouseDown={handleDragStart}
          onMouseMove={handleProgressDrag}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {/* Buffered indicator */}
          <div
            className="absolute left-0 top-0 h-full bg-gray-600 rounded-full transition-all"
            style={{ width: `${buffered}%` }}
          />

          {/* Progress indicator */}
          <div
            className="absolute left-0 top-0 h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Playhead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPercent}%`, marginLeft: '-8px' }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-sm text-gray-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip Back */}
          <button
            onClick={handleSkipBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Skip back 10 seconds"
          >
            <SkipBack className="w-5 h-5 text-gray-300" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="p-3 bg-primary-600 hover:bg-primary-700 rounded-full transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={handleSkipForward}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Skip forward 10 seconds"
          >
            <SkipForward className="w-5 h-5 text-gray-300" />
          </button>

          {/* Playback Speed */}
          <button
            onClick={changePlaybackRate}
            className="px-3 py-1.5 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5 min-w-[70px] justify-center"
            aria-label={`Playback speed ${playbackRate}x`}
          >
            <Gauge className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-medium text-gray-300">{playbackRate}x</span>
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-gray-300" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-300" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            aria-label="Volume"
          />
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
