import React, { useState, useRef } from "react";
import { Course } from "./CourseCard";
import { courseService, CourseData } from "../../../lib/api/courseService";
import { UploadCloud, Trash2, Edit } from "lucide-react";
import ImageCropModal from "./ImageCropModal";

const defaultBanner =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";

const editableFields = ["title", "subject", "semester", "tags", "description"] as const;
type EditableField = typeof editableFields[number];

const CourseDetailHeader = ({ course, onCourseUpdate }: { course: Course; onCourseUpdate: (course: CourseData) => void }) => {
  const [editing, setEditing] = useState(false);
  const [fieldValues, setFieldValues] = useState({
    title: course.title,
    subject: course.subject,
    semester: course.semester,
    tags: course.tags ? [...course.tags] : [],
    description: course.description,
  });
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const saveAll = async () => {
    try {
      setSaving(true);
      const update: Partial<CourseData> = { ...fieldValues, id: course.dbId };
      const response = await courseService.updateCourse(course.dbId, update);
      setEditing(false);
      onCourseUpdate(response.course);
    } catch(e){
      console.error('Failed to update course', e);
    } finally { setSaving(false); }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create a temporary URL for the crop modal
    const tempUrl = URL.createObjectURL(file);
    setTempImageUrl(tempUrl);
    setCropModalOpen(true);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropConfirm = async (croppedImageUrl: string) => {
    try {
      setUploading(true);
      
      // Convert the blob URL back to a File object
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'banner.jpg', { type: 'image/jpeg' });
      
      // Upload the cropped image
      const uploadResponse = await courseService.uploadBanner(course.dbId, file);
      onCourseUpdate(uploadResponse.course);
      
      // Clean up the temporary URLs
      URL.revokeObjectURL(tempImageUrl);
      URL.revokeObjectURL(croppedImageUrl);
      
    } catch (error) {
      console.error("Failed to upload cropped banner:", error);
    } finally {
      setUploading(false);
      setCropModalOpen(false);
      setTempImageUrl("");
    }
  };

  const handleClearBanner = async () => {
    try {
      setUploading(true);
      const response = await courseService.deleteBanner(course.dbId);
      onCourseUpdate(response.course);
    } catch (error) {
      console.error("Failed to delete banner:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleBannerClick = () => {
    if (course.badge === 'Creator') {
      fileInputRef.current?.click();
    }
  };

  const handleFieldChange = (field: EditableField, value: any) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !fieldValues.tags.includes(newTag.trim())) {
      setFieldValues(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFieldValues(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleCancel = () => {
    setFieldValues({
      title: course.title,
      subject: course.subject,
      semester: course.semester,
      tags: course.tags ? [...course.tags] : [],
      description: course.description,
    });
    setEditing(false);
  };

  return (
    <div className="relative">
      {/* Top right edit button toggles all editing */}
      {course.badge === 'Creator' && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="absolute top-0 right-0 p-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-lg hover:bg-white/60 transition-all duration-200 hover:scale-105"
          title="Edit Course"
        >
          <Edit className="w-5 h-5 text-blue-600" />
        </button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          {/* Title */}
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                className="text-3xl font-bold text-gray-900 mb-2 border rounded px-2 py-1"
                value={fieldValues.title}
                onChange={e => handleFieldChange("title", e.target.value)}
                autoFocus
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{fieldValues.title}</h1>
            )}
          </div>
          {/* Subject, Semester, Badge, ID */}
          <div className="text-base text-gray-600 mb-3 flex flex-wrap gap-2 items-center">
            {/* Subject */}
            {editing ? (
              <input
                className="border rounded px-2 py-1"
                value={fieldValues.subject}
                onChange={e => handleFieldChange("subject", e.target.value)}
              />
            ) : (
              <span>{fieldValues.subject}</span>
            )}
            <span>·</span>
            {/* Semester */}
            {editing ? (
              <input
                className="border rounded px-2 py-1"
                value={fieldValues.semester}
                onChange={e => handleFieldChange("semester", e.target.value)}
              />
            ) : (
              <span>{fieldValues.semester}</span>
            )}
            <span>· {course.badge} · {course.id}</span>
          </div>
        </div>
      </div>
      {/* Tags */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {editing ? (
          <>
            {fieldValues.tags.map((tag, idx) => (
              <span key={idx} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-medium text-base flex items-center gap-2">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-red-500">×</button>
              </span>
            ))}
            <input
              className="border rounded px-2 py-1"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              placeholder="Add tag"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
            />
            <button onClick={handleAddTag} className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Add</button>
          </>
        ) : (
          <>
            {fieldValues.tags.map((tag, idx) => (
              <span key={idx} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-medium text-base">{tag}</span>
            ))}
          </>
        )}
      </div>
      <div className="mb-8 relative group">
        <img
          src={course.course_image || defaultBanner}
          alt="Course banner"
          className="w-full h-48 object-cover rounded-xl bg-gray-100"
        />
        {course.badge === 'Creator' && (
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <button
              onClick={handleBannerClick}
              disabled={uploading}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-lg shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-50"
              title="Upload Banner Image"
            >
              <UploadCloud className="w-5 h-5 text-gray-700" />
            </button>
            {course.course_image && (
              <button
                onClick={handleClearBanner}
                disabled={uploading}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-lg shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-50"
                title="Clear Banner Image"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
            />
          </div>
        )}
      </div>
      {/* Description */}
      <div>
        {editing ? (
          <textarea value={fieldValues.description} onChange={e=>handleFieldChange("description", e.target.value)} className="w-full border rounded-lg p-2" rows={4}/>
        ): (
          <p className="text-base text-gray-700 whitespace-pre-line">{fieldValues.description}</p>
        )}
      </div>
      {/* Save/Cancel controls at the bottom */}
      {editing && (
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-100 rounded-lg text-gray-700 font-semibold shadow-sm hover:bg-gray-200"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={saveAll}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          if (tempImageUrl) {
            URL.revokeObjectURL(tempImageUrl);
            setTempImageUrl("");
          }
        }}
        imageUrl={tempImageUrl}
        onCrop={handleCropConfirm}
        aspectRatio={16 / 9}
      />
    </div>
  );
};

export default CourseDetailHeader; 