import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useAudio } from './AudioContext';

export type TimerType = 'pomodoro' | 'normal' | 'stopwatch';

interface TimerState {
  // Timer type and state
  timerType: TimerType;
  isRunning: boolean;
  timeLeft: number; // seconds
  elapsedTime: number; // for stopwatch
  
  // Pomodoro specific
  currentCycle: number;
  mode: 'work' | 'short-break' | 'long-break';
  workDuration: number; // customizable work duration in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  
  // Normal timer specific
  normalTimerDuration: number; // in minutes
  
  // Activity detection
  isActive: boolean;
  lastActivityTime: number;
  inactivityThreshold: number; // seconds
  
  // Actions
  setTimerType: (type: TimerType) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  
  // Activity management
  updateActivity: () => void;
  updateInactivityThreshold: (seconds: number) => void;
  
  // Timer state management
  getCurrentTimerState: () => {
    timerType: TimerType;
    timeLeft: number;
    elapsedTime: number;
    currentCycle: number;
    mode: 'work' | 'short-break' | 'long-break';
    isRunning: boolean;
  };
  
  // Customization
  setWorkDuration: (minutes: number) => void;
  updateShortBreakDuration: (minutes: number) => void;
  updateLongBreakDuration: (minutes: number) => void;
  setNormalTimerDuration: (minutes: number) => void;
  
  // Subtask tracking
  setSubtask: (subtask: any) => void;
  subtask: any;
  totalCycles: number;
  setTotalCycles: (cycles: number) => void;
}

const TimerContext = createContext<TimerState | undefined>(undefined);

const DEFAULT_WORK_DURATION = 25; // 25 minutes
const DEFAULT_SHORT_BREAK = 5; // 5 minutes
const DEFAULT_LONG_BREAK = 15; // 15 minutes
const DEFAULT_NORMAL_TIMER = 30; // 30 minutes
const TOTAL_CYCLES = 3;
const DEFAULT_INACTIVITY_THRESHOLD = 180; // 3 minutes

export const TimerProvider: React.FC<{ 
  children: React.ReactNode; 
  autoStart?: boolean;
  initialTimerState?: {
    timerType?: TimerType;
    timeLeft?: number;
    elapsedTime?: number;
    currentCycle?: number;
    mode?: 'work' | 'short-break' | 'long-break';
    isRunning?: boolean;
  };
}> = ({ children, autoStart = false, initialTimerState }) => {
  const [timerType, setTimerType] = useState<TimerType>(initialTimerState?.timerType || 'pomodoro');
  const [isRunning, setIsRunning] = useState(initialTimerState?.isRunning ?? autoStart);
  const [currentCycle, setCurrentCycle] = useState(initialTimerState?.currentCycle || 0);
  const [mode, setMode] = useState<'work' | 'short-break' | 'long-break'>(initialTimerState?.mode || 'work');
  const [timeLeft, setTimeLeft] = useState(initialTimerState?.timeLeft ?? DEFAULT_WORK_DURATION * 60);
  const [elapsedTime, setElapsedTime] = useState(initialTimerState?.elapsedTime ?? 0);
  
  // Activity detection
  const [isActive, setIsActive] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [inactivityThreshold, setInactivityThreshold] = useState(DEFAULT_INACTIVITY_THRESHOLD);
  
  // Customizable durations
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK_DURATION);
  const [shortBreakDuration, setShortBreakDuration] = useState(DEFAULT_SHORT_BREAK);
  const [longBreakDuration, setLongBreakDuration] = useState(DEFAULT_LONG_BREAK);
  const [normalTimerDuration, setNormalTimerDuration] = useState(DEFAULT_NORMAL_TIMER);
  
  const [subtask, setSubtask] = useState<any>(null);
  const [totalCycles, setTotalCycles] = useState(TOTAL_CYCLES);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Audio integration
  const { playSound } = useAudio();

  // Activity detection handlers
  const updateActivity = () => {
    setLastActivityTime(Date.now());
    setIsActive(true);
  };

  const updateInactivityThreshold = (seconds: number) => {
    setInactivityThreshold(seconds);
  };

  // Activity detection effect
  useEffect(() => {
    const handleActivity = () => {
      updateActivity();
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Check for inactivity
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = (now - lastActivityTime) / 1000;
      
      if (timeSinceLastActivity >= inactivityThreshold && isActive && isRunning) {
        setIsActive(false);
        // Don't pause here - let the parent component handle the pause logic
      }
    };

    activityCheckRef.current = setInterval(checkInactivity, 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (activityCheckRef.current) {
        clearInterval(activityCheckRef.current);
      }
    };
  }, [lastActivityTime, inactivityThreshold, isActive, isRunning]);

  useEffect(() => {
    const handler = (e: any) => {
      if (typeof e.detail === 'number') {
        setInactivityThreshold(e.detail);
      }
    };
    window.addEventListener('setInactivityThreshold', handler as any);
    if (timerType === 'pomodoro') {
      setTimeLeft(workDuration * 60);
      setCurrentCycle(0);
      setMode('work');
      setElapsedTime(0);
    } else if (timerType === 'normal') {
      setTimeLeft(normalTimerDuration * 60);
      setElapsedTime(0);
    } else if (timerType === 'stopwatch') {
      setTimeLeft(0);
      setElapsedTime(0);
    }
    setIsRunning(false);
  }, [timerType, workDuration, normalTimerDuration]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (timerType === 'stopwatch') {
          setElapsedTime(prev => prev + 1);
        } else {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (timerType === 'pomodoro') {
                handlePomodoroCycleEnd();
                return 0;
              } else {
                // Normal timer finished
                setIsRunning(false);
                playSound(); // Play sound when normal timer completes
                return 0;
              }
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timerType, mode, currentCycle, playSound]);

  const handlePomodoroCycleEnd = () => {
    // Play sound when work cycle ends
    if (mode === 'work') {
      playSound();
    }
    
    if (mode === 'work') {
      setCurrentCycle(c => c + 1);
      if (currentCycle < totalCycles - 1) {
        setMode('short-break');
        setTimeLeft(shortBreakDuration * 60);
      } else {
        setMode('long-break');
        setTimeLeft(longBreakDuration * 60);
      }
    } else if (mode === 'short-break') {
      setMode('work');
      setTimeLeft(workDuration * 60);
    } else if (mode === 'long-break') {
      setCurrentCycle(0);
      setMode('work');
      setTimeLeft(workDuration * 60);
      setIsRunning(false);
    }
  };

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const updateShortBreakDuration = (minutes: number) => setShortBreakDuration(minutes);
  const updateLongBreakDuration = (minutes: number) => setLongBreakDuration(minutes);
  const reset = () => {
    if (timerType === 'pomodoro') {
      if (mode === 'work') {
        setTimeLeft(workDuration * 60);
        setIsRunning(true);
      } else if (mode === 'short-break') {
        setTimeLeft(shortBreakDuration * 60);
        setIsRunning(true);
      } else if (mode === 'long-break') {
        setIsRunning(false);
        setCurrentCycle(0);
        setMode('work');
        setTimeLeft(workDuration * 60);
      }
    } else if (timerType === 'normal') {
      setTimeLeft(normalTimerDuration * 60);
      setIsRunning(true);
    } else if (timerType === 'stopwatch') {
      setElapsedTime(0);
      setIsRunning(true);
    }
  };
  
  const skip = () => {
    if (timerType === 'pomodoro') {
      handlePomodoroCycleEnd();
    }
  };

  const getCurrentTimerState = () => ({
    timerType,
    timeLeft,
    elapsedTime,
    currentCycle,
    mode,
    isRunning,
  });

  return (
    <TimerContext.Provider value={{ 
      timerType,
      isRunning, 
      currentCycle, 
      timeLeft, 
      elapsedTime,
      mode, 
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      normalTimerDuration,
      isActive,
      lastActivityTime,
      inactivityThreshold,
      setTimerType,
      start, 
      pause, 
      reset, 
      skip, 
      updateActivity,
      updateInactivityThreshold,
      setWorkDuration,
      updateShortBreakDuration,
      updateLongBreakDuration,
      setNormalTimerDuration,
      setSubtask, 
      subtask,
      totalCycles,
      setTotalCycles,
      getCurrentTimerState
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}; 