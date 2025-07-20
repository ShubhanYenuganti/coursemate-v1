"use client"

import React, { useState } from 'react';
import { BookOpen, Brain, FileText, Download, Loader2, Sparkles, ChevronLeft, ChevronRight, RotateCcw, Grid, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';

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

export default function MaterialGenerationInterface() {
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
      const response = await fetch('/api/materials/generate/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: quizTopic || undefined,
          num_questions: quizCount,
          type: quizType
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

  const generateFlashcards = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/materials/generate/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: flashcardTopic || undefined,
          num_cards: flashcardCount
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
      const response = await fetch('/api/materials/generate/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: summaryTopic || undefined
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

  const exportContent = (content: any, filename: string) => {
    if (filename.includes('quiz')) {
      exportQuizAsPDF(content, filename.replace('.json', '.pdf'));
    } else if (filename.includes('flashcards')) {
      exportFlashcardsAsPDF(content, filename.replace('.json', '.pdf'));
    } else if (filename.includes('summary')) {
      exportSummaryAsPDF(content, filename.replace('.json', '.pdf'));
    }
  };

  const exportQuizAsPDF = (quiz: Quiz, filename: string) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(`Quiz: ${quiz.topic}`, 20, 30);
    
    // Quiz info
    doc.setFontSize(12);
    doc.text(`Type: ${quiz.type.replace('_', ' ')}`, 20, 45);
    doc.text(`Number of Questions: ${quiz.questions.length}`, 20, 55);
    
    let yPosition = 75;
    
    quiz.questions.forEach((question, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Question number and text
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${question.question}`, 20, yPosition);
      yPosition += 15;
      
      // Options for multiple choice
      if (question.options) {
        doc.setFontSize(10);
        question.options.forEach((option) => {
          doc.text(option, 25, yPosition);
          yPosition += 8;
        });
        yPosition += 5;
      }
      
      // Answer
      doc.setFontSize(11);
      doc.text(`Answer: ${question.correct_answer}`, 25, yPosition);
      yPosition += 10;
      
      // Explanation
      if (question.explanation) {
        doc.setFontSize(9);
        const explanationLines = doc.splitTextToSize(`Explanation: ${question.explanation}`, 160);
        doc.text(explanationLines, 25, yPosition);
        yPosition += explanationLines.length * 5 + 10;
      }
      
      yPosition += 10; // Space between questions
    });
    
    doc.save(filename);
  };

  const exportFlashcardsAsPDF = (flashcards: any[], filename: string) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Flashcards', 20, 30);
    
    let yPosition = 50;
    
    flashcards.forEach((card, index) => {
      // Check if we need a new page
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Card number
      doc.setFontSize(14);
      doc.text(`Card ${index + 1}`, 20, yPosition);
      yPosition += 15;
      
      // Front (Question)
      doc.setFontSize(12);
      doc.text('Front:', 20, yPosition);
      yPosition += 8;
      const frontLines = doc.splitTextToSize(card.front, 160);
      doc.text(frontLines, 25, yPosition);
      yPosition += frontLines.length * 6 + 10;
      
      // Back (Answer)
      doc.text('Back:', 20, yPosition);
      yPosition += 8;
      const backLines = doc.splitTextToSize(card.back, 160);
      doc.text(backLines, 25, yPosition);
      yPosition += backLines.length * 6 + 15;
    });
    
    doc.save(filename);
  };

  const exportSummaryAsPDF = (summary: any, filename: string) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(`Summary: ${summary.topic}`, 20, 30);
    
    let yPosition = 50;
    
    // Main summary
    doc.setFontSize(12);
    doc.text('Summary:', 20, yPosition);
    yPosition += 10;
    
    const summaryLines = doc.splitTextToSize(summary.summary, 160);
    doc.text(summaryLines, 20, yPosition);
    yPosition += summaryLines.length * 6 + 20;
    
    // Key points
    if (summary.key_points && summary.key_points.length > 0) {
      doc.setFontSize(14);
      doc.text('Key Points:', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(10);
      summary.key_points.forEach((point: string, index: number) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`• ${point}`, 25, yPosition);
        yPosition += 8;
      });
    }
    
    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold">Generate Study Materials</h2>
      </div>
      <p className="text-gray-600">Create quizzes, flashcards, and summaries from your uploaded materials</p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
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
        <TabsContent value="quiz" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quiz-topic">Topic (optional)</Label>
                  <Input
                    id="quiz-topic"
                    placeholder="e.g., Machine Learning"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="quiz-count">Number of Questions</Label>
                  <Input
                    id="quiz-count"
                    type="number"
                    min="1"
                    max="20"
                    value={quizCount}
                    onChange={(e) => setQuizCount(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="quiz-type">Question Type</Label>
                  <Select value={quizType} onValueChange={setQuizType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="open_ended">Open Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={generateQuiz} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                Generate Quiz
              </Button>
            </CardContent>
          </Card>

          {quiz && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Generated Quiz</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => exportContent(quiz, `quiz-${quiz.topic}.pdf`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{quiz.type.replace('_', ' ')}</Badge>
                      <Badge>{quiz.questions.length} questions</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetQuiz}>
                      Reset Quiz
                    </Button>
                  </div>
                  {quiz.questions.map((question, index) => {
                    const userAnswer = userAnswers[index];
                    const isSubmitted = submittedAnswers[index];
                    const showResult = showResults[index];
                    const isCorrect = userAnswer === question.correct_answer;

                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <p className="font-medium mb-4">{index + 1}. {question.question}</p>
                        
                        {question.options && quiz.type === 'multiple_choice' && (
                          <div className="space-y-2 mb-4">
                            {question.options.map((option, optIndex) => {
                              const optionLetter = option.charAt(0);
                              const isSelected = userAnswer === optionLetter;
                              const isCorrectOption = question.correct_answer === optionLetter;
                              
                              let buttonClass = "w-full text-left p-3 border rounded-lg transition-colors ";
                              if (showResult) {
                                if (isCorrectOption) {
                                  buttonClass += "bg-green-100 border-green-500 text-green-800";
                                } else if (isSelected && !isCorrect) {
                                  buttonClass += "bg-red-100 border-red-500 text-red-800";
                                } else {
                                  buttonClass += "bg-gray-50 border-gray-200";
                                }
                              } else if (isSelected) {
                                buttonClass += "bg-blue-100 border-blue-500 text-blue-800";
                              } else {
                                buttonClass += "hover:bg-gray-50 border-gray-200";
                              }
                              
                              return (
                                <button
                                  key={optIndex}
                                  className={buttonClass}
                                  onClick={() => !isSubmitted && handleAnswerSelect(index, optionLetter)}
                                  disabled={isSubmitted}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        {question.options && quiz.type === 'true_false' && (
                          <div className="space-y-2 mb-4">
                            {['True', 'False'].map((option) => {
                              const isSelected = userAnswer === option.toLowerCase();
                              const isCorrectOption = question.correct_answer.toString().toLowerCase() === option.toLowerCase();
                              
                              let buttonClass = "w-full text-left p-3 border rounded-lg transition-colors ";
                              if (showResult) {
                                if (isCorrectOption) {
                                  buttonClass += "bg-green-100 border-green-500 text-green-800";
                                } else if (isSelected && !isCorrect) {
                                  buttonClass += "bg-red-100 border-red-500 text-red-800";
                                } else {
                                  buttonClass += "bg-gray-50 border-gray-200";
                                }
                              } else if (isSelected) {
                                buttonClass += "bg-blue-100 border-blue-500 text-blue-800";
                              } else {
                                buttonClass += "hover:bg-gray-50 border-gray-200";
                              }
                              
                              return (
                                <button
                                  key={option}
                                  className={buttonClass}
                                  onClick={() => !isSubmitted && handleAnswerSelect(index, option.toLowerCase())}
                                  disabled={isSubmitted}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        {quiz.type === 'open_ended' && (
                          <div className="mb-4">
                            <textarea
                              className="w-full p-3 border rounded-lg"
                              rows={3}
                              placeholder="Type your answer here..."
                              value={userAnswer || ''}
                              onChange={(e) => handleAnswerSelect(index, e.target.value)}
                              disabled={isSubmitted}
                            />
                          </div>
                        )}
                        
                        {!isSubmitted && userAnswer && (
                          <Button 
                            onClick={() => handleSubmitAnswer(index)}
                            className="mb-3"
                          >
                            Submit Answer
                          </Button>
                        )}
                        
                        {showResult && (
                          <div className={`p-3 rounded-lg ${isCorrect && quiz.type !== 'open_ended' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            {quiz.type !== 'open_ended' && (
                              <p className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                              </p>
                            )}
                            <p className="text-sm text-gray-700 mt-1">
                              <strong>Correct Answer:</strong> {question.correct_answer}
                            </p>
                            {question.explanation && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Explanation:</strong> {question.explanation}
                              </p>
                            )}
                            {quiz.type === 'open_ended' && question.sample_answer && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Sample Answer:</strong> {question.sample_answer}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Flashcards Tab */}
        <TabsContent value="flashcards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Flashcards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flashcard-topic">Topic (optional)</Label>
                  <Input
                    id="flashcard-topic"
                    placeholder="e.g., Data Structures"
                    value={flashcardTopic}
                    onChange={(e) => setFlashcardTopic(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="flashcard-count">Number of Cards</Label>
                  <Input
                    id="flashcard-count"
                    type="number"
                    min="1"
                    max="50"
                    value={flashcardCount}
                    onChange={(e) => setFlashcardCount(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <Button onClick={generateFlashcards} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
                Generate Flashcards
              </Button>
            </CardContent>
          </Card>

          {flashcards.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Generated Flashcards</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => exportContent(flashcards, `flashcards-${flashcardTopic || 'general'}.pdf`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {flashcards.map((card, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Front</p>
                          <p className="font-medium">{card.front}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Back</p>
                          <p className="text-gray-700">{card.back}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{card.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="summary-topic">Topic (optional)</Label>
                <Input
                  id="summary-topic"
                  placeholder="e.g., Neural Networks"
                  value={summaryTopic}
                  onChange={(e) => setSummaryTopic(e.target.value)}
                />
              </div>
              <Button onClick={generateSummary} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                Generate Summary
              </Button>
            </CardContent>
          </Card>

          {summary && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Generated Summary</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => exportContent(summary, `summary-${summary.topic}.pdf`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{summary.summary}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Key Points</h3>
                  <ul className="space-y-1">
                    {summary.key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {summary.main_topics && (
                  <div>
                    <h3 className="font-semibold mb-2">Main Topics</h3>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
