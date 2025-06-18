"use client"

import React, { useState, useEffect } from "react"
import { ArrowLeft, FileText, MessageSquare, Star, Play, Image } from "lucide-react"
import Link from "next/link"
import { courseService } from "@/lib/api/courseService"
import { useRouter, useParams } from 'next/navigation'

interface Tab {
  id: string
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: "description", label: "Description", icon: null },
  { id: "resources", label: "Resources", icon: <FileText className="h-4 w-4" /> },
  { id: "discussions", label: "Discussions", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
]

// Mock reviews data
const mockReviews = [
  {
    id: 1,
    author: "Sarah Johnson",
    rating: 5,
    date: "2024-03-15",
    content: "This course exceeded my expectations! The content is well-structured and the instructor explains complex concepts in a way that's easy to understand.",
  },
  {
    id: 2,
    author: "Michael Chen",
    rating: 4,
    date: "2024-03-10",
    content: "Great course with practical examples. The only improvement I'd suggest is adding more hands-on exercises.",
  },
  {
    id: 3,
    author: "Emma Rodriguez",
    rating: 5,
    date: "2024-03-05",
    content: "The best course I've taken on this subject. The resources provided are comprehensive and the community is very supportive.",
  },
]

// Add mock resources data at the top after mockReviews
const mockResources = [
  {
    id: 1,
    title: "Khan Academy - Linear Algebra",
    url: "https://www.khanacademy.org/math/linear-algebra",
    type: "video",
    description: "Comprehensive video tutorials covering vectors, matrices, and linear transformations",
    credibility_score: 0.95,
    relevance_score: 0.88,
    addedAt: "2024-03-10"
  },
  {
    id: 2,
    title: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/courses/mathematics",
    type: "website",
    description: "Free course materials from MIT's mathematics department",
    credibility_score: 0.98,
    relevance_score: 0.85,
    addedAt: "2024-03-08"
  },
  {
    id: 3,
    title: "Linear Algebra and Its Applications",
    url: "https://www.pearson.com/store/p/linear-algebra-and-its-applications/P100000843799",
    type: "book",
    description: "Comprehensive textbook by David C. Lay, Steven R. Lay, and Judi J. McDonald",
    credibility_score: 0.92,
    relevance_score: 0.90,
    addedAt: "2024-03-05"
  }
];

const CoursePreviewPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnedByUser, setIsOwnedByUser] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("description");

  useEffect(() => {
    const fetchCourse = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await courseService.getPublicCourse(courseId);
        console.log('Course data:', data); // Debug log
        console.log('Is owned by user:', data.is_owned_by_user); // Debug log
        setCourse(data);
        setIsOwnedByUser(data.is_owned_by_user || false);
      } catch (err) {
        setError('Course not found or failed to load.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 text-center text-lg mb-4">{error || 'Course not found.'}</p>
        <Link href="/courses/discover" className="text-purple-600 hover:text-purple-800 font-medium">
          ← Back to Discover
        </Link>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "description":
        return (
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">{course.description}</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Course Details</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><strong>Subject:</strong> {course.subject}</li>
                  <li><strong>Semester:</strong> {course.semester}</li>
                  {course.professor && <li><strong>Instructor:</strong> {course.professor}</li>}
                  {course.units && <li><strong>Units:</strong> {course.units}</li>}
                </ul>
              </div>
              {course.tags && course.tags.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag: string, index: number) => (
                      <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case "resources":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Course Resources</h3>
                <p className="text-gray-600">External resources and materials for this course</p>
              </div>
            </div>
            
            {mockResources.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No external resources</h3>
                <p className="text-gray-500">This course doesn't have any external resources yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockResources.map((resource) => (
                  <div key={resource.id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
                    {/* Icon and Type */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        {resource.type === 'video' && <Play className="h-6 w-6 text-purple-600" />}
                        {resource.type === 'website' && <FileText className="h-6 w-6 text-purple-600" />}
                        {resource.type === 'book' && <FileText className="h-6 w-6 text-purple-600" />}
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                        {resource.type}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {resource.title}
                    </h4>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < Math.round((resource.credibility_score + resource.relevance_score) / 2 * 5)
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {((resource.credibility_score + resource.relevance_score) / 2 * 5).toFixed(1)}/5
                      </span>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {resource.description}
                    </p>
                    
                    {/* Progress Indicators */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-green-700 font-medium">Credibility</span>
                        <span className="text-green-700">{Math.round(resource.credibility_score * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full" 
                          style={{ width: `${resource.credibility_score * 100}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-700 font-medium">Relevance</span>
                        <span className="text-blue-700">{Math.round(resource.relevance_score * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${resource.relevance_score * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Visit Resource
                    </a>
                    
                    {/* Added Date */}
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Added {resource.addedAt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "discussions":
        return (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No discussions available for this course yet.</p>
          </div>
        );
      case "reviews":
        return (
          <div className="space-y-6">
            {mockReviews.map((review) => (
              <div key={review.id} className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">{review.author}</h4>
                  <span className="text-sm text-gray-500">{review.date}</span>
                </div>
                <div className="flex items-center mb-3">
                  {renderStars(review.rating)}
                  <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                </div>
                <p className="text-gray-700">{review.content}</p>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-6 py-5">
          <Link
            href="/courses/discover"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discover
          </Link>
        </div>
      </div>

      {/* Course Header */}
      <div className="bg-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{course.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-lg text-gray-600 mb-4">
                <span>{course.subject}</span>
                <span>•</span>
                <span>{course.semester}</span>
                {course.professor && (
                  <>
                    <span>•</span>
                    <span>Instructor: {course.professor}</span>
                  </>
                )}
              </div>
            </div>
            {isOwnedByUser && (
              <div className="mt-4 lg:mt-0">
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Go to Course
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CoursePreviewPage;