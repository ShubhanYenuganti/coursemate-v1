"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Underline, Code, List, ListOrdered, Link, Image, Type, AlignLeft, AlignCenter, AlignRight, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  code: boolean;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  onCancel, 
  placeholder = "Start writing...",
  className = ""
}: RichTextEditorProps) {
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    code: false
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLatexMode, setIsLatexMode] = useState(false);

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      onChange(htmlContent);
      // Delay format state update to avoid conflicts
      setTimeout(updateFormatState, 10);
    }
  };

  const updateFormatState = () => {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
        // Check if current selection has formatting
        const parentElement = selection.anchorNode?.parentElement;
        const hasFormatting = (tagName: string) => {
          let element = parentElement;
          while (element && element !== editorRef.current) {
            if (element.tagName?.toLowerCase() === tagName.toLowerCase()) {
              return true;
            }
            element = element.parentElement;
          }
          return false;
        };
        
        setFormatState({
          bold: hasFormatting('strong') || hasFormatting('b'),
          italic: hasFormatting('em') || hasFormatting('i'),
          underline: hasFormatting('u'),
          code: hasFormatting('code') || hasFormatting('pre')
        });
      }
    } catch (error) {
      console.warn('Error updating format state:', error);
      // Fallback to default state
      setFormatState({
        bold: false,
        italic: false,
        underline: false,
        code: false
      });
    }
  };

  const executeCommand = (command: string, value?: string) => {
    try {
      editorRef.current?.focus();
      
      // Use modern selection API for formatting commands
      if (['bold', 'italic', 'underline'].includes(command)) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
          // Create wrapper element
          const wrapper = document.createElement(
            command === 'bold' ? 'strong' : 
            command === 'italic' ? 'em' : 'u'
          );
          
          // Extract contents and wrap them
          const contents = range.extractContents();
          wrapper.appendChild(contents);
          range.insertNode(wrapper);
          
          // Position cursor after the formatted text
          range.setStartAfter(wrapper);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // No selection - insert placeholder and format it
          const wrapper = document.createElement(
            command === 'bold' ? 'strong' : 
            command === 'italic' ? 'em' : 'u'
          );
          wrapper.textContent = command === 'bold' ? 'Bold text' : 
                               command === 'italic' ? 'Italic text' : 'Underlined text';
          
          range.insertNode(wrapper);
          
          // Select the inserted text for editing
          range.selectNodeContents(wrapper);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // Use execCommand for other operations (lists, etc.)
        document.execCommand(command, false, value);
      }
      
      setTimeout(() => {
        updateFormatState();
        handleInput();
      }, 10);
      
    } catch (error) {
      console.warn('Error executing command:', command, error);
    }
  };

  const insertLatex = (isBlock: boolean = false) => {
    try {
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const latexContainer = document.createElement('span');
        latexContainer.className = isBlock 
          ? 'latex-block bg-gray-100 border border-gray-300 rounded-lg p-3 my-2 block font-mono text-sm'
          : 'latex-inline bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm';
        latexContainer.contentEditable = 'true';
        latexContainer.textContent = isBlock ? '\\frac{a}{b} + c^2' : '\\alpha + \\beta';
        
        // Clear range and insert
        range.deleteContents();
        range.insertNode(latexContainer);
        
        // Select the LaTeX content for immediate editing
        const selectRange = document.createRange();
        selectRange.selectNodeContents(latexContainer);
        selection.removeAllRanges();
        selection.addRange(selectRange);
        
        setTimeout(() => handleInput(), 10);
      }
    } catch (error) {
      console.warn('Error inserting LaTeX:', error);
    }
  };

  const insertCodeBlock = () => {
    try {
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create code block structure
        const codeContainer = document.createElement('pre');
        codeContainer.className = 'bg-gray-900 text-gray-100 rounded-lg p-4 my-2 font-mono text-sm overflow-x-auto';
        const codeElement = document.createElement('code');
        codeElement.contentEditable = 'true';
        codeElement.textContent = 'function example() {\n  return "Hello World";\n}';
        codeContainer.appendChild(codeElement);
        
        // Insert the code block
        range.deleteContents();
        range.insertNode(codeContainer);
        
        // Select the code content for immediate editing
        const selectRange = document.createRange();
        selectRange.selectNodeContents(codeElement);
        selection.removeAllRanges();
        selection.addRange(selectRange);
        
        setTimeout(() => handleInput(), 10);
      }
    } catch (error) {
      console.warn('Error inserting code block:', error);
    }
  };

  const insertList = (ordered: boolean = false) => {
    try {
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create list structure
        const listElement = document.createElement(ordered ? 'ol' : 'ul');
        listElement.className = ordered ? 'list-decimal ml-6 space-y-1' : 'list-disc ml-6 space-y-1';
        
        const listItem = document.createElement('li');
        listItem.textContent = 'List item';
        listElement.appendChild(listItem);
        
        // Insert the list
        range.deleteContents();
        range.insertNode(listElement);
        
        // Select the list item content for editing
        const selectRange = document.createRange();
        selectRange.selectNodeContents(listItem);
        selection.removeAllRanges();
        selection.addRange(selectRange);
        
        setTimeout(() => handleInput(), 10);
      }
    } catch (error) {
      console.warn('Error inserting list:', error);
      // Fallback to execCommand
      try {
        const listType = ordered ? 'insertOrderedList' : 'insertUnorderedList';
        document.execCommand(listType, false);
        setTimeout(() => {
          updateFormatState();
          handleInput();
        }, 10);
      } catch (fallbackError) {
        console.warn('List fallback also failed:', fallbackError);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          break;
        case '`':
          e.preventDefault();
          executeCommand('formatBlock', 'pre');
          break;
      }
    }
  };

  const toolbarButtons = [
    { 
      icon: Bold, 
      action: () => executeCommand('bold'), 
      tooltip: 'Bold (Cmd+B)',
      active: formatState.bold
    },
    { 
      icon: Italic, 
      action: () => executeCommand('italic'), 
      tooltip: 'Italic (Cmd+I)',
      active: formatState.italic
    },
    { 
      icon: Underline, 
      action: () => executeCommand('underline'), 
      tooltip: 'Underline (Cmd+U)',
      active: formatState.underline
    },
    { 
      icon: Code, 
      action: () => executeCommand('formatBlock', 'pre'), 
      tooltip: 'Code',
      active: false
    },
  ];

  const insertLink = () => {
    try {
      const url = prompt('Enter URL:');
      if (!url) return;
      
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.className = 'text-blue-600 underline hover:text-blue-800';
        linkElement.textContent = selectedText || url;
        
        range.deleteContents();
        range.insertNode(linkElement);
        
        // Move cursor after the link
        const newRange = document.createRange();
        newRange.setStartAfter(linkElement);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setTimeout(() => handleInput(), 10);
      }
    } catch (error) {
      console.warn('Error inserting link:', error);
    }
  };

  const advancedButtons = [
    { icon: List, action: () => insertList(false), tooltip: 'Bullet List' },
    { icon: ListOrdered, action: () => insertList(true), tooltip: 'Numbered List' },
    { icon: Link, action: insertLink, tooltip: 'Link' },
  ];

  return (
    <div className={`border border-gray-300 rounded-xl bg-white shadow-sm ${className}`}>
      {/* Formatting Toolbar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50 rounded-t-xl">
        <div className="flex flex-wrap items-center gap-1">
          {/* Basic Formatting */}
          {toolbarButtons.map((button, index) => (
            <Button
              key={index}
              variant={button.active ? "default" : "ghost"}
              size="sm"
              onClick={button.action}
              className={`h-9 w-9 p-0 transition-all duration-200 ${
                button.active 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'hover:bg-white hover:shadow-sm'
              }`}
              title={button.tooltip}
            >
              <button.icon className="w-4 h-4" />
            </Button>
          ))}
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Advanced Formatting */}
          {advancedButtons.map((button, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={button.action}
              className="h-9 w-9 p-0 hover:bg-white hover:shadow-sm transition-all duration-200"
              title={button.tooltip}
            >
              <button.icon className="w-4 h-4" />
            </Button>
          ))}
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* LaTeX and Code */}
          <Button
            variant="ghost"
            size="sm"
            onClick={insertCodeBlock}
            className="h-9 px-3 hover:bg-white hover:shadow-sm text-xs font-mono transition-all duration-200"
            title="Code Block"
          >
            {'</>'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertLatex(false)} 
            className="h-9 px-3 hover:bg-white hover:shadow-sm text-xs font-mono transition-all duration-200"
            title="Inline LaTeX"
          >
            $x$
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertLatex(true)}
            className="h-9 px-3 hover:bg-white hover:shadow-sm text-xs font-mono transition-all duration-200"
            title="LaTeX Block"
          >
            $$
          </Button>
          
          {onCancel && (
            <div className="ml-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCancel} 
                className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={() => setTimeout(updateFormatState, 10)}
        onKeyUp={() => setTimeout(updateFormatState, 10)}
        onFocus={() => setTimeout(updateFormatState, 10)}
        className="min-h-[200px] p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-b-xl"
        style={{ 
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#374151'
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      >
        {!content && (
          <div className="text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable] strong {
          font-weight: bold;
        }
        
        [contenteditable] em {
          font-style: italic;
        }
        
        [contenteditable] u {
          text-decoration: underline;
        }
        
        [contenteditable] ul {
          list-style-type: disc;
          margin-left: 20px;
          margin-bottom: 10px;
        }
        
        [contenteditable] ol {
          list-style-type: decimal;
          margin-left: 20px;
          margin-bottom: 10px;
        }
        
        [contenteditable] li {
          margin-bottom: 5px;
        }
        
        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
        }
        
        [contenteditable] pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          margin: 8px 0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          overflow-x: auto;
        }
        
        .latex-block, .latex-inline {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .latex-block {
          display: block;
          padding: 12px;
          margin: 8px 0;
          border-radius: 8px;
        }
        
        .latex-inline {
          padding: 2px 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
