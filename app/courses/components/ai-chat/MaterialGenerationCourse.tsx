"use client";

import React, { useState } from 'react';
import { BookOpen, Brain, FileText, Download, Loader2, Sparkles, ChevronLeft, ChevronRight, RotateCcw, Grid, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Quiz {
  questions: QuizQuestion[];
  type: string;
  topic: string;
  generated_from: number;
}

interface QuizQuestion {
  question: string;
  options?: string[];
  correct_answer: string | boolean;
  explanation: string;
  sample_answer?: string;
  key_points?: string[];
}

interface Flashcard {
  front: string;
  back: string;
  category: string;
}

interface Summary {
  summary: string;
  key_points: string[];
  main_topics: string[];
  topic: string;
  generated_from: number;
}

interface MaterialGenerationCourseProps {
  courseId: string;
}

export default function MaterialGenerationCourse({ courseId }: MaterialGenerationCourseProps) {
  const [activeTab, setActiveTab] = useState('quiz');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  // Quiz interaction state
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{[key: number]: boolean}>({});
  const [showResults, setShowResults] = useState<{[key: number]: boolean}>({});

  // Flashcard interaction state
  const [flippedCards, setFlippedCards] = useState<{[key: number]: boolean}>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [studyMode, setStudyMode] = useState<'grid' | 'study'>('grid');

  // Quiz generation
  const [quizTopic, setQuizTopic] = useState('');
  const [quizCount, setQuizCount] = useState(5);
  const [quizType, setQuizType] = useState('multiple_choice');

  // Flashcard generation
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [flashcardCount, setFlashcardCount] = useState(10);

  // Summary generation
  const [summaryTopic, setSummaryTopic] = useState('');

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/materials/generate/quiz', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: quizTopic || undefined,
          num_questions: quizCount,
          type: quizType,
          course_id: courseId
        })
      });

      if (!response.ok) throw new Error('Failed to generate quiz');
      
      const data = await response.json();
      setQuiz(data);
      
      // Reset quiz interaction state
      setUserAnswers({});
      setSubmittedAnswers({});
      setShowResults({});
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/materials/generate/flashcards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: flashcardTopic || undefined,
          num_cards: flashcardCount,
          course_id: courseId
        })
      });

      if (!response.ok) throw new Error('Failed to generate flashcards');
      
      const data = await response.json();
      setFlashcards(data.flashcards || []);
      
      // Reset flashcard interaction state
      setFlippedCards({});
      setCurrentCardIndex(0);
      setStudyMode('grid');
    } catch (error) {
      console.error('Error generating flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/materials/generate/summary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: summaryTopic || undefined,
          course_id: courseId
        })
      });

      if (!response.ok) throw new Error('Failed to generate summary');
      
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitAnswer = (questionIndex: number) => {
    setSubmittedAnswers(prev => ({
      ...prev,
      [questionIndex]: true
    }));
    setShowResults(prev => ({
      ...prev,
      [questionIndex]: true
    }));
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setSubmittedAnswers({});
    setShowResults({});
  };

  const flipCard = (cardIndex: number) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardIndex]: !prev[cardIndex]
    }));
  };

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const resetFlashcards = () => {
    setFlippedCards({});
    setCurrentCardIndex(0);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">AI Study Material Generator</h2>
        </div>
        <p className="text-sm text-gray-600">Generate quizzes, flashcards, and summaries from your course materials</p>
      </div>

      <div className="flex-1 p-4 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="flex-1 mt-4 min-h-0 overflow-y-auto">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Generate Quiz
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quiz-topic">Topic (optional)</Label>
                      <Input
                        id="quiz-topic"
                        value={quizTopic}
                        onChange={(e) => setQuizTopic(e.target.value)}
                        placeholder="e.g., Linear Algebra"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiz-count">Number of Questions</Label>
                      <Select value={quizCount.toString()} onValueChange={(value) => setQuizCount(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quiz-type">Quiz Type</Label>
                      <Select value={quizType} onValueChange={setQuizType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={generateQuiz} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generate Quiz
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {quiz && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Quiz: {quiz.topic}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={resetQuiz}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {quiz.questions.map((question, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <Badge variant="outline" className="mt-1">
                              {index + 1}
                            </Badge>
                            <p className="font-medium flex-1">{question.question}</p>
                          </div>

                          {question.options && (
                            <div className="space-y-2 ml-8">
                              {question.options.map((option, optionIndex) => (
                                <label key={optionIndex} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question-${index}`}
                                    value={option}
                                    checked={userAnswers[index] === option}
                                    onChange={() => handleAnswerSelect(index, option)}
                                    disabled={submittedAnswers[index]}
                                    className="text-blue-600"
                                  />
                                  <span className={submittedAnswers[index] && option === question.correct_answer ? 'text-green-600 font-medium' : ''}>{option}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          <div className="ml-8 mt-3 space-y-2">
                            {!submittedAnswers[index] && userAnswers[index] && (
                              <Button size="sm" onClick={() => handleSubmitAnswer(index)}>
                                Submit Answer
                              </Button>
                            )}

                            {showResults[index] && (
                              <div className="bg-gray-50 p-3 rounded">
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                  Correct Answer: <span className="text-green-600">{question.correct_answer}</span>
                                </p>
                                {question.explanation && (
                                  <p className="text-sm text-gray-600">{question.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards" className="flex-1 mt-4 min-h-0 overflow-y-auto">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Generate Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="flashcard-topic">Topic (optional)</Label>
                      <Input
                        id="flashcard-topic"
                        value={flashcardTopic}
                        onChange={(e) => setFlashcardTopic(e.target.value)}
                        placeholder="e.g., Calculus concepts"
                      />
                    </div>
                    <div>
                      <Label htmlFor="flashcard-count">Number of Cards</Label>
                      <Select value={flashcardCount.toString()} onValueChange={(value) => setFlashcardCount(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={generateFlashcards} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Flashcards...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {flashcards.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Flashcards ({flashcards.length} cards)</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setStudyMode(studyMode === 'grid' ? 'study' : 'grid')}
                      >
                        {studyMode === 'grid' ? <Play className="w-4 h-4 mr-2" /> : <Grid className="w-4 h-4 mr-2" />}
                        {studyMode === 'grid' ? 'Study Mode' : 'Grid View'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetFlashcards}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {studyMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {flashcards.map((card, index) => (
                          <div 
                            key={index} 
                            className="relative h-32 cursor-pointer"
                            onClick={() => flipCard(index)}
                          >
                            <div className={`absolute inset-0 rounded-lg border transition-all duration-300 transform ${flippedCards[index] ? 'rotate-y-180' : ''}`}>
                              <div className={`absolute inset-0 p-4 rounded-lg bg-blue-50 border-blue-200 ${flippedCards[index] ? 'opacity-0' : 'opacity-100'} transition-opacity duration-150`}>
                                <p className="text-sm font-medium text-center">{card.front}</p>
                              </div>
                              <div className={`absolute inset-0 p-4 rounded-lg bg-green-50 border-green-200 ${flippedCards[index] ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
                                <p className="text-sm text-center">{card.back}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Card {currentCardIndex + 1} of {flashcards.length}
                          </span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={prevCard} disabled={currentCardIndex === 0}>
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={nextCard} disabled={currentCardIndex === flashcards.length - 1}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div 
                          className="h-48 cursor-pointer"
                          onClick={() => flipCard(currentCardIndex)}
                        >
                          <div className={`relative h-full rounded-lg border transition-all duration-300 transform ${flippedCards[currentCardIndex] ? 'rotate-y-180' : ''}`}>
                            <div className={`absolute inset-0 p-6 rounded-lg bg-blue-50 border-blue-200 flex items-center justify-center ${flippedCards[currentCardIndex] ? 'opacity-0' : 'opacity-100'} transition-opacity duration-150`}>
                              <p className="text-center font-medium">{flashcards[currentCardIndex]?.front}</p>
                            </div>
                            <div className={`absolute inset-0 p-6 rounded-lg bg-green-50 border-green-200 flex items-center justify-center ${flippedCards[currentCardIndex] ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
                              <p className="text-center">{flashcards[currentCardIndex]?.back}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="flex-1 mt-4 min-h-0 overflow-y-auto">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Generate Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="summary-topic">Topic (optional)</Label>
                    <Input
                      id="summary-topic"
                      value={summaryTopic}
                      onChange={(e) => setSummaryTopic(e.target.value)}
                      placeholder="e.g., Chapter 5: Probability"
                    />
                  </div>
                  <Button 
                    onClick={generateSummary} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Summary...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Summary: {summary.topic}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Summary</h4>
                      <p className="text-gray-700 leading-relaxed">{summary.summary}</p>
                    </div>
                    
                    {summary.key_points && summary.key_points.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Key Points</h4>
                        <ul className="space-y-1">
                          {summary.key_points.map((point, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {summary.main_topics && summary.main_topics.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Main Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.main_topics.map((topic, index) => (
                            <Badge key={index} variant="secondary">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
