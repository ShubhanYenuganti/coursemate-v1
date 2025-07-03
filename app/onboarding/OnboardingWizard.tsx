import React, { useState, useEffect } from "react";
import { FullNameStep } from "./steps/FullNameStep";
import { SchoolStep } from "./steps/SchoolStep";
import { YearStep } from "./steps/YearStep";
import { SelectMajorStep } from "./steps/SelectMajorStep";
import { ProfilePictureStep } from "./steps/ProfilePictureStep";
import { AcademicInterestsStep } from "./steps/AcademicInterestsStep";
import { JoinClassStep } from "./steps/JoinClassStep";
import { TutorStep } from "./steps/TutorStep";
import { NotificationPreferencesStep } from "./steps/NotificationPreferencesStep";
import { SummaryStep } from "./steps/SummaryStep";
import { OnboardingPanel } from "./OnboardingPanel";

const onboardingSteps = [
  FullNameStep,
  SchoolStep,
  YearStep,
  SelectMajorStep,
  ProfilePictureStep,
  AcademicInterestsStep,
  JoinClassStep,
  TutorStep,
  NotificationPreferencesStep,
];

const LOCAL_STORAGE_KEY = "onboardingStep";

export const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(0);
  const total = onboardingSteps.length + 1;
  const progress = Math.round(((step + 1) / total) * 100);

  // Load step from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < total) {
        setStep(parsed);
      }
    }
  }, [total]);

  // Save step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, String(step));
  }, [step]);

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSkip = () => {
    setStep((s) => Math.min(s + 1, total - 1));
  };

  return (
    <OnboardingPanel progress={progress} step={step + 1} totalSteps={total}>
      {step < onboardingSteps.length ? (
        <>
          {/* Navigation Buttons under header */}
          <div className="w-full flex items-center justify-between" style={{ position: 'absolute', top: 64, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
            <div className="pl-8 pt-2" style={{ pointerEvents: 'auto' }}>
              {step > 0 && (
                <button
                  onClick={handleBack}
                  className="px-6 py-2 rounded-full bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 transition"
                >
                  Back
                </button>
              )}
            </div>
            <div className="pr-8 pt-2" style={{ pointerEvents: 'auto' }}>
              {step < onboardingSteps.length && (
                <button
                  onClick={handleSkip}
                  className="px-6 py-2 rounded-full bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 transition"
                >
                  Skip Step
                </button>
              )}
            </div>
          </div>
          {React.createElement(onboardingSteps[step], {
            onNext: () => setStep((s) => Math.min(s + 1, total - 1)),
            progress,
          })}
        </>
      ) : (
        <>
          {/* Back button on summary step */}
          <div className="w-full flex items-center justify-between" style={{ position: 'absolute', top: 64, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
            <div className="pl-8 pt-2" style={{ pointerEvents: 'auto' }}>
              <button
                onClick={handleBack}
                className="px-6 py-2 rounded-full bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 transition"
              >
                Back
              </button>
            </div>
            <div className="pr-8 pt-2" style={{ pointerEvents: 'auto' }}></div>
          </div>
          <SummaryStep progress={progress} />
        </>
      )}
    </OnboardingPanel>
  );
}; 