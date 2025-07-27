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

const WORK_DURATION = 15; // 15 seconds for demo
const SHORT_BREAK = 15; // 15 seconds for demo
const LONG_BREAK = 15; // 15 seconds for demo
const TOTAL_CYCLES = 3;

export const PomodoroProvider: React.FC<{ children: React.ReactNode; autoStart?: boolean }> = ({ children, autoStart = false }) => {
  const [isRunning, setIsRunning] = useState(autoStart);
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
      setCurrentCycle(c => c + 1); // Increment cycle immediately after work session
      if (currentCycle < TOTAL_CYCLES - 1) {
        setMode('short-break');
        setTimeLeft(SHORT_BREAK);
      } else {
        setMode('long-break');
        setTimeLeft(LONG_BREAK);
      }
    } else if (mode === 'short-break') {
      setMode('work');
      setTimeLeft(WORK_DURATION);
    } else if (mode === 'long-break') {
      setCurrentCycle(0); // Reset cycles so all circles are unfilled
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