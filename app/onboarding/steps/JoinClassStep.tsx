import React, { useState } from "react";
import { useOnboarding } from "../OnboardingContext";
import { OnboardingPanel } from "../OnboardingPanel";

const mockClasses = [
  { id: 1, title: "Calculus III Study Group", description: "Collaborate on advanced calculus problems and homework." },
  { id: 2, title: "Organic Chemistry Crash Course", description: "Weekly sessions to master organic chemistry concepts." },
  { id: 3, title: "Data Structures & Algorithms", description: "Prepare for coding interviews and ace your CS classes." },
  { id: 4, title: "Physics II Peer Support", description: "Get help with physics labs and assignments." },
  { id: 5, title: "Statistics for Life Sciences", description: "Focus on statistics applications in biology and medicine." },
];

export const JoinClassStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [selected, setSelected] = useState<number[]>([]);

  const toggleClass = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleContinue = () => {
    setData({ joinedClasses: selected });
    onNext();
  };

  return (
    <OnboardingPanel progress={progress} centerContent={false}>
      <div className="pt-24 max-w-3xl mx-auto w-full px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-8">Join a class or study group</h1>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {mockClasses.map(cls => (
            <div
              key={cls.id}
              className={`rounded-2xl border-2 p-7 shadow-md transition-all cursor-pointer flex flex-col gap-3 bg-white hover:border-indigo-300 ${selected.includes(cls.id) ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
              onClick={() => toggleClass(cls.id)}
              tabIndex={0}
              aria-label={`Join ${cls.title}`}
            >
              <div className="font-semibold text-xl text-gray-800 mb-1">{cls.title}</div>
              <div className="text-gray-600 text-base mb-2 flex-1">{cls.description}</div>
              <button
                type="button"
                className={`mt-auto px-6 py-2 rounded-full text-base font-semibold transition-all shadow-sm ${selected.includes(cls.id) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-indigo-50"}`}
                onClick={e => { e.stopPropagation(); toggleClass(cls.id); }}
              >
                {selected.includes(cls.id) ? "Joined" : "Join"}
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-center w-full">
          <button
            onClick={handleContinue}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full py-3 rounded-full text-base shadow-md transition mt-6"
            disabled={selected.length === 0}
          >
            Continue
          </button>
        </div>
      </div>
    </OnboardingPanel>
  );
}; 