"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, SkipForward, Volume2, Volume1, VolumeX, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Course } from "@/contexts/course-context"

type PomodoroTimerProps = {
  isActive: boolean
  session: { id: string; title: string; duration: number } | null
  onSessionEnd: () => void
  course: Course
}

type TimerState = "focus" | "break" | "idle"

export function PomodoroTimer({ isActive, session, onSessionEnd, course }: PomodoroTimerProps) {
  const [timerState, setTimerState] = useState<TimerState>("idle")
  const [timeLeft, setTimeLeft] = useState(25 * 60) // Default: 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [focusDuration, setFocusDuration] = useState(25) // in minutes
  const [breakDuration, setBreakDuration] = useState(5) // in minutes
  const [cycles, setCycles] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [ambientSound, setAmbientSound] = useState<string | null>("none") // Default value set to "none"
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize timer when a session is activated
  useEffect(() => {
    if (isActive && session) {
      setFocusDuration(session.duration)
      setTimeLeft(session.duration * 60)
      setTimerState("focus")
      setIsRunning(true)
    } else {
      resetTimer()
    }
  }, [isActive, session])

  // Timer countdown logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Timer finished
            clearInterval(timerRef.current as NodeJS.Timeout)

            // Play notification sound
            const audio = new Audio("/notification.mp3")
            audio.play()

            if (timerState === "focus") {
              // Switch to break
              setTimerState("break")
              setTimeLeft(breakDuration * 60)
              setCycles((prev) => prev + 1)
              return 0
            } else if (timerState === "break") {
              // Switch back to focus
              setTimerState("focus")
              setTimeLeft(focusDuration * 60)
              return 0
            }
          }
          return prevTime - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, timerState, breakDuration, focusDuration])

  // Handle ambient sound
  useEffect(() => {
    if (ambientSound && !isMuted) {
      if (!audioRef.current) {
        audioRef.current = new Audio(`/sounds/${ambientSound}.mp3`)
        audioRef.current.loop = true
      } else {
        audioRef.current.src = `/sounds/${ambientSound}.mp3`
      }

      audioRef.current.volume = volume / 100
      audioRef.current.play()
    } else if (audioRef.current) {
      audioRef.current.pause()
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [ambientSound, isMuted, volume])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate progress percentage
  const calculateProgress = () => {
    const totalSeconds = timerState === "focus" ? focusDuration * 60 : breakDuration * 60
    return ((totalSeconds - timeLeft) / totalSeconds) * 100
  }

  // Toggle timer play/pause
  const toggleTimer = () => {
    if (timerState === "idle") {
      setTimerState("focus")
      setTimeLeft(focusDuration * 60)
    }
    setIsRunning((prev) => !prev)
  }

  // Skip to next phase
  const skipToNext = () => {
    if (timerState === "focus") {
      setTimerState("break")
      setTimeLeft(breakDuration * 60)
      setCycles((prev) => prev + 1)
    } else {
      setTimerState("focus")
      setTimeLeft(focusDuration * 60)
    }
  }

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false)
    setTimerState("idle")
    setTimeLeft(focusDuration * 60)
    setCycles(0)

    if (session) {
      onSessionEnd()
    }
  }

  // Toggle ambient sound
  const toggleAmbientSound = (sound: string) => {
    if (ambientSound === sound) {
      setAmbientSound(null)
    } else {
      setAmbientSound(sound)
    }
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Pomodoro Timer</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
            {isActive && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={resetTimer}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showSettings ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="focus-duration">Focus Duration: {focusDuration} minutes</Label>
              <Slider
                id="focus-duration"
                min={5}
                max={60}
                step={5}
                value={[focusDuration]}
                onValueChange={(value) => setFocusDuration(value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="break-duration">Break Duration: {breakDuration} minutes</Label>
              <Slider
                id="break-duration"
                min={1}
                max={15}
                step={1}
                value={[breakDuration]}
                onValueChange={(value) => setBreakDuration(value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label>Ambient Sounds</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={ambientSound === "rain" ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAmbientSound("rain")}
                >
                  Rain
                </Button>
                <Button
                  variant={ambientSound === "cafe" ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAmbientSound("cafe")}
                >
                  Cafe
                </Button>
                <Button
                  variant={ambientSound === "forest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAmbientSound("forest")}
                >
                  Forest
                </Button>
                <Button
                  variant={ambientSound === "whitenoise" ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAmbientSound("whitenoise")}
                >
                  White Noise
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="volume">Volume</Label>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMute}>
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : volume > 50 ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <Volume1 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Slider
                id="volume"
                min={0}
                max={100}
                step={5}
                value={[volume]}
                onValueChange={(value) => setVolume(value[0])}
                disabled={isMuted}
              />
            </div>

            <Button className="w-full" onClick={() => setShowSettings(false)}>
              Save Settings
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col items-center justify-center">
              {session && (
                <div className="text-center mb-4">
                  <h4 className="font-medium">{session.title}</h4>
                  <p className="text-sm text-muted-foreground">{course.code}</p>
                </div>
              )}

              <div className="relative w-48 h-48 mb-4">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    className="text-muted stroke-current"
                    strokeWidth="4"
                    fill="transparent"
                    r="46"
                    cx="50"
                    cy="50"
                  />
                  {/* Progress circle */}
                  <circle
                    className={cn("stroke-current", timerState === "focus" ? "text-primary" : "text-green-500")}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="transparent"
                    r="46"
                    cx="50"
                    cy="50"
                    strokeDasharray="289.1"
                    strokeDashoffset={289.1 - (289.1 * calculateProgress()) / 100}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
                  <span className="text-sm text-muted-foreground capitalize">{timerState} Time</span>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={toggleTimer}>
                  {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={skipToNext}
                  disabled={timerState === "idle"}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {cycles} {cycles === 1 ? "cycle" : "cycles"} completed
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", ambientSound && !isMuted && "text-primary")}
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : volume > 50 ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <Volume1 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Select
                  value={ambientSound || "none"} // Default value set to "none"
                  onValueChange={(value) => setAmbientSound(value || null)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Ambient Sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="rain">Rain</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="forest">Forest</SelectItem>
                    <SelectItem value="whitenoise">White Noise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
