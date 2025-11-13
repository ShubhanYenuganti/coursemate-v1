import React, { useState } from "react";
import { courseService, CreateCourseRequest } from "../../../lib/api/courseService";

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

const CreateCourseModal = ({ onClose, onCourseCreated }: { onClose: () => void; onCourseCreated?: () => void }) => {
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
  const [isLoading, setIsLoading] = useState(false);

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
  const handleSave = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      const courseTitle = customCourseName || courseName;
      const courseData: CreateCourseRequest = {
        subject,
        courseName: courseName || undefined,
        customCourseName: customCourseName || undefined,
        title: courseTitle,
        courseCode,
        semester,
        professor: professor || undefined,
        units,
        variableUnits,
        description,
        visibility,
        tags,
        collaborators
      };

      const response = await courseService.createCourse(courseData);
      
      // Success - close modal and refresh courses if callback provided
    onClose();
      if (onCourseCreated) {
        onCourseCreated();
      }
    } catch (error) {
      console.error('Failed to create course:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create course' });
    } finally {
      setIsLoading(false);
    }
  };

  // Modal backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Dynamic course options
  const courseOptions = subject && courseList[subject] ? courseList[subject] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleBackdrop}>
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Create New Course</h2>
        
        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {errors.submit}
          </div>
        )}
        
        <form className="space-y-4">
          {/* Subject Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Subject <span className="text-red-500">*</span></label>
            <input
              type="text"
              list="departments"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Start typing to search..."
              autoComplete="off"
            />
            <datalist id="departments">
              {departmentList.map(dep => <option key={dep} value={dep} />)}
            </datalist>
            {errors.subject && <div className="text-red-500 text-xs mt-1.5">{errors.subject}</div>}
          </div>
          {/* Course Name Dropdown/Custom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Name <span className="text-red-500">*</span></label>
            {courseOptions.length > 0 && !customCourseName ? (
              <select
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${errors.courseName ? 'border-red-500' : 'border-gray-300'}`}
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
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${errors.courseName ? 'border-red-500' : 'border-gray-300'}`}
                value={customCourseName}
                onChange={e => setCustomCourseName(e.target.value)}
                placeholder="Enter course name..."
              />
            )}
            <div className="mt-1.5 flex flex-col gap-1">
              <button type="button" className="text-xs text-blue-500 hover:text-blue-600 self-start" onClick={() => setCustomCourseName("")}>Choose from list</button>
              {errors.courseName && <div className="text-red-500 text-xs">{errors.courseName}</div>}
            </div>
          </div>
          {/* Course Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Description <span className="text-red-500">*</span></label>
            <textarea
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 transition-all ${errors.description ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-400'}`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short summary (280–500 characters)"
              minLength={20}
              maxLength={500}
              rows={3}
            />
            {errors.description && <div className="text-red-500 text-xs mt-1.5">{errors.description}</div>}
          </div>
          {/* Semester Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester <span className="text-red-500">*</span></label>
            <select
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${errors.semester ? 'border-red-500' : 'border-gray-300'}`}
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              {semesterOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.semester && <div className="text-red-500 text-xs mt-1.5">{errors.semester}</div>}
          </div>
          {/* Professor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Professor Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              value={professor}
              onChange={e => setProfessor(e.target.value)}
              placeholder="Search or enter manually..."
            />
          </div>
          {/* Course Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Units</label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min={1}
                max={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all disabled:bg-gray-100"
                value={units}
                onChange={e => setUnits(Number(e.target.value))}
                disabled={variableUnits}
              />
              <label className="flex items-center gap-1.5 text-sm text-gray-700 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={variableUnits}
                  onChange={e => setVariableUnits(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-blue-400"
                />
                Variable Units
              </label>
            </div>
          </div>
          {/* Course Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Code</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              value={courseCode}
              onChange={e => setCourseCode(e.target.value)}
              placeholder="Auto-filled or enter manually..."
            />
          </div>
          {/* Course Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Tags</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Add tag (press Enter or comma to add)..."
              list="tag-suggestions"
            />
            <datalist id="tag-suggestions">
              {tagSuggestions.map((tag: string) => <option key={tag} value={tag} />)}
            </datalist>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {tags.map((tag: string) => (
                  <span key={tag} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border border-blue-200">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-blue-500 hover:text-red-500 text-sm">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Upload Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Materials</label>
            <input
              type="file"
              multiple
              accept=".pdf,.mp4,.ppt,.pptx,.doc,.docx,.txt,.jpg,.png"
              onChange={handleMaterialsUpload}
              className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
            {materials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {materials.map((file: File, idx: number) => (
                  <span key={`${file.name}-${idx}`} className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs border border-gray-200">{file.name}</span>
                ))}
              </div>
            )}
          </div>
          {/* Visibility Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
            <div className="flex gap-3 items-center">
              {['Public', 'Private', 'Only Me', 'Friends Only'].map(opt => {
                const descriptions: { [key: string]: string } = {
                  'Public': 'Anyone can view this course.',
                  'Private': 'Only invited users can view.',
                  'Only Me': 'Visible only to you.',
                  'Friends Only': 'Visible to your friends.'
                };
                return (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer relative text-sm text-gray-700">
                    <input
                      type="radio"
                      name="visibility"
                      value={opt}
                      checked={visibility === opt}
                      onChange={() => setVisibility(opt)}
                      className="text-blue-500 focus:ring-blue-400"
                    />
                    <span>{opt}</span>
                    <span className="text-gray-400 text-xs relative group/tooltip">
                      ?
                      <span className="absolute left-1/2 -translate-x-1/2 top-6 z-10 w-max min-w-[140px] bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-lg">
                        {descriptions[opt]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          {/* Co-author/Collaborators */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Co-author(s) / Collaborators</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              value={collabInput}
              onChange={e => setCollabInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addCollaborator(collabInput);
                }
              }}
              placeholder="Add by email or username (press Enter or comma to add)..."
            />
            {collaborators.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {collaborators.map((collab: string) => (
                  <span key={collab} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border border-blue-200">
                    {collab}
                    <button type="button" onClick={() => removeCollaborator(collab)} className="text-blue-500 hover:text-red-500 text-sm">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Course Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
            {image && <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs mt-1.5 inline-block border border-gray-200">{image.name}</span>}
          </div>
          {/* Save/Cancel Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium disabled:opacity-50 transition-colors" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors" 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isLoading ? 'Creating...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourseModal; 