"use client"

import React, { useState } from 'react';
import { BookOpen, Brain, FileText, Download, Loader2, Sparkles } from 'lucide-react';
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

export default function MaterialGenerationInterface() {
  const [activeTab, setActiveTab] = useState('quiz');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

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
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setLoading(false);
    }
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
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                  onClick={() => exportContent(quiz, `quiz-${quiz.topic}.json`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary">{quiz.type.replace('_', ' ')}</Badge>
                    <Badge>{quiz.questions.length} questions</Badge>
                  </div>
                  {quiz.questions.map((question, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <p className="font-medium mb-2">{index + 1}. {question.question}</p>
                      {question.options && (
                        <div className="space-y-1 mb-2">
                          {question.options.map((option, optIndex) => (
                            <p key={optIndex} className="text-sm text-gray-600">{option}</p>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-green-600 font-medium">
                        Answer: {question.correct_answer.toString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{question.explanation}</p>
                    </div>
                  ))}
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
                  onClick={() => exportContent(flashcards, `flashcards-${flashcardTopic || 'general'}.json`)}
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
                  onClick={() => exportContent(summary, `summary-${summary.topic}.json`)}
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
