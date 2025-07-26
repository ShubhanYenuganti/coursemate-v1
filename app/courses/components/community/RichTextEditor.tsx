
"use client"

import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import * as lowlight from "lowlight";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  onCancel,
  placeholder = "Share your knowledge and help the community... Use the toolbar above to format text, add lists, code, links, and more.",
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Underline,
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({ lowlight: lowlight }),
      Table,
      TableRow,
      TableCell,
      TableHeader,
      Image,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-b-xl text-base leading-relaxed text-gray-800 bg-white",
      },
    },
    immediatelyRender: false,
  });

  return (
    <div className={`border border-gray-300 rounded-xl bg-white shadow-sm ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50 rounded-t-xl flex flex-wrap gap-2 items-center">
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("bold") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("italic") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("underline") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("codeBlock") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          {'</>'}
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("bulletList") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          &#8226; &#8226; &#8226;
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("orderedList") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          1.
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("link") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => {
            const url = window.prompt("Enter URL");
            if (url) editor?.chain().focus().setLink({ href: url }).run();
          }}
          title="Link"
        >
          🔗
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("image") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => {
            const url = window.prompt("Enter image URL");
            if (url) editor?.chain().focus().setImage({ src: url }).run();
          }}
          title="Image"
        >
          🖼️
        </button>
        <button
          type="button"
          className={`h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-blue-50 ${editor?.isActive("table") ? "bg-blue-600 text-white" : "text-gray-700"}`}
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Table"
        >
          ⬛
        </button>
        {onCancel && (
          <button
            type="button"
            className="ml-auto h-9 w-9 p-0 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-600"
            onClick={onCancel}
            title="Close"
          >
            ×
          </button>
        )}
      </div>
      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
