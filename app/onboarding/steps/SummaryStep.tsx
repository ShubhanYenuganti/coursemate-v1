import React from "react";
import { useOnboarding } from "../OnboardingContext";

export const SummaryStep: React.FC<{ progress: number }> = ({ progress }) => {
  const { data } = useOnboarding();

  const handleGoToDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          school: data.school,
          year: data.year,
          major: data.major,
          profilePic: data.profilePic,
          academicInterests: data.academicInterests,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to complete onboarding");
        return;
      }
      localStorage.removeItem("onboardingStep");
      localStorage.removeItem("onboardingData");
      window.location.href = "/dashboard";
    } catch (e) {
      alert("Failed to complete onboarding. Please try again.");
    }
  };

  return (
    <div className="pt-24 max-w-3xl mx-auto w-full px-4 flex flex-col items-center">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-900">Welcome to CourseMate, {data.name || "User"}!</h1>
      <p className="mb-10 text-gray-600 text-center text-lg">You're all set. Here's a summary of your profile:</p>
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6">
        {data.profilePic && (
          <img src={data.profilePic} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-indigo-200 shadow mb-2" />
        )}
        <div className="w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-3 text-lg">
          <div><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-800">{data.email}</span></div>
          <div><span className="font-semibold text-gray-700">School:</span> <span className="text-gray-800">{data.school}</span></div>
          <div><span className="font-semibold text-gray-700">Year:</span> <span className="text-gray-800">{data.year}</span></div>
          <div><span className="font-semibold text-gray-700">Major:</span> <span className="text-gray-800">{data.major}</span></div>
          <div><span className="font-semibold text-gray-700">Academic Interests:</span> <span className="text-gray-800">{(data.academicInterests || []).join(", ")}</span></div>
          <div><span className="font-semibold text-gray-700">Notifications:</span> <span className="text-gray-800">{Object.entries(data.notificationPrefs || {}).filter(([k, v]) => v).map(([k]) => k).join(", ")}</span></div>
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full mx-auto py-3 rounded-full text-base shadow-md transition mt-6"
          onClick={handleGoToDashboard}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}; 