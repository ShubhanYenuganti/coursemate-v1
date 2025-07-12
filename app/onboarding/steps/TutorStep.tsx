import React, { useState } from "react";
import { useOnboarding } from "../OnboardingContext";
import { OnboardingPanel } from "../OnboardingPanel";

const subjectAreas = [
  "Calc III", "Organic Chem", "Linear Algebra", "Physics II", "Data Structures",
  "Algorithms", "Probability", "Statistics", "Differential Equations", "Discrete Math"
];

export const TutorStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [role, setRole] = useState<"tutee" | "tutor" | "none">("none");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availability, setAvailability] = useState("");

  const handleRoleChange = (value: "tutee" | "tutor" | "none") => setRole(value);
  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };
  const handleContinue = () => {
    setData({ studyPreferences: {
      ...data.studyPreferences,
      tutorRole: role,
      tutorSubjects: selectedSubjects,
      tutorAvailability: availability
    }});
    onNext();
  };

  return (
    <OnboardingPanel progress={progress} centerContent={false} disableOuterScroll={true}>
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-8 pt-6">Are you open to tutoring or looking for a tutor?</h1>
        <div className="w-full max-w-2xl flex flex-col gap-8 items-center">
          <div className="w-full flex flex-col md:flex-row gap-6 mb-2 justify-center">
            <label className={`flex-1 flex items-center gap-4 p-6 rounded-2xl border-2 transition-all cursor-pointer text-lg font-semibold shadow-sm ${role === "tutee" ? "border-sky-400 bg-sky-50" : "border-gray-200 bg-white hover:border-sky-200"}`}
              tabIndex={0} onClick={() => handleRoleChange("tutee")}
            >
              <input type="radio" checked={role === "tutee"} onChange={() => handleRoleChange("tutee")}
                className="form-radio h-6 w-6 text-sky-500" />
              <span>I'm looking for a tutor</span>
            </label>
            <label className={`flex-1 flex items-center gap-4 p-6 rounded-2xl border-2 transition-all cursor-pointer text-lg font-semibold shadow-sm ${role === "tutor" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-200"}`}
              tabIndex={0} onClick={() => handleRoleChange("tutor")}
            >
              <input type="radio" checked={role === "tutor"} onChange={() => handleRoleChange("tutor")}
                className="form-radio h-6 w-6 text-indigo-600" />
              <span>I want to tutor others</span>
            </label>
            <label className={`flex-1 flex items-center gap-4 p-6 rounded-2xl border-2 transition-all cursor-pointer text-lg font-semibold shadow-sm ${role === "none" ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
              tabIndex={0} onClick={() => handleRoleChange("none")}
            >
              <input type="radio" checked={role === "none"} onChange={() => handleRoleChange("none")}
                className="form-radio h-6 w-6 text-gray-400" />
              <span>Not right now</span>
            </label>
          </div>
          <div className="w-full">
            <div className="font-semibold text-gray-800 mb-3 text-lg">Subject Areas</div>
            <div className="flex flex-wrap gap-3">
              {subjectAreas.map(subject => (
                <button
                  key={subject}
                  type="button"
                  className={`px-5 py-2 rounded-full text-base font-medium border-2 transition-all shadow-sm ${selectedSubjects.includes(subject) ? "bg-indigo-100 text-indigo-700 border-indigo-400" : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-indigo-50"}`}
                  onClick={() => toggleSubject(subject)}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full">
            <div className="font-semibold text-gray-800 mb-3 text-lg">Availability</div>
            <input
              className="w-full border border-gray-200 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm placeholder-gray-400"
              placeholder="Pick days/times or time blocks"
              value={availability}
              onChange={e => setAvailability(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-center w-full mb-10">
          <button
            onClick={handleContinue}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full py-3 rounded-full text-base shadow-md transition mt-6"
            disabled={role === "none" && selectedSubjects.length === 0 && !availability}
          >
            Continue
          </button>
        </div>
      </div>
    </OnboardingPanel>
  );
}; 