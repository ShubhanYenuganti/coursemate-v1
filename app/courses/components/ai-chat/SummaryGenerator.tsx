"use client";

import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Summary {
  summary: string;
  key_points: string[];
  main_topics: string[];
  topic: string;
  generated_from: number;
}

interface SummaryGeneratorProps {
  courseId: string;
}

export default function SummaryGenerator({ courseId }: SummaryGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryTopic, setSummaryTopic] = useState('');

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

  return (
    <div className="space-y-4">
      <Card className="w-full">
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
        <Card className="w-full">
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
  );
}