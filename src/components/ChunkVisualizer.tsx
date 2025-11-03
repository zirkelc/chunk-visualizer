'use client';

import {
  CharacterTextSplitter,
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
  type TextSplitter,
} from '@langchain/textsplitters';
import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {chunkdown} from 'chunkdown';
import { fromMarkdown, getContentSize } from '../libs/markdown';
import Toast from './Toast';

interface ChunkVisualizerProps {
  text: string;
  chunkSize: number;
  splitterType?: 'markdown' | 'character' | 'langchain-markdown';
  maxOverflowRatio?: number;
  langchainSplitterType?: 'markdown' | 'character' | 'sentence';
  experimentalTableHeaders?: boolean;
}

function ChunkVisualizer({
  text,
  chunkSize,
  splitterType = 'markdown',
  maxOverflowRatio = 1.5,
  langchainSplitterType = 'markdown',
}: ChunkVisualizerProps) {
  const [chunks, setChunks] = useState<string[]>([]);

  // Toast state for copy feedback
  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
  }>({ message: '', visible: false });

  // Selection tooltip state
  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const visualizationRef = useRef<HTMLDivElement>(null);



  // Use the provided chunk size directly
  const effectiveChunkSize = chunkSize;

  // Generate colors for chunks
  const generateColors = (count: number): string[] => {
    const colors = [
      'bg-blue-200 text-black',
      'bg-green-200 text-black',
      'bg-yellow-200 text-black',
      'bg-pink-200 text-black',
      'bg-purple-200 text-black',
      'bg-indigo-200 text-black',
      'bg-red-200 text-black',
      'bg-orange-200 text-black',
      'bg-teal-200 text-black',
      'bg-cyan-200 text-black',
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  useEffect(() => {
    const splitText = async () => {
      if (!text.trim()) {
        setChunks([]);
        return;
      }

      try {
        let newChunks: string[];

        if (splitterType === 'character') {
          // Simple character-based splitting
          newChunks = [];
          for (let i = 0; i < text.length; i += effectiveChunkSize) {
            newChunks.push(text.slice(i, i + effectiveChunkSize));
          }
        } else if (splitterType === 'langchain-markdown') {
          // LangChain splitters based on type
          let splitter: TextSplitter;

          if (langchainSplitterType === 'markdown') {
            splitter = new MarkdownTextSplitter({
              chunkSize: effectiveChunkSize,
              chunkOverlap: 0,
            });
          } else if (langchainSplitterType === 'character') {
            splitter = new CharacterTextSplitter({
              chunkSize: effectiveChunkSize,
              chunkOverlap: 0,
            });
          } else {
            // sentence
            splitter = new RecursiveCharacterTextSplitter({
              chunkSize: effectiveChunkSize,
              chunkOverlap: 0,
              separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
            });
          }

          newChunks = await splitter.splitText(text);
        } else {
          const splitter = chunkdown({
            chunkSize: effectiveChunkSize,
            maxOverflowRatio: maxOverflowRatio,
          });
          newChunks = splitter.splitText(text);
        }

        setChunks(newChunks);
      } catch (error) {
        console.error('Error splitting text:', error);
        setChunks([]);
      }
    };

    splitText();
  }, [
    text,
    effectiveChunkSize,
    splitterType,
    maxOverflowRatio,
    langchainSplitterType,
  ]);

  const colors = generateColors(chunks.length);

  // Handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelection(null);
      return;
    }

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Use viewport coordinates for fixed positioning
    const x = rect.left + rect.width / 2;
    const y = rect.top - 10; // 10px above selection

    setSelection({
      text: selectedText,
      x,
      y,
    });
  };

  // Clear selection when clicking outside
  const handleMouseDown = (e: MouseEvent) => {
    // Check if clicking on the tooltip itself
    const target = e.target as HTMLElement;
    if (!target.closest('.selection-tooltip')) {
      setSelection(null);
    }
  };

  // Monitor for selection changes globally
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setSelection(null);
      }
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);



  // Handle copy chunks to clipboard
  const handleCopyChunks = async () => {
    try {
      const chunksJson = JSON.stringify(chunks, null, 2);
      await navigator.clipboard.writeText(chunksJson);

      setToast({ message: 'Chunks copied to clipboard!', visible: true });

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast({ message: '', visible: false });
      }, 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(chunks, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      setToast({ message: 'Chunks copied to clipboard!', visible: true });

      setTimeout(() => {
        setToast({ message: '', visible: false });
      }, 3000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chunk Visualization */}
      <div
        ref={visualizationRef}
        className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex-1 relative overflow-y-auto"
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
      >
        {/* Copy Chunks Button */}
        {chunks.length > 0 && (
          <button
            type="button"
            onClick={handleCopyChunks}
            className="absolute top-2 right-2 p-1.5 bg-white/70 dark:bg-gray-700/70 border border-gray-300/70 dark:border-gray-600/70 text-gray-700 dark:text-gray-200 rounded hover:bg-white dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-all z-10 shadow-sm"
            title="Copy chunks as JSON array"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        )}
        {chunks.length > 0 ? (
          <div className="leading-relaxed text-sm font-mono">
            {chunks.map((chunk, index) => (
              <span
                key={`${index}`}
                className={`${colors[index]} px-1 py-0.5`}
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {chunk}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 dark:text-gray-500 text-center py-8">
            Enter some text to see the chunks visualization
          </div>
        )}

        {/* Selection Tooltip */}
        {selection && (
          <div
            className="selection-tooltip fixed z-50 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
            style={{
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="whitespace-nowrap">
              {selection.text.length} chars ({getContentSize(fromMarkdown(selection.text))}{' '}
              content)
            </div>
            <div
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
              style={{
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '4px solid rgb(55 65 81)',
              }}
            />
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

export default ChunkVisualizer;
