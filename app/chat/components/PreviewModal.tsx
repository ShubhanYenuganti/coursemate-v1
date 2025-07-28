
"use client";
import React, { useState } from "react";
import { Portal } from "@/components/Portal";
import dynamic from 'next/dynamic';

// Dynamically import the AnnotatablePDFViewer to avoid SSR issues with PDF.js
const AnnotatablePDFViewer = dynamic(
  () => import('@/components/courses/AnnotatablePDFViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading PDF viewer...</div> }
);

// Dynamically import the QuizViewer
const QuizViewer = dynamic(
  () => import('../../courses/components/QuizViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading quiz...</div> }
);

// Dynamically import the FlashcardViewer
const FlashcardViewer = dynamic(
  () => import('../../courses/components/FlashcardViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading flashcards...</div> }
);

interface PreviewModalProps {
  url: string | null;
  courseId?: string;
  materialId?: string;
  materialType?: string;
  onClose: () => void;
}


const isImage = (url: string) => /\.png|\.jpe?g|\.gif|\.bmp|\.webp/i.test(url);
const isPDF = (url: string) => url.toLowerCase().includes('.pdf');
const isQuiz = (materialType?: string) => materialType === 'quiz';
const isFlashcard = (materialType?: string) => materialType === 'flashcards';

const PreviewModal: React.FC<PreviewModalProps> = ({ url, courseId, materialId, materialType, onClose }) => {
  const [quizData, setQuizData] = useState<any>(null);
  const [showQuizViewer, setShowQuizViewer] = useState(false);
  const [flashcardData, setFlashcardData] = useState<any>(null);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Get backend endpoint URL for PDF preview (backend handles S3 signed URL redirect)
  const getBackendEndpointUrl = (materialId: string) => {
    const token = localStorage.getItem('token');
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
    const endpoint = `${api}/api/materials/${materialId}/view`;
    
    console.log('🔗 [PreviewModal] Using backend endpoint for PDF preview:', {
      materialId,
      endpoint,
      hasToken: !!token
    });
    
    // Add token as query parameter for PDF viewer access (since PDF viewers can't send custom headers)
    return `${endpoint}?token=${encodeURIComponent(token || '')}`;
  };

  // Fetch the actual S3 signed URL from the new JSON endpoint
  const fetchActualSignedUrl = async (materialId: string) => {
    try {
      setIsLoadingUrl(true);
      console.log('🔗 [PreviewModal] Fetching S3 signed URL from JSON endpoint:', {
        materialId,
        endpoint: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173"}/api/materials/${materialId}/signed-url`
      });

      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const endpoint = `${api}/api/materials/${materialId}/signed-url`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔗 [PreviewModal] S3 signed URL JSON response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.status}`);
      }
      
      const data = await response.json();
      const signedUrl = data.signed_url;
      
      console.log('✅ [PreviewModal] Got S3 signed URL from JSON:', {
        signedUrl,
        isS3Url: signedUrl.includes('amazonaws.com')
      });
      
      setSignedUrl(signedUrl);
      return signedUrl;
    } catch (error) {
      console.error('❌ [PreviewModal] Error fetching S3 signed URL:', error);
      setError('Failed to load file preview');
      return null;
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Extract actual courseId from combo_id format (courseId+userId)
  const getActualCourseId = (courseId?: string): string | undefined => {
    if (!courseId) return undefined;
    // If courseId contains '+', extract the part before '+'
    const actualCourseId = courseId.includes('+') ? courseId.split('+')[0] : courseId;
    console.log('🔍 [PreviewModal] Course ID extraction:', {
      originalCourseId: courseId,
      extractedCourseId: actualCourseId,
      hasPlus: courseId.includes('+')
    });
    return actualCourseId;
  };

  // Debug logging for props
  React.useEffect(() => {
    console.log('🚀 [PreviewModal] Component mounted with props:', {
      url,
      courseId,
      materialId,
      materialType,
      actualCourseId: getActualCourseId(courseId),
      isQuiz: isQuiz(materialType),
      isFlashcard: isFlashcard(materialType),
      isPDF: url ? isPDF(url) : false
    });
  }, [url, courseId, materialId, materialType]);

  // Load quiz data from backend endpoint to avoid CORS issues
  const loadQuizData = async (materialId: string, courseId: string) => {
    try {
      console.log('📚 [PreviewModal] Starting quiz data load:', {
        materialId,
        originalCourseId: courseId,
        actualCourseId: getActualCourseId(courseId)
      });

      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const actualCourseId = getActualCourseId(courseId);
      const endpoint = `${api}/api/courses/${actualCourseId}/materials/${materialId}/quiz-data`;
      
      console.log('📚 [PreviewModal] Quiz API call details:', {
        endpoint,
        hasToken: !!token,
        api,
        actualCourseId,
        materialId
      });
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('📚 [PreviewModal] Quiz API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [PreviewModal] Quiz API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          endpoint
        });
        throw new Error(`Failed to load quiz data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ [PreviewModal] Quiz data loaded successfully:', {
        hasQuizData: !!data.quiz_data,
        dataKeys: Object.keys(data),
        quizDataType: typeof data.quiz_data
      });
      setQuizData(data.quiz_data);
      setShowQuizViewer(true);
    } catch (error) {
      console.error('❌ [PreviewModal] Error loading quiz data:', error);
      setError('Failed to load quiz data');
    }
  };

  // Load flashcard data from backend endpoint
  const loadFlashcardData = async (materialId: string, courseId: string) => {
    try {
      console.log('🃏 [PreviewModal] Starting flashcard data load:', {
        materialId,
        originalCourseId: courseId,
        actualCourseId: getActualCourseId(courseId)
      });

      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const actualCourseId = getActualCourseId(courseId);
      const endpoint = `${api}/api/courses/${actualCourseId}/materials/${materialId}/flashcards`;
      
      console.log('🃏 [PreviewModal] Flashcard API call details:', {
        endpoint,
        hasToken: !!token,
        api,
        actualCourseId,
        materialId
      });
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('🃏 [PreviewModal] Flashcard API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [PreviewModal] Flashcard API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          endpoint
        });
        throw new Error(`Failed to load flashcard data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ [PreviewModal] Flashcard data loaded successfully:', {
        hasFlashcardData: !!data.flashcards_data,
        dataKeys: Object.keys(data),
        flashcardDataType: typeof data.flashcards_data
      });
      setFlashcardData(data.flashcards_data);
      setShowFlashcardViewer(true);
    } catch (error) {
      console.error('❌ [PreviewModal] Error loading flashcard data:', error);
      setError('Failed to load flashcard data');
    }
  };

  // Handle opening the appropriate viewer based on material type
  React.useEffect(() => {
    const actualCourseId = getActualCourseId(courseId);
    
    console.log('🎯 [PreviewModal] useEffect trigger for viewer selection:', {
      courseId,
      actualCourseId,
      materialId,
      materialType,
      hasRequiredIds: !!(actualCourseId && materialId),
      isQuiz: isQuiz(materialType),
      isFlashcard: isFlashcard(materialType)
    });

    if (actualCourseId && materialId) {
      if (isQuiz(materialType)) {
        console.log('📚 [PreviewModal] Triggering quiz data load...');
        loadQuizData(materialId, actualCourseId);
      } else if (isFlashcard(materialType)) {
        console.log('🃏 [PreviewModal] Triggering flashcard data load...');
        loadFlashcardData(materialId, actualCourseId);
      } else {
        console.log('📄 [PreviewModal] Material is PDF/other, fetching actual S3 signed URL');
        // For PDF materials, fetch the actual S3 signed URL
        if (materialId) {
          fetchActualSignedUrl(materialId);
        }
      }
    } else {
      console.warn('⚠️ [PreviewModal] Missing required IDs for quiz/flashcard:', {
        actualCourseId,
        materialId,
        materialType
      });
    }
  }, [courseId, materialId, materialType]);

  let previewUrl = url;
  
  // Use signed URL if we fetched one
  if (signedUrl) {
    previewUrl = signedUrl;
    console.log('✅ [PreviewModal] Using fetched signed URL:', previewUrl);
  }
  // If we have a direct S3 URL (signed URL), use it directly
  else if (url && (url.includes('amazonaws.com') || url.startsWith('http'))) {
    previewUrl = url;
    console.log('✅ [PreviewModal] Using direct S3 URL:', previewUrl);
  }
  
  console.log('🔗 [PreviewModal] Final URL processing:', {
    originalUrl: url,
    signedUrl,
    finalPreviewUrl: previewUrl,
    isLoadingUrl,
    isS3Url: previewUrl ? (previewUrl.includes('amazonaws.com') || previewUrl.startsWith('http')) : false,
    isPDFUrl: previewUrl ? isPDF(previewUrl) : false,
    hasMaterialId: !!materialId
  });
  
  // If trying to load quiz/flashcard without courseId/materialId, show error
  if ((isQuiz(materialType) || isFlashcard(materialType)) && !(courseId && materialId)) {
    return (
      <Portal>
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={onClose}>
          <div className="bg-white rounded-lg p-8 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-lg text-red-600 mb-4">Cannot preview {isQuiz(materialType) ? 'quiz' : 'flashcard'}: courseId or materialId missing.</p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" onClick={onClose}>Close</button>
          </div>
        </div>
      </Portal>
    );
  }

  // Show error if there was an issue loading quiz/flashcard data
  if (error) {
    return (
      <Portal>
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={onClose}>
          <div className="bg-white rounded-lg p-8 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-lg text-red-600 mb-4">{error}</p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" onClick={onClose}>Close</button>
          </div>
        </div>
      </Portal>
    );
  }

  // Show loading state while fetching signed URL
  if (isLoadingUrl) {
    return (
      <Portal>
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={onClose}>
          <div className="bg-white rounded-lg p-8 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-lg mb-4">Loading PDF preview...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        </div>
      </Portal>
    );
  }

  if (!previewUrl && !showQuizViewer && !showFlashcardViewer) {
    console.log('🚫 [PreviewModal] No content to show, returning null:', {
      previewUrl,
      showQuizViewer,
      showFlashcardViewer
    });
    return null;
  }

  console.log('🎬 [PreviewModal] Rendering with final state:', {
    previewUrl,
    showQuizViewer,
    showFlashcardViewer,
    hasQuizData: !!quizData,
    hasFlashcardData: !!flashcardData,
    error
  });
  return (
    <>
      {/* Quiz Viewer Modal */}
      {showQuizViewer && quizData && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto overflow-hidden">
              <div className="h-full overflow-y-auto">
                <QuizViewer 
                  quizData={quizData} 
                  onClose={() => {
                    setShowQuizViewer(false);
                    setQuizData(null);
                    onClose();
                  }}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Flashcard Viewer Modal */}
      {showFlashcardViewer && flashcardData && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto overflow-hidden">
              <div className="h-full overflow-y-auto">
                <FlashcardViewer 
                  flashcardData={flashcardData} 
                  onClose={() => {
                    setShowFlashcardViewer(false);
                    setFlashcardData(null);
                    onClose();
                  }}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* PDF/Image Preview Modal */}
      {previewUrl && !showQuizViewer && !showFlashcardViewer && (
        <Portal>
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={onClose}
          >
            <div 
              className="bg-transparent rounded-lg relative overflow-hidden"
              style={{ 
                width: isPDF(previewUrl) ? '98vw' : 'auto',
                height: isPDF(previewUrl) ? '95vh' : 'auto',
                maxWidth: isPDF(previewUrl) ? '1800px' : '95vw',
                maxHeight: '95vh'
              }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white hover:text-gray-200 z-10"
                onClick={onClose}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="flex-1 overflow-auto h-full">
                {isImage(previewUrl) ? (
                  <img src={previewUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain" />
                ) : isPDF(previewUrl) ? (
                  <div className="w-full h-full relative" style={{ minHeight: '900px' }}>
                    {/* Open in New Tab button for PDFs */}
                    <div className="absolute top-4 left-4 z-10">
                      <a 
                        href={previewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-2 bg-blue-500/90 hover:bg-blue-600 text-white text-sm rounded-lg backdrop-blur-sm"
                        title="Open PDF in new tab"
                      >
                        📄 Open in New Tab
                      </a>
                    </div>
                    <AnnotatablePDFViewer url={previewUrl} />
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white/90 backdrop-blur rounded-lg">
                    <p className="text-lg mb-4">Preview not available for this file type.</p>
                    <a 
                      href={previewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Open in new tab
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
};

export default PreviewModal;
