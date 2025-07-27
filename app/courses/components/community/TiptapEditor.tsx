"use client"

import React from "react";
import { useState } from "react";
import { Fragment } from "react";
import 'katex/dist/katex.min.css';
import './TiptapEditor.css'; // Add custom styles for lists and equation blocks
import katex from 'katex';
import { EditorContent, useEditor, Extension } from "@tiptap/react";
// Custom Equation Node for KaTeX
import { Node } from '@tiptap/core';
const Equation = Node.create({
  name: 'equation',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="equation"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: any }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'equation',
        class: 'latex-block',
      },
      katex.renderToString(HTMLAttributes.latex || '', { throwOnError: false })
    ];
  },
  addNodeView() {
    return ({ node }: { node: any }) => {
      const dom = document.createElement('div');
      dom.className = 'latex-block bg-gray-50 border border-gray-200 rounded px-4 py-2 my-2 text-lg';
      dom.setAttribute('data-type', 'equation');
      dom.contentEditable = 'false';
      dom.innerHTML = katex.renderToString(node.attrs.latex || '', { throwOnError: false });
      return {
        dom,
        contentDOM: null,
      };
    };
  },
});
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import { common } from "lowlight";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline as UnderlineIcon, Code, List as ListIcon, ListOrdered, Link as LinkIcon, X } from "lucide-react";

interface TiptapEditorProps {
  value: string;
  onChange: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

export default function TiptapEditor({ value, onChange, onCancel, placeholder = "Start writing...", className = "" }: TiptapEditorProps) {
  // All hooks must be called before any return
  const lowlightInstance = createLowlight(common);
  // Removed dropdown, only use custom equation modal
  const [showCustomEquationModal, setShowCustomEquationModal] = useState(false);
  const [customLatex, setCustomLatex] = useState('');
  const commonEquations = [
    { label: 'Division', latex: '\frac{a}{b}' },
    { label: 'Multiplication', latex: 'a \times b' },
    { label: 'Square Root', latex: '\sqrt{x}' },
    { label: 'Summation', latex: '\sum_{i=1}^n a_i' },
    { label: 'Integral', latex: '\int_a^b f(x) dx' },
    { label: 'Pi', latex: '\pi' },
    { label: 'Theta', latex: '\theta' },
  ];
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link,
      Table,
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight: lowlightInstance }),
      Placeholder.configure({ placeholder }),
      Equation,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[200px] p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-b-xl text-base text-gray-800",
      },
    },
    immediatelyRender: false,
  });

  // Persistent formatting toggles
  const toggleMark = (mark: string) => {
    if (editor && editor.isActive(mark)) {
      editor.chain().focus().unsetMark(mark).run();
    } else if (editor) {
      editor.chain().focus().setMark(mark).run();
    }
  };

  // Insert equation node
  const insertLatexBlock = (latex = '') => {
    if (editor) {
      editor.chain().focus().insertContent({ type: 'equation', attrs: { latex } }).run();
    }
  };

  if (!editor) return <div className="min-h-[200px] p-6 text-gray-400">Loading editor...</div>;

  return (
    <div className={`border border-gray-300 rounded-xl bg-white shadow-sm ${className}`}>  
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50 rounded-t-xl flex flex-wrap items-center gap-1">
        <Button type="button" size="sm" variant={editor.isActive('bold') ? 'default' : 'ghost'} onClick={() => toggleMark('bold')} className={editor.isActive('bold') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-white hover:shadow-sm'} title="Bold (Cmd+B)"><Bold className="w-4 h-4" /></Button>
        <Button type="button" size="sm" variant={editor.isActive('italic') ? 'default' : 'ghost'} onClick={() => toggleMark('italic')} className={editor.isActive('italic') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-white hover:shadow-sm'} title="Italic (Cmd+I)"><Italic className="w-4 h-4" /></Button>
        <Button type="button" size="sm" variant={editor.isActive('underline') ? 'default' : 'ghost'} onClick={() => toggleMark('underline')} className={editor.isActive('underline') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-white hover:shadow-sm'} title="Underline (Cmd+U)"><UnderlineIcon className="w-4 h-4" /></Button>
        <Button type="button" size="sm" variant={editor.isActive('codeBlock') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-white hover:shadow-sm'} title="Code Block"><Code className="w-4 h-4" /></Button>
        <Button type="button" size="sm" variant={editor.isActive('bulletList') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-white hover:shadow-sm'} title="Bullet List"><ListIcon className="w-4 h-4" /></Button>
        <Button type="button" size="sm" variant={editor.isActive('orderedList') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-white hover:shadow-sm'} title="Numbered List"><ListOrdered className="w-4 h-4" /></Button>
        <Button type="button" size="sm" variant={editor.isActive('link') ? 'default' : 'ghost'} onClick={() => {
          const url = window.prompt('Enter URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }} className={editor.isActive('link') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-white hover:shadow-sm'} title="Link"><LinkIcon className="w-4 h-4" /></Button>
      <div className="relative">
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomEquationModal(true)} className="hover:bg-white hover:shadow-sm" title="Equation (LaTeX)">$$</Button>
        {showCustomEquationModal && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
              <h3 className="text-lg font-semibold mb-2">Insert Equation</h3>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-2 py-1 mb-2 font-mono"
                value={customLatex}
                onChange={e => setCustomLatex(e.target.value)}
                placeholder="Enter LaTeX here..."
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomEquationModal(false)}>Cancel</Button>
                <Button type="button" size="sm" onClick={() => { insertLatexBlock(customLatex); setCustomLatex(''); setShowCustomEquationModal(false); }}>Insert</Button>
              </div>
              <div className="mt-2 text-gray-500 text-xs">Example: <span className="font-mono">\int_a^b f(x) dx</span></div>
            </div>
          </div>
        )}
      </div>
        {onCancel && (
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 transition-all duration-200" title="Close"><X className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
