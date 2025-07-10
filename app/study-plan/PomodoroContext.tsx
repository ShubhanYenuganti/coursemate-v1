import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface PomodoroState {
  isRunning: boolean;
  currentCycle: number; // 0, 1, 2 for work, 3 for long break
  timeLeft: number; // seconds
  mode: 'work' | 'short-break' | 'long-break';
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setSubtask: (subtask: any) => void;
  subtask: any;
}

const PomodoroContext = createContext<PomodoroState | undefined>(undefined);

const WORK_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 30 * 60; // 30 minutes
const TOTAL_CYCLES = 3;

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [mode, setMode] = useState<'work' | 'short-break' | 'long-break'>('work');
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [subtask, setSubtask] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleCycleEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line
  }, [isRunning, mode, currentCycle]);

  const handleCycleEnd = () => {
    if (mode === 'work') {
      if (currentCycle < TOTAL_CYCLES - 1) {
        setMode('short-break');
        setTimeLeft(SHORT_BREAK);
      } else {
        setMode('long-break');
        setTimeLeft(LONG_BREAK);
      }
    } else if (mode === 'short-break') {
      setCurrentCycle(c => c + 1);
      setMode('work');
      setTimeLeft(WORK_DURATION);
    } else if (mode === 'long-break') {
      setCurrentCycle(0);
      setMode('work');
      setTimeLeft(WORK_DURATION);
      setIsRunning(false);
    }
  };

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    if (mode === 'work') {
      setTimeLeft(WORK_DURATION);
      setIsRunning(true);
    } else if (mode === 'short-break') {
      setTimeLeft(SHORT_BREAK);
      setIsRunning(true);
    } else if (mode === 'long-break') {
      setIsRunning(false);
      setCurrentCycle(0);
      setMode('work');
      setTimeLeft(WORK_DURATION);
      setSubtask(null);
    }
  };
  const skip = () => handleCycleEnd();

  return (
    <PomodoroContext.Provider value={{ 
      isRunning, 
      currentCycle, 
      timeLeft, 
      mode, 
      start, 
      pause, 
      reset, 
      skip, 
      setSubtask, 
      subtask
    }}>
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = () => {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider');
  return ctx;
}; 