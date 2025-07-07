import React, { useState } from "react";
import { useOnboarding } from "../OnboardingContext";
import { ChevronDown } from "lucide-react";

const yearOptions = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "Other",
];

export const YearStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [year, setYear] = useState(data.year || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setData({ year });
    onNext();
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-10 mt-2 text-gray-900">What year are you in?</h1>
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-8">
        <div className="relative w-full max-w-md">
          <select
            className="w-full appearance-none border border-gray-200 rounded-xl px-5 py-3 pr-12 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm placeholder-gray-400"
            value={year}
            onChange={e => setYear(e.target.value)}
            required
          >
            <option value="" disabled>Select your year</option>
            {yearOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={22} />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full mx-auto py-3 rounded-full text-base shadow-md transition mt-6"
          disabled={!year}
        >
          Continue
        </button>
      </form>
    </>
  );
}; 