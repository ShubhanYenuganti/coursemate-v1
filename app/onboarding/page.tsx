import type { Metadata } from "next"
import { OnboardingForm } from "@/components/auth/onboarding-form"

export const metadata: Metadata = {
  title: "Complete Your Profile",
  description: "Provide additional information to complete your profile",
}

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Complete your profile</h1>
          <p className="text-gray-500">Tell us a bit more about yourself to get personalized recommendations</p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
