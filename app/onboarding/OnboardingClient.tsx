'use client';

import { OnboardingProvider } from "./OnboardingContext";
import { OnboardingWizard } from "./OnboardingWizard";

export default function OnboardingClient() {
  return (
    <OnboardingProvider>
      <OnboardingWizard />
    </OnboardingProvider>
  );
} 