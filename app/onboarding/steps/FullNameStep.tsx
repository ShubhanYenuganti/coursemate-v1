import React, { useState } from "react";
import { useOnboarding } from "../OnboardingContext";

export const FullNameStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [name, setName] = useState(data.name || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setData({ name });
    onNext();
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-10 mt-2 text-gray-900">What's your full name?</h1>
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-8">
        <input
          className="w-full max-w-md border border-gray-200 rounded-xl px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm placeholder-gray-400"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full mx-auto py-3 rounded-full text-base shadow-md transition mt-6"
        >
          Continue
        </button>
      </form>
    </>
  );
}; 