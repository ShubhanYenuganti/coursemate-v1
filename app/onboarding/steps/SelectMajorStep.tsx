import React, { useState } from "react";
import { useOnboarding } from "../OnboardingContext";

const majorOptions = [
  "Computer Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Economics",
  "Psychology",
  "Engineering",
  "Business",
  "English",
  "Political Science",
  "History",
  "Other"
];

export const SelectMajorStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [major, setMajor] = useState(data.major || "");
  const [customMajor, setCustomMajor] = useState("");

  const handleContinue = () => {
    setData({ major: major === "Other" ? customMajor : major });
    onNext();
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-10 mt-2 text-gray-900">What is your major?</h1>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
        className="w-full flex flex-col items-center gap-8"
      >
        <div className="w-full max-w-md flex flex-col gap-4">
          <select
            className="w-full border border-gray-200 rounded-xl px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm placeholder-gray-400"
            value={major}
            onChange={e => setMajor(e.target.value)}
            required
          >
            <option value="" disabled>Select your major</option>
            {majorOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {major === "Other" && (
            <input
              className="w-full border border-gray-200 rounded-xl px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm placeholder-gray-400"
              placeholder="Enter your major"
              value={customMajor}
              onChange={e => setCustomMajor(e.target.value)}
              required
            />
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full mx-auto py-3 rounded-full text-base shadow-md transition mt-6"
          disabled={major === "" || (major === "Other" && !customMajor)}
        >
          Continue
        </button>
      </form>
    </>
  );
}; 