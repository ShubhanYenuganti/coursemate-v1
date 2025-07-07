import type { Metadata } from "next";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Complete Your Profile",
  description: "Provide additional information to complete your profile",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
