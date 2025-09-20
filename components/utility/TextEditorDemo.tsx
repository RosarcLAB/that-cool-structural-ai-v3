// components/utility/TextEditorDemo.tsx
// Demo component showing how to use the TextEditor independently

import React, { useState, useRef } from 'react';
import TextEditor, { TextEditorHandle } from './TextEditor';

const TextEditorDemo: React.FC = () => {
  const [content, setContent] = useState([
    {
      type: 'paragraph',
      children: [{ text: 'Welcome to the Text Editor demo!' }],
    },
  ]);
  const editorRef = useRef<TextEditorHandle>(null);

  const handleAddSampleContent = () => {
    const timestamp = new Date().toLocaleString();
    const newBlock = {
      type: 'paragraph',
      children: [
        { text: `[${timestamp}] `, bold: true },
        { text: 'AI INSIGHT: ', bold: true, italic: true },
        { text: 'This beam appears to be adequately sized for the applied loads. Consider optimizing the section if material efficiency is a priority.' }
      ]
    };
    
    setContent(prev => [...prev, newBlock]);
  };

  const handleAddAnalysisResult = () => {
    const timestamp = new Date().toLocaleString();
    const newBlock = {
      type: 'paragraph',
      children: [
        { text: `[${timestamp}] `, bold: true },
        { text: 'ANALYSIS RESULT: ', bold: true, italic: true },
        { text: 'Design analysis completed. Status: PASS. Bending utilization: 78.5%, Shear utilization: 42.1%. Element is adequately designed.' }
      ]
    };
    
    setContent(prev => [...prev, newBlock]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Text Editor Demo</h1>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAddSampleContent}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Add AI Insight
        </button>
        <button
          onClick={handleAddAnalysisResult}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Add Analysis Result
        </button>
        <button
          onClick={() => editorRef.current?.downloadPdf()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Download PDF
        </button>
        <button
          onClick={() => editorRef.current?.downloadText()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Download Text
        </button>
      </div>

      <TextEditor
        ref={editorRef}
        content={content}
        onChange={setContent}
        title="Structural Analysis Notes"
        placeholder="Start typing your analysis notes here..."
        className="border border-gray-200 rounded-lg shadow-sm"
      />
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Rich text editing with formatting options (Bold, Italic, Underline, Code)</li>
          <li>Headings, quotes, and lists</li>
          <li>Text alignment options</li>
          <li>Download as PDF or plain text</li>
          <li>Programmatic content insertion (via buttons above)</li>
          <li>Collapsible integration with FormCollapsibleSectionWithStagedSummary</li>
        </ul>
      </div>
    </div>
  );
};

export default TextEditorDemo;
