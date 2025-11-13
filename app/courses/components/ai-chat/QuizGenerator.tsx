"use client";

import React, { useState } from 'react';
import { Brain, Loader2, RotateCcw, Save, Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface QuestionConfig {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  allow_multiple?: boolean;
}

interface QuizQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer: string | boolean | string[];
  allow_multiple?: boolean;
  explanation: string;
  sample_answer?: string;
  key_points?: string[];
}

interface Quiz {
  questions: QuizQuestion[];
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
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

  // Quiz interaction state
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string | string[]}>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{[key: number]: boolean}>({});
  const [showResults, setShowResults] = useState<{[key: number]: boolean}>({});

  // Simple mode parameters
  const [quizTopic, setQuizTopic] = useState('');
  const [quizCount, setQuizCount] = useState(5);
  const [quizType, setQuizType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice');

  // Advanced mode - question configuration
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([
    { id: '1', type: 'multiple_choice', allow_multiple: false },
    { id: '2', type: 'multiple_choice', allow_multiple: false },
    { id: '3', type: 'multiple_choice', allow_multiple: false },
    { id: '4', type: 'true_false' },
    { id: '5', type: 'short_answer' },
  ]);

  const addQuestion = () => {
    const newId = (questionConfigs.length + 1).toString();
    setQuestionConfigs([...questionConfigs, { id: newId, type: 'multiple_choice', allow_multiple: false }]);
  };

  const removeQuestion = (id: string) => {
    if (questionConfigs.length <= 1) return;
    setQuestionConfigs(questionConfigs.filter(q => q.id !== id));
  };

  const updateQuestionConfig = (id: string, field: keyof QuestionConfig, value: any) => {
    setQuestionConfigs(questionConfigs.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newConfigs = [...questionConfigs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newConfigs.length) return;
    
    [newConfigs[index], newConfigs[targetIndex]] = [newConfigs[targetIndex], newConfigs[index]];
    setQuestionConfigs(newConfigs);
  };

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      
      let requestBody: any = {
        topic: quizTopic || undefined,
        course_id: courseId
      };

      if (mode === 'simple') {
        requestBody.num_questions = quizCount;
        requestBody.type = quizType;
      } else {
        // Advanced mode - send question configuration
        requestBody.question_config = questionConfigs.map(q => ({
          type: q.type,
          allow_multiple: q.type === 'multiple_choice' ? q.allow_multiple : undefined
        }));
      }

      const response = await fetch(`${api}/api/courses/${courseId}/materials/generate-quiz`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
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
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, answer: string, question: QuizQuestion) => {
    if (question.allow_multiple && Array.isArray(userAnswers[questionIndex])) {
      // Multiple answer mode
      const currentAnswers = userAnswers[questionIndex] as string[];
      const newAnswers = currentAnswers.includes(answer)
        ? currentAnswers.filter(a => a !== answer)
        : [...currentAnswers, answer];
      
      setUserAnswers(prev => ({
        ...prev,
        [questionIndex]: newAnswers
      }));
    } else if (question.allow_multiple) {
      // First selection in multiple answer mode
      setUserAnswers(prev => ({
        ...prev,
        [questionIndex]: [answer]
      }));
    } else {
      // Single answer mode
      setUserAnswers(prev => ({
        ...prev,
        [questionIndex]: answer
      }));
    }
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

  const checkAnswerCorrect = (question: QuizQuestion, userAnswer: string | string[]): boolean => {
    if (question.allow_multiple && Array.isArray(question.correct_answer)) {
      // Multiple correct answers - check if arrays match
      const sortedCorrect = [...question.correct_answer].sort();
      const sortedUser = Array.isArray(userAnswer) ? [...userAnswer].sort() : [userAnswer];
      return JSON.stringify(sortedCorrect) === JSON.stringify(sortedUser);
    } else {
      // Single correct answer
      return userAnswer === question.correct_answer;
    }
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
          {/* Mode selector */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'simple' ? 'default' : 'outline'}
              onClick={() => setMode('simple')}
              size="sm"
            >
              Simple Mode
            </Button>
            <Button
              variant={mode === 'advanced' ? 'default' : 'outline'}
              onClick={() => setMode('advanced')}
              size="sm"
            >
              Advanced Mode
            </Button>
          </div>

          {/* Topic input (common to both modes) */}
          <div>
            <Label htmlFor="quiz-topic">Topic (optional)</Label>
            <Input
              id="quiz-topic"
              value={quizTopic}
              onChange={(e) => setQuizTopic(e.target.value)}
              placeholder="e.g., Linear Algebra"
            />
          </div>

          {mode === 'simple' ? (
            // Simple mode configuration
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Select value={quizType} onValueChange={(value: any) => setQuizType(value)}>
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
          ) : (
            // Advanced mode configuration
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Question Configuration</Label>
                <Button onClick={addQuestion} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Question
                </Button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questionConfigs.map((config, index) => (
                  <div key={config.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Badge variant="outline" className="shrink-0">Q{index + 1}</Badge>
                    
                    <Select 
                      value={config.type} 
                      onValueChange={(value: any) => updateQuestionConfig(config.id, 'type', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">MCQ</SelectItem>
                        <SelectItem value="true_false">T/F</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>

                    {config.type === 'multiple_choice' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`multiple-${config.id}`}
                          checked={config.allow_multiple || false}
                          onCheckedChange={(checked) => 
                            updateQuestionConfig(config.id, 'allow_multiple', checked)
                          }
                        />
                        <Label htmlFor={`multiple-${config.id}`} className="text-sm">
                          Multiple answers
                        </Label>
                      </div>
                    )}

                    <div className="flex gap-1 ml-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveQuestion(index, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveQuestion(index, 'down')}
                        disabled={index === questionConfigs.length - 1}
                      >
                        <MoveDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeQuestion(config.id)}
                        disabled={questionConfigs.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <div className="flex-1">
                      <p className="font-medium">{question.question}</p>
                      {question.allow_multiple && (
                        <Badge variant="secondary" className="mt-1">Select all that apply</Badge>
                      )}
                    </div>
                  </div>

                  {question.type === 'multiple_choice' && question.options && (
                    <div className="space-y-2 ml-8">
                      {question.options.map((option, optionIndex) => {
                        const optionLetter = option.charAt(0);
                        const isSelected = question.allow_multiple 
                          ? Array.isArray(userAnswers[index]) && (userAnswers[index] as string[]).includes(optionLetter)
                          : userAnswers[index] === optionLetter;
                        
                        const isCorrect = Array.isArray(question.correct_answer)
                          ? question.correct_answer.includes(optionLetter)
                          : question.correct_answer === optionLetter;

                        return (
                          <label key={optionIndex} className="flex items-center gap-2 cursor-pointer">
                            {question.allow_multiple ? (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleAnswerSelect(index, optionLetter, question)}
                                disabled={submittedAnswers[index]}
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`question-${index}`}
                                value={optionLetter}
                                checked={isSelected}
                                onChange={() => handleAnswerSelect(index, optionLetter, question)}
                                disabled={submittedAnswers[index]}
                                className="text-blue-600"
                              />
                            )}
                            <span className={submittedAnswers[index] && isCorrect ? 'text-green-600 font-medium' : ''}>
                              {option}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'true_false' && (
                    <div className="space-y-2 ml-8">
                      {['True', 'False'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option}
                            checked={userAnswers[index] === option}
                            onChange={() => handleAnswerSelect(index, option, question)}
                            disabled={submittedAnswers[index]}
                            className="text-blue-600"
                          />
                          <span className={submittedAnswers[index] && String(question.correct_answer) === option ? 'text-green-600 font-medium' : ''}>
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'short_answer' && (
                    <div className="ml-8">
                      <Input
                        placeholder="Type your answer here..."
                        value={userAnswers[index] as string || ''}
                        onChange={(e) => setUserAnswers(prev => ({...prev, [index]: e.target.value}))}
                        disabled={submittedAnswers[index]}
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div className="ml-8 mt-3 space-y-2">
                    {!submittedAnswers[index] && userAnswers[index] && (
                      <Button size="sm" onClick={() => handleSubmitAnswer(index)}>
                        Submit Answer
                      </Button>
                    )}

                    {showResults[index] && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {question.type !== 'short_answer' && (
                          <p className="text-sm font-medium mb-1">
                            {checkAnswerCorrect(question, userAnswers[index]) ? (
                              <span className="text-green-600">✓ Correct!</span>
                            ) : (
                              <span className="text-red-600">✗ Incorrect</span>
                            )}
                          </p>
                        )}
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Correct Answer: <span className="text-green-600">
                            {Array.isArray(question.correct_answer) 
                              ? question.correct_answer.join(', ')
                              : String(question.correct_answer)
                            }
                          </span>
                        </p>
                        {question.explanation && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{question.explanation}</p>
                        )}
                        {question.sample_answer && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sample Answer:</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{question.sample_answer}</p>
                          </div>
                        )}
                        {question.key_points && question.key_points.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Key Points:</p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                              {question.key_points.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
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