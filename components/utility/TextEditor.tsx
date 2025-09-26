// components/utility/TextEditor.tsx
import React, { useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Editable, withReact, useSlate, Slate, ReactEditor } from 'slate-react';
import { Editor, Descendant, Transforms, createEditor, Element as SlateElement, BaseEditor } from 'slate';
import { withHistory, HistoryEditor } from 'slate-history';
import isHotkey from 'is-hotkey';
import { jsPDF } from 'jspdf';
import { DownloadIcon } from './icons';
import { Spinner } from './Spinner';

// Type definitions for Slate
type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
};

type CustomElement = {
  type: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  children: CustomText[];
};

type SlateEditor = BaseEditor & ReactEditor & HistoryEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: SlateEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
  'mod+shift+=': 'superscript',
  'mod+=': 'subscript',
};

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

interface TextEditorProps {
  content: CustomElement[];
  onChange?: (content: CustomElement[]) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  readOnly?: boolean;
}

export interface TextEditorHandle {
  downloadPdf: () => void;
  downloadText: () => void;
  getPlainText: () => string;
  clearDocument: () => void;
}

const initialValue: CustomElement[] = [
  {
    type: 'paragraph',
    children: [{ text: 'Start typing your analysis notes here...' }],
  },
];

export const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(({
  content = initialValue,
  onChange,
  placeholder = "Start typing...",
  title = "Text Editor",
  className = "",
  readOnly = false
}, ref) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Convert Slate content to plain text
  const getPlainText = useCallback(() => {
    return content.map(block => 
      block.children.map(child => child.text).join('')
    ).join('\n');
  }, [content]);

  // Download as PDF
  const handleDownloadPdf = async () => {
    if (!editorRef.current) return;
    
    setIsDownloadingPdf(true);
    try {
      const pdf = new jsPDF();
      const plainText = getPlainText();
      
      // Split text into lines that fit the PDF width
      const lines = pdf.splitTextToSize(plainText, 180);
      let yPosition = 20;
      
      pdf.setFontSize(16);
      pdf.text(title, 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      lines.forEach((line: string) => {
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, 20, yPosition);
        yPosition += 7;
      });
      
      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Download as plain text
  const handleDownloadText = () => {
    const plainText = getPlainText();
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear document content
  const handleClearDocument = () => {
    if (confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
      // Select all content and delete it
      Transforms.select(editor, Editor.range(editor, []));
      Transforms.delete(editor);
      
      // Insert a single empty paragraph
      const emptyParagraph: CustomElement = {
        type: 'paragraph',
        children: [{ text: '' }],
      };
      
      Transforms.insertNodes(editor, emptyParagraph);
      
      // Move cursor to the beginning
      Transforms.select(editor, Editor.start(editor, []));
      
      // Call onChange if provided
      if (onChange && !readOnly) {
        onChange([emptyParagraph]);
      }
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    downloadPdf: handleDownloadPdf,
    downloadText: handleDownloadText,
    getPlainText,
    clearDocument: handleClearDocument,
  }));

  const renderElement = useCallback(({ attributes, children, element }: any) => {
    const style = { textAlign: element.align };
    
    switch (element.type) {
      case 'block-quote':
        return (
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600" style={style} {...attributes}>
            {children}
          </blockquote>
        );
      case 'bulleted-list':
        return (
          <ul className="list-disc list-inside" style={style} {...attributes}>
            {children}
          </ul>
        );
      case 'heading-one':
        return (
          <h1 className="text-2xl font-bold mb-2" style={style} {...attributes}>
            {children}
          </h1>
        );
      case 'heading-two':
        return (
          <h2 className="text-xl font-semibold mb-2" style={style} {...attributes}>
            {children}
          </h2>
        );
      case 'list-item':
        return (
          <li {...attributes}>
            {children}
          </li>
        );
      case 'numbered-list':
        return (
          <ol className="list-decimal list-inside" style={style} {...attributes}>
            {children}
          </ol>
        );
      default:
        return (
          <p className="mb-2" style={style} {...attributes}>
            {children}
          </p>
        );
    }
  }, []);

  const renderLeaf = useCallback(({ attributes, children, leaf }: any) => {
    if (leaf.bold) children = <strong>{children}</strong>;
    if (leaf.italic) children = <em>{children}</em>;
    if (leaf.underline) children = <u>{children}</u>;
    if (leaf.code) children = <code className="bg-gray-100 px-1 rounded text-sm font-mono">{children}</code>;
    if (leaf.superscript) children = <sup className="text-xs">{children}</sup>;
    if (leaf.subscript) children = <sub className="text-xs">{children}</sub>;

    return <span {...attributes}>{children}</span>;
  }, []);

  const handleSlateChange = (newValue: Descendant[]) => {
    if (onChange && !readOnly) {
      onChange(newValue as CustomElement[]);
    }
  };

  return (
    <div className={`bg-white rounded-lg flex flex-col h-full ${className}`}>
      {/* Header with action buttons - Fixed at top */}
      <div className="flex justify-between items-center border-b pb-3 mb-0 px-4 pt-4 flex-shrink-0">
        <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={handleClearDocument}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          )}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50"
          >
            {isDownloadingPdf ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
            PDF
          </button>
          <button
            onClick={handleDownloadText}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-teal-50 hover:bg-teal-100 rounded-full transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            Text
          </button>
        </div>
      </div>

      {/* Editor area - Flexible and scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={editorRef} className="flex-1 flex flex-col overflow-hidden">
          <Slate editor={editor} initialValue={content} onChange={handleSlateChange}>
            {/* Toolbar - Fixed at top of editor */}
            {!readOnly && (
              <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <MarkButton format="bold" icon="B" label="Bold" />
                <MarkButton format="italic" icon="I" label="Italic" />
                <MarkButton format="underline" icon="U" label="Underline" />
                <MarkButton format="code" icon="</>" label="Code" />
                <MarkButton format="superscript" icon="x²" label="Superscript" />
                <MarkButton format="subscript" icon="x₂" label="Subscript" />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <BlockButton format="heading-one" icon="H1" label="Heading 1" />
                <BlockButton format="heading-two" icon="H2" label="Heading 2" />
                <BlockButton format="block-quote" icon="❝" label="Quote" />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <BlockButton format="numbered-list" icon="1." label="Numbered List" />
                <BlockButton format="bulleted-list" icon="•" label="Bulleted List" />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <BlockButton format="left" icon="⫷" label="Align Left" />
                <BlockButton format="center" icon="≡" label="Align Center" />
                <BlockButton format="right" icon="⫸" label="Align Right" />
              </div>
            )}
            
            {/* Editor - Scrollable content area */}
            <div className="flex-1 overflow-y-auto border border-gray-200">
              <Editable
                className={`min-h-full p-4 focus:outline-none focus:ring-2 focus:ring-teal-200 ${readOnly ? 'border border-gray-200 rounded-lg' : ''}`}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                placeholder={placeholder}
                readOnly={readOnly}
                onKeyDown={(event) => {
                  if (readOnly) return;
                  
                  for (const hotkey in HOTKEYS) {
                    if (isHotkey(hotkey, event)) {
                      event.preventDefault();
                      const mark = HOTKEYS[hotkey as keyof typeof HOTKEYS];
                      toggleMark(editor, mark);
                    }
                  }
                }}
              />
            </div>
          </Slate>
        </div>
      </div>
    </div>
  );
});

// Toolbar button components
const MarkButton: React.FC<{ format: string; icon: string; label: string }> = ({ format, icon, label }) => {
  const editor = useSlate();
  
  return (
    <button
      className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
        isMarkActive(editor, format)
          ? 'bg-teal-100 text-teal-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
      title={label}
    >
      {icon}
    </button>
  );
};

const BlockButton: React.FC<{ format: string; icon: string; label: string }> = ({ format, icon, label }) => {
  const editor = useSlate();
  
  return (
    <button
      className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
        isBlockActive(editor, format, TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type')
          ? 'bg-teal-100 text-teal-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
      title={label}
    >
      {icon}
    </button>
  );
};

// Utility functions
const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);
  
  // Handle superscript/subscript mutual exclusivity
  if (format === 'superscript' || format === 'subscript') {
    // Remove both superscript and subscript first
    Editor.removeMark(editor, 'superscript');
    Editor.removeMark(editor, 'subscript');
    
    // Only add the new format if it wasn't already active
    if (!isActive) {
      Editor.addMark(editor, format, true);
    }
  } else {
    // Normal toggle behavior for other formats
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  }
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });

  const newProperties: Partial<SlateElement> = {
    ...(TEXT_ALIGN_TYPES.includes(format)
      ? { align: isActive ? undefined : (format as 'left' | 'center' | 'right' | 'justify') }
      : { type: isActive ? 'paragraph' : isList ? 'list-item' : format }),
  };

  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block as CustomElement);
  }
};

const isBlockActive = (editor: Editor, format: string, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType as keyof CustomElement] === format,
    })
  );

  return !!match;
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof typeof marks] === true : false;
};

export default TextEditor;
