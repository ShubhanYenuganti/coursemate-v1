"use client";

import React, { useState } from 'react';
import { BookOpen, Loader2, RotateCcw, Grid, Play, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Flashcard {
  front: string;
  back: string;
  category: string;
}

interface FlashcardGeneratorProps {
  courseId: string;
}

export default function FlashcardGenerator({ courseId }: FlashcardGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [saving, setSaving] = useState(false);

  // Flashcard interaction state
  const [flippedCards, setFlippedCards] = useState<{[key: number]: boolean}>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [studyMode, setStudyMode] = useState<'grid' | 'study'>('grid');

  // Flashcard generation parameters
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [flashcardCount, setFlashcardCount] = useState(10);

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

  const saveFlashcardsToMaterials = async () => {
    if (!flashcards || flashcards.length === 0) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const endpoint = `${api}/api/courses/${courseId}/materials/save-flashcards`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          flashcards_data: {
            flashcards: flashcards,
            topic: flashcardTopic || 'Study Cards',
            generated_from: Date.now()
          },
          material_name: `Flashcards: ${flashcardTopic || 'Study Cards'} (${flashcards.length} cards)`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save flashcards: ${response.status} - ${errorText}`);
      }
      
      alert('Flashcards saved to materials successfully!');
    } catch (error) {
      console.error('Error saving flashcards to materials:', error);
      alert('Failed to save flashcards to materials. Please try again.');
    } finally {
      setSaving(false);
    }
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
    <div className="space-y-4">
      <Card className="w-full">
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
              <Input
                id="flashcard-count"
                type="number"
                min="1"
                max="50"
                value={flashcardCount}
                onChange={(e) => setFlashcardCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                placeholder="e.g., 10"
              />
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
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Flashcards ({flashcards.length} cards)</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={saveFlashcardsToMaterials}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save to Materials'}
              </Button>
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
                    className="relative h-40 cursor-pointer"
                    onClick={() => flipCard(index)}
                    style={{ perspective: '1000px' }}
                  >
                    <div className={`absolute inset-0 rounded-lg border transition-all duration-300 transform ${flippedCards[index] ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                      <div className={`absolute inset-0 rounded-lg bg-blue-50 border-blue-200 ${flippedCards[index] ? 'opacity-0' : 'opacity-100'} transition-opacity duration-150`} style={{ backfaceVisibility: 'hidden' }}>
                        <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
                          <div className="flex items-center justify-center min-h-full">
                            <p className="text-sm font-medium break-words text-center px-2 py-1">{card.front}</p>
                          </div>
                        </div>
                      </div>
                      <div className={`absolute inset-0 rounded-lg bg-green-50 border-green-200 ${flippedCards[index] ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-green-100">
                          <div className="flex items-center justify-center min-h-full">
                            <p className="text-sm break-words text-center px-2 py-1">{card.back}</p>
                          </div>
                        </div>
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
                  className="h-64 cursor-pointer"
                  onClick={() => flipCard(currentCardIndex)}
                  style={{ perspective: '1000px' }}
                >
                  <div className={`relative h-full rounded-lg border transition-all duration-300 transform ${flippedCards[currentCardIndex] ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                    <div className={`absolute inset-0 rounded-lg bg-blue-50 border-blue-200 ${flippedCards[currentCardIndex] ? 'opacity-0' : 'opacity-100'} transition-opacity duration-150`} style={{ backfaceVisibility: 'hidden' }}>
                      <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
                        <div className="flex items-center justify-center min-h-full">
                          <p className="font-medium break-words text-center px-3 py-2">{flashcards[currentCardIndex]?.front}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`absolute inset-0 rounded-lg bg-green-50 border-green-200 ${flippedCards[currentCardIndex] ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                      <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-green-100">
                        <div className="flex items-center justify-center min-h-full">
                          <p className="break-words text-center px-3 py-2">{flashcards[currentCardIndex]?.back}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}