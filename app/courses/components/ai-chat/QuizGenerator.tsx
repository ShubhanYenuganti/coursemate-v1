"use client";

import React, { useState } from 'react';
import { Brain, Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  question: string;
  options?: string[];
  correct_answer: string | boolean;
  explanation: string;
  sample_answer?: string;
  key_points?: string[];
}

interface Quiz {
  questions: QuizQuestion[];
  type: string;
  topic: string;
  generated_from: number;
}

interface QuizGeneratorProps {
  courseId: string;
}

export default function QuizGenerator({ courseId }: QuizGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);

  // Quiz interaction state
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{[key: number]: boolean}>({});
  const [showResults, setShowResults] = useState<{[key: number]: boolean}>({});

  // Quiz generation parameters
  const [quizTopic, setQuizTopic] = useState('');
  const [quizCount, setQuizCount] = useState(5);
  const [quizType, setQuizType] = useState('multiple_choice');

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

  const saveQuizToMaterials = async () => {
    if (!quiz) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const endpoint = `${api}/api/courses/${courseId}/materials/save-quiz`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          quiz_data: quiz,
          material_name: `Quiz: ${quiz.topic}`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save quiz: ${response.status} - ${errorText}`);
      }
      
      alert('Quiz saved to materials successfully!');
    } catch (error) {
      console.error('Error saving quiz to materials:', error);
      alert('Failed to save quiz to materials. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setSubmittedAnswers({});
    setShowResults({});
  };

  return (
    <div className="space-y-4">
      <Card className="w-full">
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
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quiz: {quiz.topic}</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={saveQuizToMaterials}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save to Materials
                  </>
                )}
              </Button>
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
                          Correct Answer: <span className="text-green-600">{String(question.correct_answer)}</span>
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
  );
}