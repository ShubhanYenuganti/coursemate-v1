import React, { useState } from 'react';
import { useTimer } from './TimerContext';
import { useAudio } from './AudioContext';
import { ChevronDown, Settings, Volume2, VolumeX } from 'lucide-react';

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

export const UnifiedTimer: React.FC<{ large?: boolean; onStart?: () => void }> = ({ large, onStart }) => {
  const { 
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
    setTimerType,
    start, 
    pause, 
    reset, 
    skip,
    setWorkDuration,
    updateShortBreakDuration,
    updateLongBreakDuration,
    setNormalTimerDuration,
    totalCycles,
    setTotalCycles
  } = useTimer();

  const { selectedSound, isPlaying, setSelectedSound, acknowledge } = useAudio();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSoundDropdown, setShowSoundDropdown] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [tempWorkDuration, setTempWorkDuration] = useState(workDuration);
  const [tempNormalDuration, setTempNormalDuration] = useState(normalTimerDuration);
  const [tempCycles, setTempCycles] = useState(totalCycles);

  // Calculate display values based on timer type
  const getDisplayTime = () => {
    if (timerType === 'stopwatch') {
      return elapsedTime;
    }
    return timeLeft;
  };

  const getMaxTime = () => {
    if (timerType === 'pomodoro') {
      if (mode === 'work') return workDuration * 60;
      if (mode === 'short-break') return shortBreakDuration * 60;
      if (mode === 'long-break') return longBreakDuration * 60;
      return workDuration * 60;
    } else if (timerType === 'normal') {
      return normalTimerDuration * 60;
    }
    return 0; // stopwatch has no max
  };

  const getModeLabel = () => {
    if (timerType === 'pomodoro') {
      return MODE_LABELS[mode];
    } else if (timerType === 'normal') {
      return 'Timer';
    } else {
      return 'Stopwatch';
    }
  };

  const handleStart = () => {
    start();
    if (onStart) {
      onStart();
    }
  };

  const handleTimeClick = () => {
    if (timerType === 'normal' && !isRunning) {
      setEditingTime(true);
      setTempNormalDuration(normalTimerDuration);
    } else if (timerType === 'pomodoro' && !isRunning && mode === 'work') {
      setEditingTime(true);
      setTempWorkDuration(workDuration);
    }
  };

  const handleTimeSave = () => {
    if (timerType === 'normal') {
      setNormalTimerDuration(tempNormalDuration);
    } else if (timerType === 'pomodoro') {
      setWorkDuration(tempWorkDuration);
    }
    setEditingTime(false);
  };

  const handleTimeCancel = () => {
    setEditingTime(false);
  };

  const displayTime = getDisplayTime();
  const maxTime = getMaxTime();
  const percent = maxTime > 0 ? (displayTime / maxTime) * 100 : 0;
  // Make timer always large
  const radius = 120;
  const stroke = 14;
  const circ = 2 * Math.PI * radius;
  const dash = (percent / 100) * circ;

  // Render 3 small circles for pomodoro cycles
  const renderCycles = () => {
    if (timerType !== 'pomodoro') return null;
    
    return (
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
  };

  return (
    <div className={`flex flex-col items-center gap-8`}>
      {/* Audio Acknowledgment Modal */}
      {isPlaying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <Volume2 size={64} className="mx-auto text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Timer Complete!</h3>
              <p className="text-gray-600 mb-6">
                {timerType === 'pomodoro' && mode === 'work' 
                  ? 'Work cycle completed! Time for a break.'
                  : timerType === 'normal'
                  ? 'Timer finished!'
                  : 'Time is up!'}
              </p>
              <button
                onClick={acknowledge}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Type Dropdown */}
      <div className="relative mb-4">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-lg hover:bg-gray-50 transition-colors"
        >
          <span className="capitalize">{timerType === 'normal' ? 'Timer' : timerType}</span>
          <ChevronDown size={20} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[140px]">
            {(['pomodoro', 'normal', 'stopwatch'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setTimerType(type);
                  setShowDropdown(false);
                }}
                className={`w-full px-4 py-3 text-left text-lg hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                  timerType === type ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <span className="capitalize">{type === 'normal' ? 'Timer' : type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 p-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Settings size={28} />
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-6 z-10 min-w-[260px]">
          <h4 className="font-medium mb-4 text-lg">Timer Settings</h4>
          {timerType === 'pomodoro' && (
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Work Duration (minutes)</label>
                <input
                  type="number"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(parseInt(e.target.value) || 25)}
                  min="1"
                  max="120"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Short Break (minutes)</label>
                <input
                  type="number"
                  value={shortBreakDuration}
                  onChange={(e) => updateShortBreakDuration(parseInt(e.target.value) || 5)}
                  min="1"
                  max="30"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Long Break (minutes)</label>
                <input
                  type="number"
                  value={longBreakDuration}
                  onChange={(e) => updateLongBreakDuration(parseInt(e.target.value) || 15)}
                  min="1"
                  max="60"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Number of Work Cycles</label>
                <input
                  type="number"
                  value={totalCycles}
                  onChange={(e) => setTotalCycles(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="10"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                />
              </div>
            </div>
          )}
          {timerType === 'normal' && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">Timer Duration (minutes)</label>
              <input
                type="number"
                value={normalTimerDuration}
                onChange={(e) => setNormalTimerDuration(parseInt(e.target.value) || 30)}
                min="1"
                max="180"
                className="w-full px-2 py-1 border border-gray-300 rounded text-base"
              />
            </div>
          )}
          {/* Sound Selection Dropdown (moved here) */}
          <div className="relative mt-6">
            <label className="block text-base font-medium text-gray-700 mb-1">Timer Sound</label>
            <button
              onClick={() => setShowSoundDropdown(!showSoundDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full"
            >
              {selectedSound === 'none' ? <VolumeX size={18} /> : <Volume2 size={18} />}
              <span className="capitalize">{selectedSound === 'none' ? 'No Sound' : selectedSound}</span>
              <ChevronDown size={16} className={`transition-transform ${showSoundDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSoundDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[140px]">
                {(['bell', 'chime', 'beep', 'notification', 'none'] as const).map((sound) => (
                  <button
                    key={sound}
                    onClick={() => {
                      setSelectedSound(sound);
                      setShowSoundDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 ${
                      selectedSound === sound ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {sound === 'none' ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span className="capitalize">{sound === 'none' ? 'No Sound' : sound}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timer Display */}
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
          {timerType !== 'stopwatch' && (
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
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
          {editingTime ? (
            <div className="text-center">
              <input
                type="number"
                value={timerType === 'normal' ? tempNormalDuration : tempWorkDuration}
                onChange={(e) => {
                  if (timerType === 'normal') {
                    setTempNormalDuration(parseInt(e.target.value) || 30);
                  } else {
                    setTempWorkDuration(parseInt(e.target.value) || 25);
                  }
                }}
                className={`font-bold text-5xl text-gray-900 bg-transparent border-none outline-none text-center w-32`}
                min="1"
                max="180"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleTimeSave()}
                onBlur={handleTimeSave}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleTimeSave}
                  className="px-3 py-2 bg-blue-600 text-white text-base rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleTimeCancel}
                  className="px-3 py-2 bg-gray-300 text-gray-700 text-base rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <span 
                className={`font-bold text-6xl text-gray-900 ${
                  (timerType === 'normal' && !isRunning) || (timerType === 'pomodoro' && !isRunning && mode === 'work')
                    ? 'cursor-pointer hover:text-blue-600'
                    : ''
                }`}
                onClick={handleTimeClick}
              >
                {formatTime(displayTime)}
              </span>
              <span className={`text-lg text-gray-500 mt-2`}>
                {getModeLabel()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-4">
        {isRunning ? (
          <button onClick={pause} className="px-6 py-2 rounded bg-blue-600 text-white font-semibold text-lg shadow hover:bg-blue-700 transition">
            Pause
          </button>
        ) : (
          <button onClick={handleStart} className="px-6 py-2 rounded bg-blue-600 text-white font-semibold text-lg shadow hover:bg-blue-700 transition">
            Start
          </button>
        )}
        <button onClick={reset} className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold text-lg hover:bg-gray-300 transition">
          Reset
        </button>
        {timerType === 'pomodoro' && (
          <button onClick={skip} className="px-4 py-2 rounded bg-yellow-500 text-white font-semibold text-lg hover:bg-yellow-600 transition">
            Skip
          </button>
        )}
      </div>
      {renderCycles()}
    </div>
  );
}; 