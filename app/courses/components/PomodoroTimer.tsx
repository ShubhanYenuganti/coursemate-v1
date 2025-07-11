import React from 'react';
import { usePomodoro } from './PomodoroContext';

const CYCLE_LABELS = ['1st Cycle', '2nd Cycle', '3rd Cycle', 'Long Break'];
const MODE_LABELS = {
  'work': 'Work',
  'short-break': 'Short Break',
  'long-break': 'Long Break',
};

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const getCycleColor = (idx: number, currentCycle: number) => {
  return idx < currentCycle ? '#2563eb' : 'none';
};

export const PomodoroTimer: React.FC<{ large?: boolean; onStart?: () => void }> = ({ large, onStart }) => {
  const { isRunning, currentCycle, timeLeft, mode, start, pause, reset } = usePomodoro();
  const max = mode === 'work' ? 25 * 60 : mode === 'short-break' ? 5 * 60 : 30 * 60;
  const percent = (timeLeft / max) * 100;
  const radius = large ? 90 : 48;
  const stroke = 10;
  const circ = 2 * Math.PI * radius;
  const dash = (percent / 100) * circ;

  const handleStart = () => {
    start();
    if (onStart) {
      onStart();
    }
  };

  // Render 3 small circles for cycles
  const renderCycles = () => (
    <div className="flex items-center gap-2 mt-2">
      {[0, 1, 2].map(idx => (
        <svg key={idx} width={large ? 22 : 16} height={large ? 22 : 16}>
          <circle
            cx={large ? 11 : 8}
            cy={large ? 11 : 8}
            r={large ? 8 : 6}
            fill={getCycleColor(idx, currentCycle)}
            stroke={getCycleColor(idx, currentCycle) === 'none' ? '#d1d5db' : '#2563eb'}
            strokeWidth={2}
          />
        </svg>
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col items-center ${large ? 'gap-6' : 'gap-2'}`}>
      <div className="relative flex items-center justify-center">
        <svg width={radius * 2 + stroke} height={radius * 2 + stroke}>
          <circle
            cx={radius + stroke / 2}
            cy={radius + stroke / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={radius + stroke / 2}
            cy={radius + stroke / 2}
            r={radius}
            stroke="#2563eb"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={circ - dash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
          <span className={`font-bold ${large ? 'text-4xl' : 'text-xl'} text-gray-900`}>{formatTime(timeLeft)}</span>
          <span className={`text-xs ${large ? 'text-base' : ''} text-gray-500 mt-1`}>{MODE_LABELS[mode]}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {isRunning ? (
          <button onClick={pause} className="px-4 py-1 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Pause</button>
        ) : (
          <button onClick={handleStart} className="px-4 py-1 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Start</button>
        )}
        <button onClick={reset} className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition">Reset</button>
      </div>
      {renderCycles()}
    </div>
  );
}; 