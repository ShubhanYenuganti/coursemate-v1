import React, { useState } from "react";
import { useOnboarding } from "../OnboardingContext";

export const AcademicInterestsStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [input, setInput] = useState("");
  const [interests, setInterests] = useState<string[]>(data.academicInterests || []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !interests.includes(input.trim())) {
      setInterests([...interests, input.trim()]);
      setInput("");
    }
  };

  const handleRemove = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleContinue = () => {
    setData({ academicInterests: interests });
    onNext();
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-10 mt-2 text-gray-900">What are your academic and personal interests?</h1>
      <form onSubmit={handleAdd} className="flex gap-3 mb-8 w-full max-w-md">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm placeholder-gray-400"
          placeholder="Add an interest..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-32 max-w-full mx-auto py-3 rounded-full text-base shadow-md transition"
        >
          Add
        </button>
      </form>
      <div className="flex flex-wrap gap-3 mb-10 w-full max-w-md justify-center">
        {interests.map(interest => (
          <span
            key={interest}
            className="bg-blue-100 text-blue-700 px-5 py-2 rounded-full flex items-center gap-2 text-base font-medium shadow-sm"
          >
            {interest}
            <button
              type="button"
              className="ml-1 text-blue-400 hover:text-red-500 text-lg"
              onClick={() => handleRemove(interest)}
              aria-label={`Remove ${interest}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={handleContinue}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full mx-auto py-3 rounded-full text-base shadow-md transition mt-6"
        disabled={interests.length === 0}
      >
        Continue
      </button>
    </>
  );
}; 