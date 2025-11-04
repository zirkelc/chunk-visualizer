'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import ASTVisualizer from '../components/ASTVisualizer';
import ChunkVisualizer from '../components/ChunkVisualizer';
import Toast from '../components/Toast';
import { fromMarkdown, getContentSize } from '../libs/markdown';
import { splitterRegistry } from '../libs/splitters/registry';
import type { TextSplitterConfig } from '../libs/splitters/types';

const defaultText = `# AI SDK Core

Large Language Models (LLMs) are advanced programs that can understand, create, and engage with human language on a large scale.
They are trained on vast amounts of written material to recognize patterns in language and predict what might come next in a given piece of text.

AI SDK Core **simplifies working with LLMs by offering a standardized way of integrating them into your app** - so you can focus on building great AI applications for your users, not waste time on technical details.

For example, here's how you can generate text with various models using the AI SDK:

<PreviewSwitchProviders />

## AI SDK Core Functions

AI SDK Core has various functions designed for [text generation](./generating-text), [structured data generation](./generating-structured-data), and [tool usage](./tools-and-tool-calling).
These functions take a standardized approach to setting up [prompts](./prompts) and [settings](./settings), making it easier to work with different models.

- [\`generateText\`](/docs/ai-sdk-core/generating-text): Generates text and [tool calls](./tools-and-tool-calling).
  This function is ideal for non-interactive use cases such as automation tasks where you need to write text (e.g. drafting email or summarizing web pages) and for agents that use tools.
- [\`streamText\`](/docs/ai-sdk-core/generating-text): Stream text and tool calls.
  You can use the \`streamText\` function for interactive use cases such as [chat bots](/docs/ai-sdk-ui/chatbot) and [content streaming](/docs/ai-sdk-ui/completion).
- [\`generateObject\`](/docs/ai-sdk-core/generating-structured-data): Generates a typed, structured object that matches a [Zod](https://zod.dev/) schema.
  You can use this function to force the language model to return structured data, e.g. for information extraction, synthetic data generation, or classification tasks.
- [\`streamObject\`](/docs/ai-sdk-core/generating-structured-data): Stream a structured object that matches a Zod schema.
  You can use this function to [stream generated UIs](/docs/ai-sdk-ui/object-generation).

## API Reference

Please check out the [AI SDK Core API Reference](/docs/reference/ai-sdk-core) for more details on each function.`;

// Library and algorithm configurations
type Library = 'chunkdown' | 'langchain' | 'mastra';
type ChunkdownAlgorithm = 'markdown';
type LangchainAlgorithm = 'markdown' | 'character' | 'sentence';
type MastraAlgorithm = 'recursive' | 'character' | 'markdown';

// Get library configuration from registry
const libraryConfig = {
  chunkdown: {
    name: 'chunkdown',
    version: splitterRegistry.get('chunkdown')?.version || '1.4.1',
    algorithms: splitterRegistry.get('chunkdown')?.algorithms || (['markdown'] as const),
  },
  langchain: {
    name: '@langchain/textsplitters',
    version: splitterRegistry.get('langchain')?.version || '0.1.0',
    algorithms: splitterRegistry.get('langchain')?.algorithms || (['markdown', 'character', 'sentence'] as const),
  },
  mastra: {
    name: '@mastra/rag',
    version: splitterRegistry.get('mastra')?.version || '1.3.3',
    algorithms: splitterRegistry.get('mastra')?.algorithms || (['recursive', 'character', 'markdown'] as const),
  },
};

// Helper functions for URL state
const encodeText = (text: string) => {
  try {
    // eslint-disable-next-line deprecation/deprecation
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return '';
  }
};

const decodeText = (encoded: string) => {
  try {
    // eslint-disable-next-line deprecation/deprecation
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return '';
  }
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [text, setText] = useState(defaultText);
  const [library, setLibrary] = useState<Library>('chunkdown');
  const [chunkdownAlgorithm, setChunkdownAlgorithm] =
    useState<ChunkdownAlgorithm>('markdown');
  const [langchainAlgorithm, setLangchainAlgorithm] =
    useState<LangchainAlgorithm>('markdown');
  const [mastraAlgorithm, setMastraAlgorithm] =
    useState<MastraAlgorithm>('recursive');
  const [chunkSize, setChunkSize] = useState(200);
  const [astCollapsed, setAstCollapsed] = useState(false);
  const [maxOverflowRatio, setMaxOverflowRatio] = useState(1.5);
  const [isInitialized, setIsInitialized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'column' | 'row'>('row');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Section collapse states
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [astSectionCollapsed, setAstSectionCollapsed] = useState(false);
  const [chunksCollapsed, setChunksCollapsed] = useState(false);

  // Section order state
  type SectionId = 'library' | 'input' | 'ast' | 'chunks';
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(['library', 'input', 'ast', 'chunks']);

  // Chunks and statistics state
  const [chunks, setChunks] = useState<string[]>([]);
  const [stats, setStats] = useState({
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

  // Tooltip state for stats
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
  }>({ message: '', visible: false });

  // Load state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Load text
    const encodedText = params.get('text');
    if (encodedText) {
      const decodedText = decodeText(encodedText);
      if (decodedText) {
        setText(decodedText);
      }
    }

    // Load library
    const libParam = params.get('library');
    if (libParam && (libParam === 'chunkdown' || libParam === 'langchain' || libParam === 'mastra')) {
      setLibrary(libParam);
    }

    // Load algorithms
    const chunkdownAlg = params.get('chunkdownAlgorithm');
    if (chunkdownAlg === 'markdown') {
      setChunkdownAlgorithm(chunkdownAlg);
    }

    const langchainAlg = params.get('langchainAlgorithm');
    if (
      langchainAlg &&
      ['markdown', 'character', 'sentence'].includes(langchainAlg)
    ) {
      setLangchainAlgorithm(langchainAlg as LangchainAlgorithm);
    }

    const mastraAlg = params.get('mastraAlgorithm');
    if (
      mastraAlg &&
      ['recursive', 'character', 'markdown'].includes(mastraAlg)
    ) {
      setMastraAlgorithm(mastraAlg as MastraAlgorithm);
    }

    // Load chunk size
    const size = params.get('chunkSize');
    if (size) {
      const parsedSize = parseInt(size, 10);
      if (!isNaN(parsedSize) && parsedSize >= 1 && parsedSize <= 2000) {
        setChunkSize(parsedSize);
      }
    }

    // Load AST collapsed state
    const collapsed = params.get('astCollapsed');
    setAstCollapsed(collapsed === 'true');

    // Load section collapse states
    setLibraryCollapsed(params.get('libraryCollapsed') === 'true');
    setInputCollapsed(params.get('inputCollapsed') === 'true');
    setAstSectionCollapsed(params.get('astSectionCollapsed') === 'true');
    setChunksCollapsed(params.get('chunksCollapsed') === 'true');

    // Load section order
    const orderParam = params.get('sectionOrder');
    if (orderParam) {
      const order = orderParam.split(',') as SectionId[];
      // Validate order contains all sections
      if (order.length === 4 &&
          order.includes('library') &&
          order.includes('input') &&
          order.includes('ast') &&
          order.includes('chunks')) {
        setSectionOrder(order);
      }
    }

    // Load max overflow ratio
    const overflow = params.get('maxOverflow');
    if (overflow) {
      const ratio = parseFloat(overflow);
      if (!isNaN(ratio) && ratio >= 1.0 && ratio <= 3.0) {
        setMaxOverflowRatio(ratio);
      }
    }

    // Load layout mode
    const layout = params.get('layout');
    if (layout === 'column' || layout === 'row') {
      setLayoutMode(layout);
    }

    // Load theme or initialize from system preference
    const themeParam = params.get('theme');
    if (themeParam === 'light' || themeParam === 'dark') {
      setTheme(themeParam);
    } else {
      // Initialize from system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    }

    setIsInitialized(true);
  }, [searchParams]);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Calculate chunks and statistics
  useEffect(() => {
    const splitText = async () => {
      if (!text.trim()) {
        setChunks([]);
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

      let resultChunks: string[] = [];

      try {
        // Use the new splitter registry
        const splitter = splitterRegistry.get(library);
        if (!splitter) {
          throw new Error(`Splitter not found: ${library}`);
        }

        const algorithm = library === 'chunkdown' ? chunkdownAlgorithm :
                        library === 'mastra' ? mastraAlgorithm :
                        langchainAlgorithm;

        const config: TextSplitterConfig = {
          chunkSize,
          chunkOverlap: 0,
          algorithm,
          maxOverflowRatio, // For chunkdown
        };

        resultChunks = await splitter.splitText(text, config);

        setChunks(resultChunks);

        // Calculate statistics
        const inputAst = fromMarkdown(text);
        const inputCharacters = text.length;
        const inputContentLength = getContentSize(inputAst);
        const outputCharacters = resultChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const outputContentLength = resultChunks.reduce((sum, chunk) => {
          const chunkAst = fromMarkdown(chunk);
          return sum + getContentSize(chunkAst);
        }, 0);
        const numberOfChunks = resultChunks.length;

        const chunkSizes = resultChunks.map(c => c.length);
        const contentSizes = resultChunks.map(c => {
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
      } catch (error) {
        console.error('Error splitting text:', error);
        setChunks([]);
      }
    };

    splitText();
  }, [text, library, chunkSize, maxOverflowRatio, langchainAlgorithm, mastraAlgorithm]);

  // Update URL when state changes
  const updateURL = useCallback(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();

    // Always encode the current text
    if (text) {
      const encodedText = encodeText(text);
      // Check if encoded text would make URL too long (rough estimate)
      const estimatedUrlLength =
        window.location.origin.length +
        window.location.pathname.length +
        encodedText.length;

      // Chrome supports URLs up to ~32,767 characters
      if (estimatedUrlLength > 32_767) {
        setToast({
          message:
            'Text too large to include in URL. Share functionality limited.',
          visible: true,
        });
        setTimeout(() => {
          setToast({ message: '', visible: false });
        }, 4000);
        // Don't include text in URL if it's too long
      } else {
        params.set('text', encodedText);
      }
    }

    // Store library and algorithm
    if (library !== 'chunkdown') {
      params.set('library', library);
    }

    if (library === 'chunkdown' && chunkdownAlgorithm !== 'markdown') {
      params.set('chunkdownAlgorithm', chunkdownAlgorithm);
    }

    if (library === 'langchain' && langchainAlgorithm !== 'markdown') {
      params.set('langchainAlgorithm', langchainAlgorithm);
    }

    if (library === 'mastra' && mastraAlgorithm !== 'recursive') {
      params.set('mastraAlgorithm', mastraAlgorithm);
    }

    if (chunkSize !== 200) {
      params.set('chunkSize', chunkSize.toString());
    }

    if (astCollapsed) {
      params.set('astCollapsed', 'true');
    }

    // Store section collapse states
    if (libraryCollapsed) params.set('libraryCollapsed', 'true');
    if (inputCollapsed) params.set('inputCollapsed', 'true');
    if (astSectionCollapsed) params.set('astSectionCollapsed', 'true');
    if (chunksCollapsed) params.set('chunksCollapsed', 'true');

    // Store section order if different from default
    const defaultOrder = 'library,input,ast,chunks';
    const currentOrder = sectionOrder.join(',');
    if (currentOrder !== defaultOrder) {
      params.set('sectionOrder', currentOrder);
    }

    if (maxOverflowRatio !== 1.5) {
      params.set('maxOverflow', maxOverflowRatio.toString());
    }

    if (layoutMode !== 'row') {
      params.set('layout', layoutMode);
    }

    // Don't save theme to URL if it matches system default
    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemTheme = systemIsDark ? 'dark' : 'light';
    if (theme !== systemTheme) {
      params.set('theme', theme);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/';

    try {
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error('Failed to update URL:', error);
      setToast({
        message: 'URL too long error. Text sharing disabled.',
        visible: true,
      });
      setTimeout(() => {
        setToast({ message: '', visible: false });
      }, 4000);
    }
  }, [
    text,
    library,
    chunkdownAlgorithm,
    langchainAlgorithm,
    mastraAlgorithm,
    chunkSize,
    astCollapsed,
    maxOverflowRatio,
    layoutMode,
    theme,
    libraryCollapsed,
    inputCollapsed,
    astSectionCollapsed,
    chunksCollapsed,
    sectionOrder,
    isInitialized,
    router,
  ]);

  // Update URL when state changes (with debouncing for text)
  useEffect(() => {
    if (!isInitialized) return;

    // Always debounce text updates
    const timer = setTimeout(() => {
      updateURL();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [isInitialized, updateURL]);

  // Get current algorithm based on selected library
  const getCurrentAlgorithm = () => {
    if (library === 'chunkdown') return chunkdownAlgorithm;
    if (library === 'mastra') return mastraAlgorithm;
    return langchainAlgorithm;
  };

  // Get available algorithms for current library
  const getAvailableAlgorithms = () => {
    return libraryConfig[library].algorithms;
  };

  // Handle library change
  const handleLibraryChange = (newLibrary: Library) => {
    setLibrary(newLibrary);
  };

  // Handle algorithm change
  const handleAlgorithmChange = (algorithm: string) => {
    if (library === 'chunkdown') {
      setChunkdownAlgorithm(algorithm as ChunkdownAlgorithm);
    } else if (library === 'mastra') {
      setMastraAlgorithm(algorithm as MastraAlgorithm);
    } else {
      setLangchainAlgorithm(algorithm as LangchainAlgorithm);
    }
  };

  // Share functionality
  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);

      setToast({ message: 'URL copied to clipboard!', visible: true });

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast({ message: '', visible: false });
      }, 3000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setToast({ message: 'Failed to copy URL', visible: true });

      setTimeout(() => {
        setToast({ message: '', visible: false });
      }, 3000);
    }
  };

  // Move section left/right
  const moveSection = (sectionId: SectionId, direction: 'left' | 'right') => {
    const currentIndex = sectionOrder.indexOf(sectionId);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    // Check bounds
    if (newIndex < 0 || newIndex >= sectionOrder.length) return;

    const newOrder = [...sectionOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    setSectionOrder(newOrder);
  };

  // Check if section can move in a direction
  const canMove = (sectionId: SectionId, direction: 'left' | 'right') => {
    const currentIndex = sectionOrder.indexOf(sectionId);
    if (direction === 'left') return currentIndex > 0;
    return currentIndex < sectionOrder.length - 1;
  };

  // Get order index for a section
  const getSectionOrder = (sectionId: SectionId) => {
    return sectionOrder.indexOf(sectionId);
  };

  // Tooltip handlers for stats
  const handleTooltipMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    text: string,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleTooltipMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 py-4 font-mono flex flex-col overflow-hidden">
      <div className="max-w-[2400px] mx-auto px-4 w-full flex flex-col h-full">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
          {/* Buttons Row - Always on top on small screens */}
          <div className="flex items-center justify-between mb-2 md:mb-2">
            {/* Left: Layout Toggle */}
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setLayoutMode('row')}
                type="button"
                title="Stack layout (4 rows)"
                className={`p-2 transition-colors ${
                  layoutMode === 'row'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setLayoutMode('column')}
                type="button"
                title="Column layout (4 columns)"
                className={`p-2 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  layoutMode === 'column'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M15 4v16" />
                </svg>
              </button>
            </div>

            {/* Right: Theme, GitHub, Share */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                type="button"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                {theme === 'light' ? (
                  <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-sm font-medium">Light</span>
                  </>
                  ) : (
                  <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-sm font-medium">Dark</span>
                  </>
                )}

              </button>

              {/* Theme Toggle Icon Only (mobile) */}
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                type="button"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="sm:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                {theme === 'light' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </>
                )}

              </button>

              {/* GitHub Button */}
              <a
                href="https://github.com/zirkelc/chunk-visualizer"
                target="_blank"
                rel="noopener noreferrer"
                title="View source code on GitHub"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">GitHub</span>
              </a>

              {/* GitHub Icon Only (mobile) */}
              <a
                href="https://github.com/zirkelc/chunk-visualizer"
                target="_blank"
                rel="noopener noreferrer"
                title="View source code on GitHub"
                className="sm:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>

              {/* Share Button */}
              <button
                onClick={handleShare}
                type="button"
                title="Copy shareable URL to clipboard"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                <span className="text-sm font-medium">Share</span>
              </button>

              {/* Share Icon Only (mobile) */}
              <button
                onClick={handleShare}
                type="button"
                title="Copy shareable URL to clipboard"
                className="sm:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Title Row */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 text-black dark:text-white">
              Chunk Visualizer
            </h1>
            <p className="text-black dark:text-gray-300">
              Visual comparison of text chunking algorithms from various libraries
            </p>
          </div>
        </div>

        {/* Main Content - Toggle between Column and Row Layout */}
        <div className={layoutMode === 'column' ? 'flex gap-4 flex-1 min-h-0' : 'flex flex-col gap-4 flex-1 overflow-y-auto'}>
          {/* Library - First Column/Row */}
          <div className={`${layoutMode === 'column' ? (libraryCollapsed ? 'flex flex-col min-h-0 w-12 flex-shrink-0' : 'flex flex-col min-h-0 flex-1') : 'w-full flex-shrink-0'} ${
            libraryCollapsed && layoutMode === 'row' ? 'h-12' : ''
          }`} style={{ order: getSectionOrder('library') }}>
            {!libraryCollapsed && (
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-black dark:text-white">
                    Library
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSection('library', 'left')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move left' : 'Move up'}
                      disabled={!canMove('library', 'left')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSection('library', 'right')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move right' : 'Move down'}
                      disabled={!canMove('library', 'right')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setLibraryCollapsed(!libraryCollapsed)}
                  type="button"
                  title={libraryCollapsed ? 'Expand' : 'Collapse'}
                  className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {libraryCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    )}
                  </svg>
                </button>
              </div>
            )}
            {libraryCollapsed ? (
              <div
                className={`bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  layoutMode === 'column' ? 'h-full items-start justify-center pt-4' : 'h-12 items-center justify-center'
                }`}
                onClick={() => setLibraryCollapsed(false)}
              >
                <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${
                  layoutMode === 'column' ? 'writing-mode-vertical transform -rotate-180' : ''
                }`} style={layoutMode === 'column' ? { writingMode: 'vertical-rl' } : {}}>
                  Library
                </span>
              </div>
            ) : (
              <div className={`bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-y-auto ${
                layoutMode === 'column' ? 'flex-1 min-h-0' : 'h-auto'
              }`}>
              {/* Library Picker */}
              <div className="mb-4">
                <label
                  htmlFor="library-picker"
                  className="block text-sm font-medium mb-1 text-black dark:text-white"
                >
                  Library
                </label>
                <select
                  id="library-picker"
                  value={library}
                  onChange={(e) =>
                    handleLibraryChange(e.target.value as Library)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-700"
                >
                  {splitterRegistry.getAll().map((splitter) => (
                    <option key={splitter.id} value={splitter.id} disabled={splitter.disabled}>
                      {splitter.name} v{splitter.version}{splitter.disabled ? ' (disabled)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Algorithm Picker */}
              <div className="mb-4">
                <label
                  htmlFor="algorithm-picker"
                  className="block text-sm font-medium mb-1 text-black dark:text-white"
                >
                  Algorithm
                </label>
                <select
                  id="algorithm-picker"
                  value={getCurrentAlgorithm()}
                  onChange={(e) => handleAlgorithmChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-700"
                >
                  {getAvailableAlgorithms().map((alg) => (
                    <option key={alg} value={alg}>
                      {alg.charAt(0).toUpperCase() + alg.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chunk Size Control */}
              <div className="mb-4">
                <label
                  htmlFor="chunk-size"
                  className="block text-sm font-medium mb-1 text-black dark:text-white"
                >
                  Chunk Size: {chunkSize}
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    id="chunk-size"
                    type="range"
                    min="1"
                    max="2000"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-black dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>1</span>
                  <span>2000</span>
                </div>
              </div>

              {/* Chunkdown-specific: Max Overflow Ratio */}
              {library === 'chunkdown' && (
                <div className="mb-4">
                  <label
                    htmlFor="max-overflow"
                    className="block text-sm font-medium mb-1 text-black dark:text-white"
                  >
                    Max Overflow: {maxOverflowRatio}
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      id="max-overflow"
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={maxOverflowRatio}
                      onChange={(e) =>
                        setMaxOverflowRatio(Number(e.target.value))
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <input
                      type="number"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={maxOverflowRatio}
                      onChange={(e) =>
                        setMaxOverflowRatio(Number(e.target.value))
                      }
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-black dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>1.0</span>
                    <span>3.0</span>
                  </div>
                </div>
                )}

                {/* Separator */}
                <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>

                {/* Statistics */}
                <div>
                  <label className="block text-sm font-medium mb-3 text-black dark:text-white">
                    Statistics
                  </label>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {/* Input Length */}
                    <div>
                      <div className="mb-2">
                        <div
                          className="text-xs text-black dark:text-white underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help mb-1"
                          onMouseEnter={(e) =>
                            handleTooltipMouseEnter(
                              e,
                              'Original text length with markdown formatting, number in parentheses is content size without formatting',
                            )
                          }
                          onMouseLeave={handleTooltipMouseLeave}
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
                            handleTooltipMouseEnter(
                              e,
                              'Combined length of all chunks with markdown formatting, number in parentheses is content size without formatting',
                            )
                          }
                          onMouseLeave={handleTooltipMouseLeave}
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
                            handleTooltipMouseEnter(
                              e,
                              'How many chunks the text was split into',
                            )
                          }
                          onMouseLeave={handleTooltipMouseLeave}
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
                            handleTooltipMouseEnter(
                              e,
                              'Smallest chunk length with markdown formatting, number in parentheses is content size without formatting',
                            )
                          }
                          onMouseLeave={handleTooltipMouseLeave}
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
                            handleTooltipMouseEnter(
                              e,
                              'Largest chunk length with markdown formatting, number in parentheses is content size without formatting',
                            )
                          }
                          onMouseLeave={handleTooltipMouseLeave}
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
                            handleTooltipMouseEnter(
                              e,
                              'Average chunk length with markdown formatting, number in parentheses is content size without formatting',
                            )
                          }
                          onMouseLeave={handleTooltipMouseLeave}
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
              </div>
            )}
          </div>
          {/* Input */}
          <div className={`${layoutMode === 'column' ? (inputCollapsed ? 'flex flex-col min-h-0 w-12 flex-shrink-0' : 'flex flex-col min-h-0 flex-1') : 'w-full flex-shrink-0'} ${
            inputCollapsed && layoutMode === 'row' ? 'h-12' : ''
          }`} style={{ order: getSectionOrder('input') }}>
            {!inputCollapsed && (
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="text-input"
                    className="text-sm font-bold text-black dark:text-white"
                  >
                    Input
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSection('input', 'left')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move left' : 'Move up'}
                      disabled={!canMove('input', 'left')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSection('input', 'right')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move right' : 'Move down'}
                      disabled={!canMove('input', 'right')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setInputCollapsed(!inputCollapsed)}
                  type="button"
                  title={inputCollapsed ? 'Expand' : 'Collapse'}
                  className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {inputCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    )}
                  </svg>
                </button>
              </div>
            )}
            {inputCollapsed ? (
              <div
                className={`bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  layoutMode === 'column' ? 'h-full items-start justify-center pt-4' : 'h-12 items-center justify-center'
                }`}
                onClick={() => setInputCollapsed(false)}
              >
                <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${
                  layoutMode === 'column' ? 'writing-mode-vertical transform -rotate-180' : ''
                }`} style={layoutMode === 'column' ? { writingMode: 'vertical-rl' } : {}}>
                  Input
                </span>
              </div>
            ) : (
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-black dark:text-white bg-white dark:bg-gray-800 ${
                  layoutMode === 'column' ? 'flex-1 min-h-0' : 'h-[400px]'
                }`}
                placeholder="Enter your text here..."
              />
            )}
          </div>

          {/* AST Visualization */}
          <div className={`${layoutMode === 'column' ? (astSectionCollapsed ? 'flex flex-col min-h-0 w-12 flex-shrink-0' : 'flex flex-col min-h-0 flex-1') : 'w-full flex-shrink-0'} ${
            astSectionCollapsed && layoutMode === 'row' ? 'h-12' : ''
          }`} style={{ order: getSectionOrder('ast') }}>
            {!astSectionCollapsed && (
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="ast-view-mode"
                    className="text-sm font-bold text-black dark:text-white"
                  >
                    Markdown AST
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSection('ast', 'left')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move left' : 'Move up'}
                      disabled={!canMove('ast', 'left')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSection('ast', 'right')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move right' : 'Move down'}
                      disabled={!canMove('ast', 'right')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setAstSectionCollapsed(!astSectionCollapsed)}
                  type="button"
                  title={astSectionCollapsed ? 'Expand' : 'Collapse'}
                  className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {astSectionCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    )}
                  </svg>
                </button>
              </div>
            )}
            {astSectionCollapsed ? (
              <div
                className={`bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  layoutMode === 'column' ? 'h-full items-start justify-center pt-4' : 'h-12 items-center justify-center'
                }`}
                onClick={() => setAstSectionCollapsed(false)}
              >
                <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${
                  layoutMode === 'column' ? 'writing-mode-vertical transform -rotate-180' : ''
                }`} style={layoutMode === 'column' ? { writingMode: 'vertical-rl' } : {}}>
                  Markdown AST
                </span>
              </div>
            ) : (
              <div className={`relative ${layoutMode === 'column' ? 'flex-1 min-h-0' : 'h-[400px]'}`}>
                {/* Collapse/Expand Button for tree content */}
                <button
                  onClick={() => setAstCollapsed(!astCollapsed)}
                  type="button"
                  title={astCollapsed ? 'Expand tree' : 'Collapse tree'}
                  className="absolute top-2 right-6 p-1.5 bg-white/70 dark:bg-gray-700/70 border border-gray-300/70 dark:border-gray-600/70 text-gray-700 dark:text-gray-200 rounded hover:bg-white dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-all z-10 shadow-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {astCollapsed ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    )}
                  </svg>
                </button>
                <ASTVisualizer text={text} collapseAll={astCollapsed} />
              </div>
            )}
          </div>

          {/* Chunks */}
          <div className={`${layoutMode === 'column' ? (chunksCollapsed ? 'flex flex-col min-h-0 w-12 flex-shrink-0' : 'flex flex-col min-h-0 flex-1') : 'w-full flex-shrink-0'} ${
            chunksCollapsed && layoutMode === 'row' ? 'h-12' : ''
          }`} style={{ order: getSectionOrder('chunks') }}>
            {!chunksCollapsed && (
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-black dark:text-white">
                    Chunks
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSection('chunks', 'left')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move left' : 'Move up'}
                      disabled={!canMove('chunks', 'left')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSection('chunks', 'right')}
                      type="button"
                      title={layoutMode === 'column' ? 'Move right' : 'Move down'}
                      disabled={!canMove('chunks', 'right')}
                      className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {layoutMode === 'column' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setChunksCollapsed(!chunksCollapsed)}
                  type="button"
                  title={chunksCollapsed ? 'Expand' : 'Collapse'}
                  className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {chunksCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    )}
                  </svg>
                </button>
              </div>
            )}
            {chunksCollapsed ? (
              <div
                className={`bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  layoutMode === 'column' ? 'h-full items-start justify-center pt-4' : 'h-12 items-center justify-center'
                }`}
                onClick={() => setChunksCollapsed(false)}
              >
                <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${
                  layoutMode === 'column' ? 'writing-mode-vertical transform -rotate-180' : ''
                }`} style={layoutMode === 'column' ? { writingMode: 'vertical-rl' } : {}}>
                  Chunks
                </span>
              </div>
            ) : (
              <div className={layoutMode === 'column' ? 'flex-1 min-h-0' : ''}>
                <ChunkVisualizer
                  text={text}
                  splitterId={library}
                  algorithm={getCurrentAlgorithm()}
                  config={{
                    chunkSize,
                    chunkOverlap: 0,
                    maxOverflowRatio,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        <Toast message={toast.message} visible={toast.visible} />

        {/* Tooltip for Statistics */}
        {tooltip && (
          <div
            className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg max-w-xs pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-8 font-mono">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2 text-black">
                Chunk Visualizer
              </h1>
              <p className="text-black">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
