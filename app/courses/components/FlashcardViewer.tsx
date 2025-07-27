"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
  category: string;
}

interface FlashcardData {
  flashcards: Flashcard[];
  topic?: string;
  generated_from?: number;
}

interface FlashcardViewerProps {
  flashcardData: FlashcardData;
  onClose?: () => void;
}

export default function FlashcardViewer({ flashcardData, onClose }: FlashcardViewerProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);

  // Handle case where flashcardData might not have the expected structure
  const flashcards = flashcardData?.flashcards || [];
  const currentCard = flashcards[currentCardIndex];
  const totalCards = flashcards.length;

  // Early return if no flashcards
  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Flashcards</h2>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-gray-500">No flashcards found.</p>
      </div>
    );
  }

  const nextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const resetCards = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowAllCards(false);
  };

  const toggleShowAllCards = () => {
    setShowAllCards(!showAllCards);
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="mx-auto p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2 max-w-xl mx-auto">
        <Card className="flex-1 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-4 h-4 text-blue-600" />
                Flashcards{flashcardData.topic ? `: ${flashcardData.topic}` : ''}
              </CardTitle>
              <div className="flex items-center gap-1 mt-1">
                <Badge className="text-xs">{totalCards} cards</Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={toggleShowAllCards}>
                {showAllCards ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Card View
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    All Cards
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={resetCards}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
        </Card>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!showAllCards ? (
        /* Single Card View */
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader className="text-center py-3">
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={prevCard}
                  disabled={currentCardIndex === 0}
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {currentCardIndex + 1} / {totalCards}
                  </Badge>
                  {currentCard.category && (
                    <Badge variant="secondary" className="text-xs">
                      {currentCard.category}
                    </Badge>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={nextCard}
                  disabled={currentCardIndex === totalCards - 1}
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div 
                className="min-h-[200px] flex items-center justify-center cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 transition-all duration-300 hover:shadow-md"
                onClick={flipCard}
              >
                <div className="text-center">
                  <p className="text-lg font-medium mb-3">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                  <p className="text-sm text-gray-500">
                    Click to {isFlipped ? 'show front' : 'reveal answer'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-center mt-4">
                <Button onClick={flipCard} variant="outline" size="sm">
                  {isFlipped ? 'Show Front' : 'Reveal Answer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* All Cards View */
        <div className="space-y-3 max-w-xl mx-auto">
          {flashcards.map((card, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant="outline" className="mt-1 text-xs">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    {card.category && (
                      <Badge variant="secondary" className="text-xs mb-2">
                        {card.category}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 ml-6">
                  <div>
                    <p className="font-medium text-sm text-blue-700 mb-1">Front:</p>
                    <p className="text-sm bg-blue-50 p-2 rounded">{card.front}</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm text-green-700 mb-1">Back:</p>
                    <p className="text-sm bg-green-50 p-2 rounded">{card.back}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
