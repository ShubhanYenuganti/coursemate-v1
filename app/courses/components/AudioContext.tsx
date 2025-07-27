import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

export type SoundType = 'bell' | 'chime' | 'beep' | 'notification' | 'none';

interface AudioState {
  selectedSound: SoundType;
  isPlaying: boolean;
  setSelectedSound: (sound: SoundType) => void;
  playSound: () => void;
  stopSound: () => void;
  acknowledge: () => void;
}

const AudioContext = createContext<AudioState | undefined>(undefined);

const SOUND_URLS = {
  bell: '/sounds/bell.mp3',
  chime: '/sounds/chime.mp3',
  beep: '/sounds/beep.mp3',
  notification: '/sounds/notification.mp3',
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedSound, setSelectedSound] = useState<SoundType>('bell');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio();
    audioRef.current.loop = true; // Loop until acknowledged
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const playSound = () => {
    if (selectedSound === 'none' || !audioRef.current) return;

    try {
      audioRef.current.src = SOUND_URLS[selectedSound];
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Error playing audio:', error);
        // Fallback: create a simple beep sound
        createFallbackBeep();
      });
    } catch (error) {
      console.error('Error setting audio source:', error);
      // Fallback: create a simple beep sound
      createFallbackBeep();
    }
  };

  const createFallbackBeep = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Repeat the beep every 2 seconds
    intervalRef.current = setInterval(() => {
      const newOscillator = audioContext.createOscillator();
      const newGainNode = audioContext.createGain();
      
      newOscillator.connect(newGainNode);
      newGainNode.connect(audioContext.destination);
      
      newOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      newOscillator.type = 'sine';
      
      newGainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      newGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      newOscillator.start(audioContext.currentTime);
      newOscillator.stop(audioContext.currentTime + 0.5);
    }, 2000);
    
    setIsPlaying(true);
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const acknowledge = () => {
    stopSound();
  };

  return (
    <AudioContext.Provider value={{
      selectedSound,
      isPlaying,
      setSelectedSound,
      playSound,
      stopSound,
      acknowledge
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}; 