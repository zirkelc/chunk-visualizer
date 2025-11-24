'use client';

import { useState, useEffect } from 'react';
import ChunkVisualizer from './ChunkVisualizer';
import { splitterRegistry } from '../libs/splitters/registry';
import type { TextSplitterConfig } from '../libs/splitters/types';
import { useTextSplitter } from '../hooks/useTextSplitter';
import { fromMarkdown, getContentSize } from '../libs/markdown';

interface Stats {
  inputCharacters: number;
  inputContentLength: number;
  outputCharacters: number;
  outputContentLength: number;
  numberOfChunks: number;
  minChunkSize: number;
  minContentSize: number;
  maxChunkSize: number;
  maxContentSize: number;
  avgChunkSize: number;
  avgContentSize: number;
}

interface ChunkVisualizerWithOptionsProps {
  text: string;
  splitterId: string;
  algorithm: string;
  config: TextSplitterConfig;
  onLibraryChange: (library: string) => void;
  onAlgorithmChange: (algorithm: string) => void;
  onConfigChange: (config: Partial<TextSplitterConfig>) => void;
  availableAlgorithms: readonly string[];
  onTooltipMouseEnter?: (e: React.MouseEvent<HTMLDivElement>, text: string) => void;
  onTooltipMouseLeave?: () => void;
}

export function ChunkVisualizerWithOptions({
  text,
  splitterId,
  algorithm,
  config,
  onLibraryChange,
  onAlgorithmChange,
  onConfigChange,
  availableAlgorithms,
  onTooltipMouseEnter,
  onTooltipMouseLeave,
}: ChunkVisualizerWithOptionsProps) {
  const [viewMode, setViewMode] = useState<'options' | 'stats' | 'none'>('options');
  const splitter = splitterRegistry.get(splitterId);
  const libraryName = splitter?.name || splitterId;

  // Use the text splitter hook to get chunks
  const { chunks } = useTextSplitter({
    text,
    splitterId,
    algorithm,
    config,
  });

  // Calculate stats from chunks
  const [stats, setStats] = useState<Stats>({
    inputCharacters: 0,
    inputContentLength: 0,
    outputCharacters: 0,
    outputContentLength: 0,
    numberOfChunks: 0,
    minChunkSize: 0,
    minContentSize: 0,
    maxChunkSize: 0,
    maxContentSize: 0,
    avgChunkSize: 0,
    avgContentSize: 0,
  });

  useEffect(() => {
    if (!text.trim() || chunks.length === 0) {
      setStats({
        inputCharacters: 0,
        inputContentLength: 0,
        outputCharacters: 0,
        outputContentLength: 0,
        numberOfChunks: 0,
        minChunkSize: 0,
        minContentSize: 0,
        maxChunkSize: 0,
        maxContentSize: 0,
        avgChunkSize: 0,
        avgContentSize: 0,
      });
      return;
    }

    const inputAst = fromMarkdown(text);
    const inputCharacters = text.length;
    const inputContentLength = getContentSize(inputAst);
    const outputCharacters = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const outputContentLength = chunks.reduce((sum, chunk) => {
      const chunkAst = fromMarkdown(chunk);
      return sum + getContentSize(chunkAst);
    }, 0);
    const numberOfChunks = chunks.length;

    const chunkSizes = chunks.map(c => c.length);
    const contentSizes = chunks.map(c => {
      const chunkAst = fromMarkdown(c);
      return getContentSize(chunkAst);
    });

    const minChunkSize = numberOfChunks > 0 ? Math.min(...chunkSizes) : 0;
    const maxChunkSize = numberOfChunks > 0 ? Math.max(...chunkSizes) : 0;
    const avgChunkSize = numberOfChunks > 0 ? Math.round(outputCharacters / numberOfChunks) : 0;

    const minContentSize = numberOfChunks > 0 ? Math.min(...contentSizes) : 0;
    const maxContentSize = numberOfChunks > 0 ? Math.max(...contentSizes) : 0;
    const avgContentSize = numberOfChunks > 0 ? Math.round(outputContentLength / numberOfChunks) : 0;

    setStats({
      inputCharacters,
      inputContentLength,
      outputCharacters,
      outputContentLength,
      numberOfChunks,
      minChunkSize,
      minContentSize,
      maxChunkSize,
      maxContentSize,
      avgChunkSize,
      avgContentSize,
    });
  }, [text, chunks]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
      {/* Header with Library and Stats buttons - Fixed at top */}
      <div className="flex items-center justify-between px-2 py-2 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Library Button */}
          <button
            onClick={() => setViewMode(viewMode === 'options' ? 'none' : 'options')}
            type="button"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors border ${
              viewMode === 'options'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
                : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Show library options"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{libraryName}</span>
          </button>

          {/* Stats Button */}
          <button
            onClick={() => setViewMode(viewMode === 'stats' ? 'none' : 'stats')}
            type="button"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors border ${
              viewMode === 'stats'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
                : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Show statistics"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Stats</span>
          </button>
        </div>

        {/* Minimize/Expand Button on the right */}
        <button
          onClick={() => setViewMode(viewMode === 'none' ? 'options' : 'none')}
          type="button"
          className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          title={viewMode === 'none' ? 'Expand' : 'Minimize'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {viewMode === 'none' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            )}
          </svg>
        </button>
      </div>

      {/* Scrollable container for options/stats and chunks */}
      <div className="flex-1 overflow-y-auto">
        {/* Library Options Section */}
        {viewMode === 'options' && (
          <>
            <div className="p-4 bg-white dark:bg-gray-800 space-y-4">
              {/* Library Picker */}
              <div>
                <label className="block text-sm font-medium mb-1 text-black dark:text-white">
                  Library
                </label>
                <select
                  value={splitterId}
                  onChange={(e) => onLibraryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-700"
                >
                  {splitterRegistry.getAll().map((s) => (
                    <option key={s.id} value={s.id} disabled={s.disabled}>
                      {s.name} v{s.version}{s.disabled ? ' (disabled)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Algorithm Picker */}
              <div>
                <label className="block text-sm font-medium mb-1 text-black dark:text-white">
                  Algorithm
                </label>
                <select
                  value={algorithm}
                  onChange={(e) => onAlgorithmChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-700"
                >
                  {availableAlgorithms.map((alg) => (
                    <option key={alg} value={alg}>
                      {alg.charAt(0).toUpperCase() + alg.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chunk Size Control */}
              <div>
                <label className="block text-sm font-medium mb-1 text-black dark:text-white">
                  Chunk Size: {config.chunkSize}
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="range"
                    min="1"
                    max="2000"
                    value={config.chunkSize}
                    onChange={(e) => onConfigChange({ chunkSize: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={config.chunkSize}
                    onChange={(e) => onConfigChange({ chunkSize: Number(e.target.value) })}
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-black dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>1</span>
                  <span>2000</span>
                </div>
              </div>

              {/* Chunkdown-specific: Max Overflow Ratio */}
              {splitterId === 'chunkdown' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-black dark:text-white">
                    Max Overflow: {config.maxOverflowRatio || 1.5}
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={config.maxOverflowRatio || 1.5}
                      onChange={(e) => onConfigChange({ maxOverflowRatio: Number(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <input
                      type="number"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={config.maxOverflowRatio || 1.5}
                      onChange={(e) => onConfigChange({ maxOverflowRatio: Number(e.target.value) })}
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-black dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>1.0</span>
                    <span>3.0</span>
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal Rule Separator */}
            <hr className="border-gray-300 dark:border-gray-600" />
          </>
        )}

        {/* Stats Section */}
        {viewMode === 'stats' && (
          <>
            <div className="p-4 bg-white dark:bg-gray-800">
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Input Length */}
                <div>
                  <div className="mb-2">
                    <div
                      className="text-xs text-black dark:text-white underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help mb-1"
                      onMouseEnter={(e) =>
                        onTooltipMouseEnter?.(
                          e,
                          'Original text length with markdown formatting, number in parentheses is content size without formatting',
                        )
                      }
                      onMouseLeave={onTooltipMouseLeave}
                    >
                      Input
                    </div>
                    <div className="font-bold text-black dark:text-white">
                      {stats.inputCharacters}{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        ({stats.inputContentLength})
                      </span>
                    </div>
                  </div>
                </div>
                {/* Output Length */}
                <div>
                  <div className="mb-2">
                    <div
                      className="text-xs text-black dark:text-white underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help mb-1"
                      onMouseEnter={(e) =>
                        onTooltipMouseEnter?.(
                          e,
                          'Combined length of all chunks with markdown formatting, number in parentheses is content size without formatting',
                        )
                      }
                      onMouseLeave={onTooltipMouseLeave}
                    >
                      Output
                    </div>
                    <div className="font-bold text-black dark:text-white">
                      {stats.outputCharacters}{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        ({stats.outputContentLength})
                      </span>
                    </div>
                  </div>
                </div>
                {/* Number of Chunks */}
                <div>
                  <div className="mb-2">
                    <div
                      className="text-xs text-black dark:text-white underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help mb-1"
                      onMouseEnter={(e) =>
                        onTooltipMouseEnter?.(
                          e,
                          'How many chunks the text was split into',
                        )
                      }
                      onMouseLeave={onTooltipMouseLeave}
                    >
                      Chunks
                    </div>
                    <div className="font-bold text-black dark:text-white text-lg">
                      {stats.numberOfChunks}
                    </div>
                  </div>
                </div>
                {/* Min Size */}
                <div>
                  <div className="mb-2">
                    <div
                      className="text-xs text-black dark:text-white underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help mb-1"
                      onMouseEnter={(e) =>
                        onTooltipMouseEnter?.(
                          e,
                          'Smallest chunk length with markdown formatting, number in parentheses is content size without formatting',
                        )
                      }
                      onMouseLeave={onTooltipMouseLeave}
                    >
                      Min Size
                    </div>
                    <div className="font-bold text-black dark:text-white">
                      {stats.minChunkSize}{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        ({stats.minContentSize})
                      </span>
                    </div>
                  </div>
                </div>
                {/* Max Size */}
                <div>
                  <div className="mb-2">
                    <div
                      className="text-xs text-black dark:text-white underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help mb-1"
                      onMouseEnter={(e) =>
                        onTooltipMouseEnter?.(
                          e,
                          'Largest chunk length with markdown formatting, number in parentheses is content size without formatting',
                        )
                      }
                      onMouseLeave={onTooltipMouseLeave}
                    >
                      Max Size
                    </div>
                    <div className="font-bold text-black dark:text-white">
                      {stats.maxChunkSize}{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        ({stats.maxContentSize})
                      </span>
                    </div>
                  </div>
                </div>
                {/* Avg Size */}
                <div>
                  <div className="mb-2">
                    <div
                      className="text-xs text-black dark:text-white underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help mb-1"
                      onMouseEnter={(e) =>
                        onTooltipMouseEnter?.(
                          e,
                          'Average chunk length with markdown formatting, number in parentheses is content size without formatting',
                        )
                      }
                      onMouseLeave={onTooltipMouseLeave}
                    >
                      Avg Size
                    </div>
                    <div className="font-bold text-black dark:text-white">
                      {stats.avgChunkSize}{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        ({stats.avgContentSize})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Rule Separator */}
            <hr className="border-gray-300 dark:border-gray-600" />
          </>
        )}

        {/* Chunk Visualization */}
        <div className="p-4">
          <ChunkVisualizer
            text={text}
            splitterId={splitterId}
            algorithm={algorithm}
            config={config}
          />
        </div>
      </div>
    </div>
  );
}
