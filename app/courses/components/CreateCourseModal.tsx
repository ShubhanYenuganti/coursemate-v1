import React, { useState } from "react";

const departmentList = [
  "Computer Science",
  "Biology",
  "Mathematics",
  "History",
  "Art",
  "Music",
  // ...add more as needed
];
const courseList: { [key: string]: { code: string; name: string }[] } = {
  "Computer Science": [
    { code: "CS61A", name: "Structure and Interpretation of Computer Programs" },
    { code: "CS61B", name: "Data Structures" },
  ],
  Biology: [
    { code: "BIO1A", name: "General Biology" },
  ],
  // ...add more as needed
};
const semesterOptions = [
  "Fall 2024",
  "Spring 2024",
  "Summer 2024",
  "Upcoming",
];
const tagSuggestions = ["AI", "GenEd", "Lab-heavy", "Project", "Elective"];

const CreateCourseModal = ({ onClose }: { onClose: () => void }) => {
  const [subject, setSubject] = useState("");
  const [courseName, setCourseName] = useState("");
  const [customCourseName, setCustomCourseName] = useState("");
  const [semester, setSemester] = useState(semesterOptions[0]);
  const [professor, setProfessor] = useState("");
  const [units, setUnits] = useState(3);
  const [variableUnits, setVariableUnits] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("Public");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collabInput, setCollabInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [materials, setMaterials] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Validation
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!subject) newErrors.subject = "Subject is required.";
    if (!courseName && !customCourseName) newErrors.courseName = "Course name is required.";
    if (!semester) newErrors.semester = "Semester is required.";
    if (!description || description.length < 20) newErrors.description = "Description must be at least 20 characters.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers for tags, collaborators, file uploads, etc.
  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput("");
  };
  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));
  const addCollaborator = (collab: string) => {
    if (collab && !collaborators.includes(collab)) setCollaborators([...collaborators, collab]);
    setCollabInput("");
  };
  const removeCollaborator = (collab: string) => setCollaborators(collaborators.filter(c => c !== collab));
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setImage(e.target.files[0]);
  };
  const handleMaterialsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setMaterials([...materials, ...Array.from(e.target.files)]);
  };

  // Save handler
  const handleSave = () => {
    if (!validate()) return;
    // TODO: Save logic
    onClose();
  };

  // Modal backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Dynamic course options
  const courseOptions = subject && courseList[subject] ? courseList[subject] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleBackdrop}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={onClose} aria-label="Close">&times;</button>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">Create New Course</h2>
        <form className="space-y-3 sm:space-y-4">
          {/* Subject Dropdown */}
          <div>
            <label className="block font-semibold mb-1">Course Subject <span className="text-red-500">*</span></label>
            <input
              type="text"
              list="departments"
              className={`w-full border rounded-lg px-3 py-1.5 ${errors.subject ? 'border-red-500' : 'border-gray-200'}`}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Start typing to search..."
              autoComplete="off"
            />
            <datalist id="departments">
              {departmentList.map(dep => <option key={dep} value={dep} />)}
            </datalist>
            {errors.subject && <div className="text-red-500 text-xs mt-1">{errors.subject}</div>}
          </div>
          {/* Course Name Dropdown/Custom */}
          <div>
            <label className="block font-semibold mb-1">Course Name <span className="text-red-500">*</span></label>
            {courseOptions.length > 0 && !customCourseName ? (
              <select
                className={`w-full border rounded-lg px-3 py-1.5 ${errors.courseName ? 'border-red-500' : 'border-gray-200'}`}
                value={courseName}
                onChange={e => {
                  setCourseName(e.target.value);
                  setCourseCode(courseOptions.find(c => c.name === e.target.value)?.code || "");
                }}
              >
                <option value="">Select a course...</option>
                {courseOptions.map((opt: { code: string; name: string }) => (
                  <option key={opt.code} value={opt.name}>{opt.code}: {opt.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className={`w-full border rounded-lg px-3 py-1.5 ${errors.courseName ? 'border-red-500' : 'border-gray-200'}`}
                value={customCourseName}
                onChange={e => setCustomCourseName(e.target.value)}
                placeholder="Enter course name..."
              />
            )}
            <button type="button" className="text-xs text-blue-600 mt-1" onClick={() => setCustomCourseName("")}>Choose from list</button>
            {errors.courseName && <div className="text-red-500 text-xs mt-1">{errors.courseName}</div>}
          </div>
          {/* Semester Dropdown */}
          <div>
            <label className="block font-semibold mb-1">Semester <span className="text-red-500">*</span></label>
            <select
              className={`w-full border rounded-lg px-3 py-1.5 ${errors.semester ? 'border-red-500' : 'border-gray-200'}`}
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              {semesterOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.semester && <div className="text-red-500 text-xs mt-1">{errors.semester}</div>}
          </div>
          {/* Professor Name */}
          <div>
            <label className="block font-semibold mb-1">Professor Name</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5"
              value={professor}
              onChange={e => setProfessor(e.target.value)}
              placeholder="Search or enter manually..."
            />
          </div>
          {/* Course Units */}
          <div className="flex gap-2 items-center">
            <label className="block font-semibold mb-1">Course Units</label>
            <input
              type="number"
              min={1}
              max={5}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5"
              value={units}
              onChange={e => setUnits(Number(e.target.value))}
              disabled={variableUnits}
            />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={variableUnits} onChange={e => setVariableUnits(e.target.checked)} />
              Variable Units
            </label>
          </div>
          {/* Course Code */}
          <div>
            <label className="block font-semibold mb-1">Course Code</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5"
              value={courseCode}
              onChange={e => setCourseCode(e.target.value)}
              placeholder="Auto-filled or enter manually..."
            />
          </div>
          {/* Course Tags */}
          <div>
            <label className="block font-semibold mb-1">Course Tags</label>
            <div className="flex flex-wrap gap-2 mb-1">
              {tags.map((tag: string) => (
                <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-blue-500 hover:text-red-500">&times;</button>
                </span>
              ))}
              <input
                type="text"
                className="border border-gray-200 rounded px-2 py-1 text-xs"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag(tagInput))}
                placeholder="Add tag..."
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {tagSuggestions.map((tag: string) => <option key={tag} value={tag} />)}
              </datalist>
            </div>
          </div>
          {/* Upload Materials */}
          <div>
            <label className="block font-semibold mb-1">Upload Materials</label>
            <input
              type="file"
              multiple
              accept=".pdf,.mp4,.ppt,.pptx,.doc,.docx,.txt,.jpg,.png"
              onChange={handleMaterialsUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div className="flex flex-wrap gap-2 mt-1">
              {materials.map((file: File, idx: number) => (
                <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">{file.name}</span>
              ))}
            </div>
          </div>
          {/* Course Description */}
          <div>
            <label className="block font-semibold mb-1">Course Description <span className="text-red-500">*</span></label>
            <textarea
              className={`w-full border rounded-lg px-3 py-1.5 ${errors.description ? 'border-red-500' : 'border-gray-200'}`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short summary (280–500 characters)"
              minLength={20}
              maxLength={500}
              rows={3}
            />
            {errors.description && <div className="text-red-500 text-xs mt-1">{errors.description}</div>}
          </div>
          {/* Visibility Toggle */}
          <div>
            <label className="block font-semibold mb-1">Visibility</label>
            <div className="flex gap-3 items-center">
              {['Public', 'Private', 'Only Me', 'Friends Only'].map(opt => (
                <label key={opt} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={opt}
                    checked={visibility === opt}
                    onChange={() => setVisibility(opt)}
                  />
                  <span>{opt}</span>
                  <span className="text-gray-400 text-xs" title={
                    opt === 'Public' ? 'Anyone can view this course.' :
                    opt === 'Private' ? 'Only invited users can view.' :
                    opt === 'Only Me' ? 'Visible only to you.' :
                    'Visible to your friends.'
                  }>?</span>
                </label>
              ))}
            </div>
          </div>
          {/* Co-author/Collaborators */}
          <div>
            <label className="block font-semibold mb-1">Co-author(s) / Collaborators</label>
            <div className="flex flex-wrap gap-2 mb-1">
              {collaborators.map((collab: string) => (
                <span key={collab} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  {collab}
                  <button type="button" onClick={() => removeCollaborator(collab)} className="ml-1 text-purple-500 hover:text-red-500">&times;</button>
                </span>
              ))}
              <input
                type="text"
                className="border border-gray-200 rounded px-2 py-1 text-xs"
                value={collabInput}
                onChange={e => setCollabInput(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addCollaborator(collabInput))}
                placeholder="Add by email or username..."
              />
            </div>
          </div>
          {/* Course Image */}
          <div>
            <label className="block font-semibold mb-1">Course Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {image && <span className="bg-gray-100 px-2 py-1 rounded text-xs mt-1 inline-block">{image.name}</span>}
          </div>
          {/* Save/Cancel Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium" onClick={onClose}>Cancel</button>
            <button type="button" className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 shadow-lg" onClick={handleSave}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourseModal; 