"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Download, Pin, Clock, Search, Plus, X, BookOpen, Lightbulb, HelpCircle, Calculator } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: Source[];
}

interface Source {
  title: string;
  page?: number;
  timestamp?: string;
  type: 'pdf' | 'video' | 'document';
}

interface SavedQA {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  isPinned: boolean;
}

interface Note {
  id: string;
  content: string;
  timestamp: Date;
  module?: string;
}

const AIChatInterface: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI assistant for this course. I can help you understand concepts, summarize materials, and answer questions based on your uploaded content. How can I help you today?",
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedQAs, setSavedQAs] = useState<SavedQA[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState('');
  const [sidebarView, setSidebarView] = useState<'memory' | 'notes'>('memory');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickPrompts = [
    { icon: BookOpen, text: "Summarize today's lecture", category: "summary" },
    { icon: HelpCircle, text: "Explain this concept in simple terms", category: "explanation" },
    { icon: Calculator, text: "Help me solve this problem", category: "problem" },
    { icon: Lightbulb, text: "What should I focus on for the exam?", category: "study" },
    { icon: FileText, text: "Key points from Chapter 3", category: "summary" },
    { icon: Search, text: "Find information about...", category: "search" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    const currentInput = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: currentInput,
          course_id: courseId,
          conversation_history: messages.map(msg => ({
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        }),
      });

      const data = await response.json();

      if (data.success && data.message) {
        const aiMessage: Message = {
          id: data.message.id,
          type: 'ai',
          content: data.message.content,
          timestamp: new Date(data.message.timestamp),
          sources: data.message.sources || []
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Handle error
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `Sorry, I encountered an error: ${data.error || 'Unknown error occurred'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I\'m having trouble connecting to the server. Please try again later.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
    setShowQuickPrompts(false);
    inputRef.current?.focus();
  };

  const saveQA = (questionId: string, answerId: string) => {
    const question = messages.find(m => m.id === questionId);
    const answer = messages.find(m => m.id === answerId);
    
    if (question && answer) {
      const savedQA: SavedQA = {
        id: Date.now().toString(),
        question: question.content,
        answer: answer.content,
        timestamp: new Date(),
        isPinned: false,
      };
      setSavedQAs(prev => [...prev, savedQA]);
    }
  };

  const togglePin = (id: string) => {
    setSavedQAs(prev => prev.map(qa => 
      qa.id === id ? { ...qa, isPinned: !qa.isPinned } : qa
    ));
  };

  const addNote = () => {
    if (!activeNote.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      content: activeNote,
      timestamp: new Date(),
    };
    setNotes(prev => [...prev, note]);
    setActiveNote('');
  };

  const exportChat = () => {
    const chatContent = messages.map(m => 
      `${m.type.toUpperCase()}: ${m.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-transcript.txt';
    a.click();
  };

  return (
    <div className="h-[calc(100vh-200px)] bg-white rounded-2xl shadow-lg border border-gray-200 flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">AI Course Assistant</h3>
                <p className="text-sm text-gray-600">Powered by your course materials</p>
              </div>
            </div>
            <button
              onClick={exportChat}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        {showQuickPrompts && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Quick Prompts</h4>
              <button
                onClick={() => setShowQuickPrompts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt.text)}
                                     className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                >
                  <prompt.icon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                     message.type === 'user' 
                       ? 'bg-blue-500' 
                       : 'bg-gradient-to-r from-purple-500 to-pink-500'
                   }`}>
                                         {message.type === 'user' ? (
                       <User className="w-5 h-5 text-white" />
                     ) : (
                       <Bot className="w-5 h-5 text-white" />
                     )}
                  </div>
                  <div className={`rounded-2xl p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Sources */}
                {message.sources && (
                  <div className="mt-3 ml-11">
                    <div className="space-y-2">
                      {message.sources.map((source, idx) => (
                        <div key={idx} className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-700">{source.title}</span>
                          {source.page && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Page {source.page}
                            </span>
                          )}
                          {source.timestamp && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {source.timestamp}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const prevMessage = messages[index - 1];
                        if (prevMessage) saveQA(prevMessage.id, message.id);
                      }}
                      className="mt-2 flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600"
                    >
                      <Pin className="w-3 h-3" />
                      <span>Save Q&A</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
                             <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                   <Bot className="w-5 h-5 text-white" />
                 </div>
                <div className="bg-gray-100 rounded-2xl p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

                 {/* Input Area */}
         <div className="p-4 border-t border-gray-200 bg-gray-50">
           <div className="flex space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me anything about the course..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              {!showQuickPrompts && (
                <button
                  onClick={() => setShowQuickPrompts(true)}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500"
                >
                  <Lightbulb className="w-5 h-5" />
                </button>
              )}
            </div>
                         <button
               onClick={handleSendMessage}
               disabled={!inputMessage.trim() || isLoading}
               className="px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               <Send className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-1 bg-white rounded-lg p-1">
            <button
              onClick={() => setSidebarView('memory')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                sidebarView === 'memory'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Memory
            </button>
            <button
              onClick={() => setSidebarView('notes')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                sidebarView === 'notes'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Notes
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {sidebarView === 'memory' ? (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Saved Q&As</h4>
              {savedQAs.length > 0 ? (
                <div className="space-y-3">
                  {savedQAs.map((qa) => (
                    <div key={qa.id} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-800 line-clamp-2">{qa.question}</h5>
                        <button
                          onClick={() => togglePin(qa.id)}
                          className={`ml-2 ${qa.isPinned ? 'text-yellow-500' : 'text-gray-400'}`}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3">{qa.answer}</p>
                      <p className="text-xs text-gray-400 mt-2">{qa.timestamp.toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No saved Q&As yet. Pin conversations to save them here.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-800">Course Notes</h4>
                <button
                  onClick={addNote}
                  disabled={!activeNote.trim()}
                  className="text-blue-500 hover:text-blue-600 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <textarea
                value={activeNote}
                onChange={(e) => setActiveNote(e.target.value)}
                placeholder="Add your course notes here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />

              {notes.length > 0 && (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-800">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{note.timestamp.toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface; 