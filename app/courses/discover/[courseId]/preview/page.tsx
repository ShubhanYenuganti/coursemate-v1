"use client"

import React, { useState, useEffect } from "react"
import { ArrowLeft, FileText, MessageSquare, Star, Play, Image } from "lucide-react"
import Link from "next/link"
import { courseService } from "@/lib/api/courseService"
import { useRouter, useParams } from 'next/navigation'
import LeaveReview from "@/app/courses/discover/components/LeaveReview"


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
// const mockReviews = [
//   {
//     id: 1,
//     author: "Sarah Johnson",
//     rating: 5,
//     date: "2024-03-15",
//     content: "This course exceeded my expectations! The content is well-structured and the instructor explains complex concepts in a way that's easy to understand.",
//   },
//   {
//     id: 2,
//     author: "Michael Chen",
//     rating: 4,
//     date: "2024-03-10",
//     content: "Great course with practical examples. The only improvement I'd suggest is adding more hands-on exercises.",
//   },
//   {
//     id: 3,
//     author: "Emma Rodriguez",
//     rating: 5,
//     date: "2024-03-05",
//     content: "The best course I've taken on this subject. The resources provided are comprehensive and the community is very supportive.",
//   },
// ]

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
  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnedByUser, setIsOwnedByUser] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("description");
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [editingReviewId, setEditingReviewId] = useState<any | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [reviewToDelete, setReviewToDelete] = useState<any | null>(null);

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

        // Fetch course reviews after course is loaded
        const reviewData = await courseService.getCourseReviews(courseId);
        setReviews(reviewData);
        console.log('Reviews data:', reviewData); // Debug log
      } catch (err) {
        setError('Course not found or failed to load.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    const fetchUserId = async () => {
      try {
        const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
        const response = await fetch(`${api}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        setUserId(data.id);
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };

    if (courseId) {
      fetchCourse();
    }

    if (userId === null) {
      fetchUserId();
    }

  }, [courseId, userId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRating || reviewRating < 0.5 || reviewRating > 5) {
      alert("Please provide a rating between 0.5 and 5.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await courseService.postCourseReview({
        course_id: courseId,
        rating: reviewRating,
        review_text: reviewText || "",  // default to empty string
      });

      console.log('Review response:', response); // Debug log

      const updatedReviews = await courseService.getCourseReviews(courseId);
      setReviews(updatedReviews);
      setReviewText("");
      setReviewRating(0.5);
    } catch (error: any) {
      alert(error.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRating || reviewRating < 0.5 || reviewRating > 5) {
      alert("Please provide a rating between 0.5 and 5.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await courseService.updateCourseReview({
        course_id: courseId,
        rating: reviewRating,
        review_text: reviewText || "",  // default to empty string
      });

      console.log('Update review response:', response); // Debug log

      const updatedReviews = await courseService.getCourseReviews(courseId);
      setReviews(updatedReviews);
      setReviewText("");
      setReviewRating(0.5);
      setEditingReviewId(null);
    } catch (error: any) {
      alert(error.message || "Failed to update review.");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;

    try {
      await courseService.deleteCourseReview(reviewToDelete);
      const updatedReviews = await courseService.getCourseReviews(courseId);
      setReviews(updatedReviews);
      setReviewToDelete(null);
      setShowDeleteConfirmation(false);
    } catch (error: any) {
      alert(error.message || "Failed to delete review.");
    }
  }

  const hasUserReviewed = userId && reviews.some(review => review.user_id === userId);

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
        className={`h-4 w-4 ${index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
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
                            className={`h-4 w-4 ${index < Math.round((resource.credibility_score + resource.relevance_score) / 2 * 5)
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
            {reviews.map((review) => (
              <div key={review.combo_id} className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">{review.user_name}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      }).format(new Date(review.updated_at))}
                    </span>

                    {/* ✅ Only show for the user's own review */}
                    {userId === review.user_id && (
                      <>
                        <button
                          className="ml-2 hover:text-purple-600"
                          onClick={() => { 
                            setShowReviewForm(true);
                            setReviewRating(review.rating);
                            setReviewText(review.review_text);
                            setEditingReviewId(review.combo_id);
                          }}
                          title="Edit Review"
                        >
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M15.232 5.232l3.536 3.536M4 13.5V19h5.5L19.5 9.5a2.121 2.121 0 0 0-3-3L4 13.5z" />
                        </svg>
                        </button>
                        <button
                          className="hover:text-red-600"
                          onClick={() => {
                            setShowDeleteConfirmation(true);
                            setReviewToDelete(review.course_id)
                          }}
                          title="Delete Review"
                        >
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v0a1 1 0 0 1 1-1h10z" />
                        </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center mb-3">
                  {renderStars(review.rating)}
                  <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                </div>

                <p className="text-gray-700">{review.review_text}</p>
              </div>
            ))}

            {!isOwnedByUser && (!hasUserReviewed || editingReviewId) && (
              <LeaveReview
                rating={reviewRating}
                setRating={setReviewRating}
                text={reviewText}
                setText={setReviewText}
                isSubmitting={isSubmittingReview}
                onSubmit={editingReviewId ? handleUpdateReview : handleSubmitReview}
                showForm={showReviewForm}
                setShowForm={setShowReviewForm}
              />
            )}

            {showDeleteConfirmation && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                <div className="bg-white p-6 rounded shadow-md text-center w-96">
                  <h3 className="text-lg font-semibold mb-4">Are you sure?</h3>
                  <p className="text-gray-700 mb-6">Do you really want to delete this review? This action cannot be undone.</p>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => setShowDeleteConfirmation(false)}
                      className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteReview}
                      className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
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