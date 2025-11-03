'use client';

import { useEffect, useState } from 'react';
import { splitterRegistry } from '@/lib/splitters/registry';
import type { TextSplitterConfig } from '@/lib/splitters/types';

export interface UseTextSplitterOptions {
  text: string;
  splitterId: string;
  algorithm: string;
  config: TextSplitterConfig;
}

export interface UseTextSplitterResult {
  chunks: string[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * React hook for splitting text using registered text splitters
 * Handles async splitting and loading/error states
 * 
 * @param options Splitting options
 * @returns Chunks, loading state, and error
 * 
 * @example
 * ```tsx
 * const { chunks, isLoading, error } = useTextSplitter({
 *   text: 'my text',
 *   splitterId: 'chunkdown',
 *   algorithm: 'markdown',
 *   config: { chunkSize: 200 }
 * });
 * ```
 */
export function useTextSplitter({
  text,
  splitterId,
  algorithm,
  config,
}: UseTextSplitterOptions): UseTextSplitterResult {
  const [chunks, setChunks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const splitText = async () => {
      if (!text.trim()) {
        setChunks([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const splitter = splitterRegistry.get(splitterId);

        if (!splitter) {
          throw new Error(`Splitter not found: ${splitterId}`);
        }

        const result = await splitter.splitText(text, {
          ...config,
          algorithm,
        });

        setChunks(result);
      } catch (err) {
        console.error('Error splitting text:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setChunks([]);
      } finally {
        setIsLoading(false);
      }
    };

    splitText();
  }, [text, splitterId, algorithm, JSON.stringify(config)]);

  return { chunks, isLoading, error };
}
