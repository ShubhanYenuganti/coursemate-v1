'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { X, Camera, User, Mail, School, GraduationCap, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const avatars = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/65.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=facearea&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1519340333755-c6e2a6a2c5a0?auto=format&fit=facearea&w=256&h=256&q=80",
];

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    college: '',
    year: '',
    major: '',
    profilePictureUrl: user?.profilePictureUrl || ''
  });
  const [profilePreview, setProfilePreview] = useState<string>(user?.profilePictureUrl || '');

  // Generate user initials
  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userInitials = getUserInitials(formData.name || user?.name || '');

  // Fetch user details when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchUserDetails();
    }
  }, [isOpen, user]);

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          college: userData.college || '',
          year: userData.year || '',
          major: userData.major || '',
          profilePictureUrl: userData.profile_picture_url || ''
        });
        setProfilePreview(userData.profile_picture_url || '');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
        setFormData(prev => ({ ...prev, profilePictureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = (avatar: string) => {
    setProfilePreview(avatar);
    setFormData(prev => ({ ...prev, profilePictureUrl: avatar }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
        setIsEditing(false);
        // Refresh user context
        window.location.reload(); // Simple refresh for now
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      college: '',
      year: '',
      major: '',
      profilePictureUrl: user?.profilePictureUrl || ''
    });
    setProfilePreview(user?.profilePictureUrl || '');
    fetchUserDetails(); // Reload original data
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {profilePreview ? (
                <img
                  src={profilePreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-indigo-100 shadow-lg">
                  {userInitials}
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 shadow-lg transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {isEditing && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  Upload new photo
                </button>
                
                {/* Avatar Selection */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-sm text-gray-600">Or choose an avatar:</span>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {avatars.map((avatar, idx) => (
                      <button
                        key={avatar}
                        className={`rounded-full border-2 transition-all ${
                          profilePreview === avatar ? "border-indigo-500" : "border-transparent hover:border-indigo-300"
                        }`}
                        onClick={() => handleAvatarClick(avatar)}
                      >
                        <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-12 h-12 rounded-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.name || 'Not provided'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.email}</p>
              </div>

              {/* College */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <School className="w-4 h-4 mr-2" />
                  College
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => setFormData(prev => ({ ...prev, college: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.college || 'Not provided'}</p>
                )}
              </div>

              {/* Year */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  Year
                </label>
                {isEditing ? (
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select year</option>
                    <option value="freshman">Freshman</option>
                    <option value="sophomore">Sophomore</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="graduate">Graduate</option>
                  </select>
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.year || 'Not provided'}</p>
                )}
              </div>

              {/* Major */}
              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Major
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData(prev => ({ ...prev, major: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.major || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
