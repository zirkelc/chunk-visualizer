'use client';

import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTextSplitter } from '../hooks/useTextSplitter';
import { fromMarkdown, getContentSize } from '../libs/markdown';
import type { TextSplitterConfig } from '../libs/splitters/types';
import Toast from './Toast';

interface ChunkVisualizerProps {
  text: string;
  splitterId: string;
  algorithm: string;
  config: TextSplitterConfig;
  showTokens?: boolean;
}

function ChunkVisualizer({
  text,
  splitterId,
  algorithm,
  config,
  showTokens = false,
}: ChunkVisualizerProps) {
  // Use the new hook for text splitting
  const { chunks } = useTextSplitter({
    text,
    splitterId,
    algorithm,
    config,
  });

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

  // Tokenized chunks state
  const [tokenizedChunks, setTokenizedChunks] = useState<string[][]>([]);
  const [isTokenizing, setIsTokenizing] = useState(false);

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

  const colors = generateColors(chunks.length);

  // Tokenize chunks when showTokens is enabled
  useEffect(() => {
    if (!showTokens || chunks.length === 0) {
      setTokenizedChunks([]);
      setIsTokenizing(false);
      return;
    }

    const tokenizeAllChunks = async () => {
      setIsTokenizing(true);
      const results: string[][] = [];
      for (const chunk of chunks) {
        const tokens = await tokenizeChunk(chunk);
        results.push(tokens);
      }
      setTokenizedChunks(results);
      setIsTokenizing(false);
    };

    tokenizeAllChunks();
  }, [showTokens, chunks]);

  // Tokenize a chunk of text using tiktoken
  const tokenizeChunk = async (chunk: string): Promise<string[]> => {
    try {
      // Dynamically import tiktoken to avoid loading WASM module on initial render
      const { get_encoding } = await import('tiktoken');
      const encoding = get_encoding('cl100k_base'); // GPT-4 encoding
      const tokenIds = encoding.encode(chunk);
      const tokenStrings: string[] = [];

      for (let i = 0; i < tokenIds.length; i++) {
        const decodedBytes = encoding.decode(new Uint32Array([tokenIds[i]]));
        const decoded = new TextDecoder().decode(decodedBytes);
        tokenStrings.push(decoded);
      }

      encoding.free();
      return tokenStrings;
    } catch (error) {
      console.error('Error tokenizing chunk:', error);
      // Fallback: return the chunk as a single token
      return [chunk];
    }
  };

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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Chunk Visualization */}
      <div
        ref={visualizationRef}
        className="flex-1 overflow-y-auto relative"
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
      >
        {/* Copy Chunks Button */}
        {chunks.length > 0 && (
          <button
            type="button"
            onClick={handleCopyChunks}
            className="absolute top-0 right-0 p-1.5 bg-white/70 dark:bg-gray-700/70 border border-gray-300/70 dark:border-gray-600/70 text-gray-700 dark:text-gray-200 rounded hover:bg-white dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-all z-10 shadow-sm"
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
            {isTokenizing && showTokens && (
              <div className="absolute top-12 right-12 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                Tokenizing...
              </div>
            )}
            {chunks.map((chunk, index) => {
              if (showTokens && tokenizedChunks[index]) {
                // Visualize tokens with borders and alternating shades
                const tokens = tokenizedChunks[index];
                return (
                  <span
                    key={`${index}`}
                    className={`${colors[index]}`}
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {tokens.map((token, tokenIndex) => (
                      <span
                        key={`${index}-${tokenIndex}`}
                        style={{
                          borderRight:
                            tokenIndex < tokens.length - 1
                              ? '1px solid rgba(0, 0, 0, 0.3)'
                              : 'none',
                          paddingRight:
                            tokenIndex < tokens.length - 1 ? '1px' : '0',
                          whiteSpace: 'pre-wrap',
                          backgroundColor:
                            tokenIndex % 2 === 0
                              ? 'rgba(0, 0, 0,  0.05)'
                              : 'rgba(255, 255, 255, 0.15)',
                        }}
                      >
                        {token}
                      </span>
                    ))}
                  </span>
                );
              }

              // Normal chunk visualization without tokens
              return (
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
              );
            })}
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
              {selection.text.length} chars (
              {getContentSize(fromMarkdown(selection.text))} content)
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
