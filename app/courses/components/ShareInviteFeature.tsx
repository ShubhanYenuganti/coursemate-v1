import React, { useState } from "react";
import { Course } from "./CourseCard";

const ROLES = ["Viewer", "Editor", "Creator"] as const;
type Role = typeof ROLES[number];

const ShareInviteFeature: React.FC<{ course: Course }> = ({ course }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Viewer");
  const [inviteLink] = useState<string>(`https://coursemate.app/invite/${course.dbId}`);
  const [invited, setInvited] = useState<{ email: string; role: Role }[]>([]);

  const handleInvite = () => {
    if (email.trim()) {
      setInvited([...invited, { email: email.trim(), role }]);
      setEmail("");
      setRole("Viewer");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  return (
    <div className="my-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">Share / Invite</h3>
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <input
          type="email"
          className="border rounded p-2 flex-1"
          placeholder="Invite by email..."
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <select
          className="border rounded p-2"
          value={role}
          onChange={e => setRole(e.target.value as Role)}
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={handleInvite}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
        >
          Invite
        </button>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          className="border rounded p-2 flex-1 bg-gray-50"
          value={inviteLink}
          readOnly
        />
        <button
          onClick={handleCopyLink}
          className="px-3 py-2 bg-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-300"
        >
          Copy Link
        </button>
      </div>
      {invited.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-600 mb-2">Invited Collaborators</h4>
          <ul className="list-disc pl-6">
            {invited.map((inv, idx) => (
              <li key={idx} className="text-gray-700">
                {inv.email} <span className="text-xs text-gray-500">({inv.role})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ShareInviteFeature; 