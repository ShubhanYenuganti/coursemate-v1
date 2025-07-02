'use client';

import React, { createContext, useContext, useState } from "react";

export interface OnboardingData {
  name?: string;
  email?: string;
  profilePic?: string;
  school?: string;
  year?: string;
  academicInterests?: string[];
  studyPreferences?: {
    wantsStudyGroup?: boolean;
    wantsToTutor?: boolean;
    preferredTimes?: string[];
    tutorRole?: string;
    tutorSubjects?: string[];
    tutorAvailability?: string;
  };
  notificationPrefs?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  isGoogleUser?: boolean;
  joinedClasses?: number[];
}

interface OnboardingContextProps {
  data: OnboardingData;
  setData: (data: Partial<OnboardingData>) => void;
}

const OnboardingContext = createContext<OnboardingContextProps | undefined>(undefined);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode; initialData?: OnboardingData }> = ({
  children,
  initialData = {},
}) => {
  const [data, setDataState] = useState<OnboardingData>(initialData);
  const setData = (newData: Partial<OnboardingData>) =>
    setDataState((prev) => ({ ...prev, ...newData }));

  return (
    <OnboardingContext.Provider value={{ data, setData }}>
      {children}
    </OnboardingContext.Provider>
  );
}; 