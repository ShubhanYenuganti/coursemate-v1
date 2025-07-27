"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RotateCcw, CheckCircle, XCircle, Eye, EyeOff, X } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuizQuestion {
  question: string;
  options?: string[];
  correct_answer: string | boolean;
  explanation: string;
  sample_answer?: string;
  key_points?: string[];
}

interface QuizData {
  questions: QuizQuestion[];
  type: string;
  topic: string;
  generated_from?: number;
}

interface QuizViewerProps {
  quizData: QuizData;
  onClose?: () => void;
}

export default function QuizViewer({ quizData, onClose }: QuizViewerProps) {
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string | number | boolean}>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{[key: number]: boolean}>({});
  const [showResults, setShowResults] = useState<{[key: number]: boolean}>({});
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  const handleAnswerSelect = (questionIndex: number, answer: string | number | boolean) => {
    if (submittedAnswers[questionIndex]) return; // Don't allow changing submitted answers
    
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
    setShowAllAnswers(false);
  };

  const toggleShowAllAnswers = () => {
    setShowAllAnswers(!showAllAnswers);
    if (!showAllAnswers) {
      // Show all answers
      const newShowResults: {[key: number]: boolean} = {};
      const newSubmitted: {[key: number]: boolean} = {};
      quizData.questions.forEach((_, index) => {
        newShowResults[index] = true;
        newSubmitted[index] = true;
      });
      setShowResults(newShowResults);
      setSubmittedAnswers(newSubmitted);
    } else {
      // Hide all answers
      resetQuiz();
    }
  };

  const getScoreInfo = () => {
    const totalQuestions = quizData.questions.length;
    const answeredQuestions = Object.keys(submittedAnswers).length;
    let correctAnswers = 0;

    quizData.questions.forEach((question, index) => {
      if (submittedAnswers[index] && userAnswers[index] === question.correct_answer) {
        correctAnswers++;
      }
    });

    return { totalQuestions, answeredQuestions, correctAnswers };
  };

  const { totalQuestions, answeredQuestions, correctAnswers } = getScoreInfo();

  return (
    <div className="mx-auto p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2 max-w-xl mx-auto">
        <Card className="flex-1 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-4 h-4 text-purple-600" />
                Quiz: {quizData.topic}
              </CardTitle>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">{quizData.type.replace('_', ' ')}</Badge>
                <Badge className="text-xs">{quizData.questions.length} questions</Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={toggleShowAllAnswers}>
                {showAllAnswers ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Show All
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={resetQuiz}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          {answeredQuestions > 0 && (
            <CardContent>
              <Alert>
                <AlertDescription>
                  Progress: {answeredQuestions}/{totalQuestions} questions answered
                  {answeredQuestions > 0 && (
                    <span className="ml-2">
                      • Score: {correctAnswers}/{answeredQuestions} correct ({Math.round((correctAnswers / answeredQuestions) * 100)}%)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6 max-w-xl mx-auto">
        {quizData.questions.map((question, index) => {
          const userAnswer = userAnswers[index];
          const isSubmitted = submittedAnswers[index];
          const showResult = showResults[index];
          const isCorrect = userAnswer === question.correct_answer;

          return (
            <Card key={index}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant="outline" className="mt-1 text-xs">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{question.question}</p>
                  </div>
                  {isSubmitted && (
                    <div className="flex items-center gap-1">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* Multiple Choice Options */}
                {question.options && quizData.type === 'multiple_choice' && (
                  <div className="space-y-1 ml-6 mb-2">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = userAnswer === optionIndex;
                      const isCorrectOption = typeof question.correct_answer === 'number' && question.correct_answer === optionIndex;
                      
                      let buttonClass = "w-full text-left p-2 border rounded-md transition-colors text-xs ";
                      if (showResult) {
                        if (isCorrectOption) {
                          buttonClass += "bg-green-100 border-green-500 text-green-800";
                        } else if (isSelected && !isCorrect) {
                          buttonClass += "bg-red-100 border-red-500 text-red-800";
                        } else {
                          buttonClass += "bg-gray-50 border-gray-200";
                        }
                      } else if (isSelected) {
                        buttonClass += "bg-blue-100 border-blue-500";
                      } else {
                        buttonClass += "bg-white border-gray-200 hover:bg-gray-50";
                      }

                      return (
                        <button
                          key={optionIndex}
                          className={buttonClass}
                          onClick={() => handleAnswerSelect(index, optionIndex)}
                          disabled={isSubmitted}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* True/False Options */}
                {quizData.type === 'true_false' && (
                  <div className="flex gap-2 ml-6 mb-2">
                    {[true, false].map((value, idx) => {
                      const isSelected = userAnswer === value;
                      const isCorrectOption = question.correct_answer === value;
                      
                      let buttonClass = "px-3 py-1 border rounded-md transition-colors text-xs ";
                      if (showResult) {
                        if (isCorrectOption) {
                          buttonClass += "bg-green-100 border-green-500 text-green-800";
                        } else if (isSelected && !isCorrect) {
                          buttonClass += "bg-red-100 border-red-500 text-red-800";
                        } else {
                          buttonClass += "bg-gray-50 border-gray-200";
                        }
                      } else if (isSelected) {
                        buttonClass += "bg-blue-100 border-blue-500";
                      } else {
                        buttonClass += "bg-white border-gray-200 hover:bg-gray-50";
                      }

                      return (
                        <button
                          key={idx}
                          className={buttonClass}
                          onClick={() => handleAnswerSelect(index, value)}
                          disabled={isSubmitted}
                        >
                          {value ? 'True' : 'False'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {quizData.type === 'short_answer' && (
                  <div className="ml-8 mb-4">
                    <textarea
                      className="w-full p-3 border rounded-lg min-h-[100px] resize-y"
                      placeholder="Type your answer here..."
                      value={(userAnswer as string) || ''}
                      onChange={(e) => handleAnswerSelect(index, e.target.value)}
                      disabled={isSubmitted}
                    />
                  </div>
                )}

                {/* Submit/Results Section */}
                <div className="ml-6 space-y-2">
                  {!isSubmitted && userAnswer !== undefined && userAnswer !== '' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleSubmitAnswer(index)}
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1"
                    >
                      Submit
                    </Button>
                  )}

                  {showResult && (
                    <div className="bg-gray-50 p-2 rounded-md space-y-1">
                      <div className="flex items-center gap-1">
                        {isCorrect ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className="font-medium text-xs">
                          {isCorrect ? 'Correct!' : 'Incorrect'}
                        </span>
                      </div>
                      
                      <div className="text-xs space-y-1">
                        <p>
                          <span className="font-medium">Correct Answer: </span>
                          <span className="text-green-600">
                            {quizData.type === 'multiple_choice' && question.options && typeof question.correct_answer === 'number'
                              ? `${String.fromCharCode(65 + question.correct_answer)}. ${question.options[question.correct_answer]}`
                              : String(question.correct_answer)
                            }
                          </span>
                        </p>
                        
                        {!isCorrect && userAnswer !== undefined && (
                          <p>
                            <span className="font-medium">Your Answer: </span>
                            <span className="text-red-600">
                              {quizData.type === 'multiple_choice' && question.options && typeof userAnswer === 'number'
                                ? `${String.fromCharCode(65 + userAnswer)}. ${question.options[userAnswer]}`
                                : String(userAnswer)
                              }
                            </span>
                          </p>
                        )}
                        
                        {question.explanation && (
                          <p className="italic text-gray-600 text-xs">
                            <span className="font-medium">Explanation: </span>
                            {question.explanation}
                          </p>
                        )}
                        
                        {question.key_points && question.key_points.length > 0 && (
                          <div>
                            <span className="font-medium text-xs">Key Points:</span>
                            <ul className="list-disc list-inside ml-2 mt-1">
                              {question.key_points.map((point, idx) => (
                                <li key={idx} className="text-gray-600 text-xs">{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
