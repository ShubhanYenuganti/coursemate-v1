import React, { useState } from "react";
import { useOnboarding } from "../OnboardingContext";

export const NotificationPreferencesStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [email, setEmail] = useState(data.notificationPrefs?.email ?? true);
  const [sms, setSms] = useState(data.notificationPrefs?.sms ?? false);
  const [push, setPush] = useState(data.notificationPrefs?.push ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setData({ notificationPrefs: { email, sms, push } });
    onNext();
  };

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-10 mt-8 text-gray-900">How would you like to receive notifications?</h1>
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-10">
        <div className="w-full max-w-md flex flex-col gap-6 mb-2">
          <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl border-2 border-gray-200 bg-white shadow-sm hover:border-indigo-200 transition-all text-lg font-medium">
            <input type="checkbox" checked={email} onChange={() => setEmail((v) => !v)} className="form-checkbox h-6 w-6 text-indigo-500 rounded focus:ring-indigo-400 border-gray-300" />
            <span>Email</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl border-2 border-gray-200 bg-white shadow-sm hover:border-sky-200 transition-all text-lg font-medium">
            <input type="checkbox" checked={sms} onChange={() => setSms((v) => !v)} className="form-checkbox h-6 w-6 text-sky-500 rounded focus:ring-sky-400 border-gray-300" />
            <span>SMS</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl border-2 border-gray-200 bg-white shadow-sm hover:border-emerald-200 transition-all text-lg font-medium">
            <input type="checkbox" checked={push} onChange={() => setPush((v) => !v)} className="form-checkbox h-6 w-6 text-emerald-500 rounded focus:ring-emerald-400 border-gray-300" />
            <span>Push Notification</span>
          </label>
        </div>
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