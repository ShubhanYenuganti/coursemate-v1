import React, { useRef, useState } from "react";
import { useOnboarding } from "../OnboardingContext";

const avatars = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/65.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=facearea&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1519340333755-c6e2a6a2c5a0?auto=format&fit=facearea&w=256&h=256&q=80",
];
const fallbackAvatar = avatars[0];

export const ProfilePictureStep: React.FC<{ onNext: () => void; progress: number }> = ({ onNext, progress }) => {
  const { data, setData } = useOnboarding();
  const [preview, setPreview] = useState<string | undefined>(data.profilePic);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setData({ profilePic: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = (avatar: string) => {
    setPreview(avatar);
    setData({ profilePic: avatar });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-4 mt-2 text-gray-900">Choose a profile picture</h1>
      <p className="mb-10 text-gray-500 text-center max-w-xl">This will be displayed on your profile and visible to other students and faculty.</p>
      <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col items-center gap-12">
        <div className="flex flex-col md:flex-row w-full gap-12 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <img
              src={preview || fallbackAvatar}
              alt="Profile preview"
              className="w-36 h-36 md:w-44 md:h-44 rounded-full object-cover border-4 border-blue-100 shadow bg-white mb-2"
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-6 py-2 rounded-full border border-blue-200 shadow-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview && !avatars.includes(preview) ? "Change Photo" : "Upload a photo"}
            </button>
            <span className="text-xs text-gray-400">JPG, PNG, GIF or WEBP. Max 1MB.</span>
          </div>
          <div className="flex flex-col items-center gap-4 w-full">
            <span className="mb-2 text-gray-500 font-medium">Or choose an avatar</span>
            <div className="flex gap-4 flex-wrap justify-center">
              {avatars.map((avatar, idx) => (
                <button
                  type="button"
                  key={avatar}
                  className={`rounded-full border-4 transition-all duration-150 shadow bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${preview === avatar ? "border-blue-300 ring-2 ring-blue-200" : "border-transparent hover:border-blue-200"}`}
                  onClick={() => handleAvatarClick(avatar)}
                  tabIndex={0}
                  aria-label={`Select avatar ${idx + 1}`}
                >
                  <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-16 h-16 rounded-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-56 max-w-full mx-auto py-3 rounded-full text-base shadow-md transition mt-6"
          disabled={!preview}
        >
          Continue
        </button>
      </form>
    </>
  );
}; 