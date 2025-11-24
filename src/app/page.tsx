'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import ChunkVisualizer from '../components/ChunkVisualizer';
import { ChunkVisualizerWithOptions } from '../components/ChunkVisualizerWithOptions';
import InputWithAST from '../components/InputWithAST';
import { Container } from '../components/Container';
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

// Comparison panel configuration
interface ComparisonPanel {
  id: string;
  library: Library;
  chunkdownAlgorithm: ChunkdownAlgorithm;
  langchainAlgorithm: LangchainAlgorithm;
  mastraAlgorithm: MastraAlgorithm;
  chunkSize: number;
  maxOverflowRatio: number;
  collapsed?: boolean;
}

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
  const [layoutMode, setLayoutMode] = useState<'column' | 'row'>('column');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Comparison panels state
  const [comparisonPanels, setComparisonPanels] = useState<ComparisonPanel[]>([]);

  // Section collapse states
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [chunksCollapsed, setChunksCollapsed] = useState(false);

  // Toggleable section visibility states
  const [statsVisible, setStatsVisible] = useState(false);
  const [libraryOptionsVisible, setLibraryOptionsVisible] = useState(true);

  // Section order state - now includes comparison panels
  type SectionId = 'input' | 'chunks' | string; // string for panel IDs
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(['input', 'chunks']);

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
    setInputCollapsed(params.get('inputCollapsed') === 'true');
    setChunksCollapsed(params.get('chunksCollapsed') === 'true');

    // Load toggleable section visibility states
    setStatsVisible(params.get('statsVisible') === 'true');
    setLibraryOptionsVisible(params.get('libraryOptionsVisible') !== 'false'); // Default true

    // Load section order
    const orderParam = params.get('sectionOrder');
    if (orderParam) {
      const order = orderParam.split(',') as SectionId[];
      // Validate order contains at least input and chunks
      if (order.length >= 2 &&
          order.includes('input') &&
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

    // Load theme or initialize to light
    const themeParam = params.get('theme');
    if (themeParam === 'light' || themeParam === 'dark') {
      setTheme(themeParam);
    } else {
      // Default to light theme
      setTheme('light');
    }

    // Load comparison panels
    const comparisonData = params.get('comparison');
    if (comparisonData) {
      try {
        const panels = JSON.parse(decodeURIComponent(comparisonData)) as ComparisonPanel[];
        setComparisonPanels(panels);
        
        // Add panel IDs to section order if not already present (for backward compatibility)
        const loadedOrder = orderParam ? orderParam.split(',') as SectionId[] : ['input', 'chunks'];
        const panelIds = panels.map(p => p.id);
        const missingPanelIds = panelIds.filter(id => !loadedOrder.includes(id));
        if (missingPanelIds.length > 0) {
          setSectionOrder([...loadedOrder, ...missingPanelIds]);
        }
      } catch (e) {
        console.error('Failed to parse comparison panels:', e);
      }
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
    if (inputCollapsed) params.set('inputCollapsed', 'true');
    if (chunksCollapsed) params.set('chunksCollapsed', 'true');

    // Store toggleable section visibility states
    if (statsVisible) params.set('statsVisible', 'true');
    if (!libraryOptionsVisible) params.set('libraryOptionsVisible', 'false'); // Only store if false (default is true)

    // Store section order if different from default
    const defaultOrder = 'input,chunks';
    const currentOrder = sectionOrder.join(',');
    if (currentOrder !== defaultOrder) {
      params.set('sectionOrder', currentOrder);
    }

    if (maxOverflowRatio !== 1.5) {
      params.set('maxOverflow', maxOverflowRatio.toString());
    }

    if (layoutMode !== 'column') {
      params.set('layout', layoutMode);
    }

    // Don't save theme to URL if it's the default (light)
    if (theme !== 'light') {
      params.set('theme', theme);
    }

    // Store comparison panels
    if (comparisonPanels.length > 0) {
      params.set('comparison', encodeURIComponent(JSON.stringify(comparisonPanels)));
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
    inputCollapsed,
    chunksCollapsed,
    statsVisible,
    libraryOptionsVisible,
    sectionOrder,
    comparisonPanels,
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
    const splitter = splitterRegistry.get(library);
    return splitter?.algorithms || [];
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

  // Comparison panel management
  const addComparisonPanel = () => {
    // Find next available library that's not in use
    const availableLibraries = splitterRegistry.getAll().filter(s => !s.disabled).map(s => s.id as Library);
    const usedLibraries = new Set([library, ...comparisonPanels.map(p => p.library)]);
    const nextLibrary = availableLibraries.find(lib => !usedLibraries.has(lib)) || availableLibraries[0];
    
    const newPanel: ComparisonPanel = {
      id: `panel-${Date.now()}`,
      library: nextLibrary,
      chunkdownAlgorithm: 'markdown',
      langchainAlgorithm: 'markdown',
      mastraAlgorithm: 'recursive',
      chunkSize: 200,
      maxOverflowRatio: 1.5,
    };
    
    setComparisonPanels([...comparisonPanels, newPanel]);
    // Add to section order at the end
    setSectionOrder([...sectionOrder, newPanel.id]);
  };
  
  const removeComparisonPanel = (panelId: string) => {
    setComparisonPanels(comparisonPanels.filter(p => p.id !== panelId));
    // Remove from section order
    setSectionOrder(sectionOrder.filter(id => id !== panelId));
  };
  
  const updateComparisonPanel = (panelId: string, updates: Partial<ComparisonPanel>) => {
    setComparisonPanels(comparisonPanels.map(p => 
      p.id === panelId ? { ...p, ...updates } : p
    ));
  };



  return (
    <div className="bg-gray-50 dark:bg-gray-900 font-mono flex flex-col h-screen overflow-hidden">
      <div className="max-w-[2400px] mx-auto px-4 py-4 w-full flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
          {/* Header - Inline on large screens, stacked on small screens */}
          <div className="lg:grid lg:grid-cols-3 lg:items-center mb-4">
            {/* Mobile: Buttons Row */}
            <div className="flex items-center justify-between gap-2 mb-4 lg:hidden">
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

              {/* Right buttons - icons only on mobile */}
              <div className="flex items-center gap-2">
                {/* Theme Toggle Icon Only (mobile) */}
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  type="button"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  {theme === 'light' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                {/* GitHub Icon Only (mobile) */}
                <a
                  href="https://github.com/zirkelc/chunk-visualizer"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View source code on GitHub"
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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

                {/* Share Icon Only (mobile) */}
                <button
                  onClick={handleShare}
                  type="button"
                  title="Copy shareable URL to clipboard"
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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

            {/* Large screen: Left */}
            <div className="hidden lg:flex items-center gap-2 lg:justify-start">
              {/* Layout Toggle */}
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


            </div>

            {/* Center: Title (hidden on mobile, shown inline on large screens) */}
            <div className="hidden lg:flex justify-center items-center">
              <h1 className="text-4xl font-bold text-black dark:text-white">
                Chunk Visualizer
              </h1>
            </div>

            {/* Right: Theme, GitHub, Share */}
            <div className="flex items-center gap-2 lg:justify-end">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                type="button"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                className="hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                className="hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                className="hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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

          {/* Title Row (mobile and tablet - stacked below buttons) */}
          <div className="block lg:hidden text-center mb-4">
            <h1 className="text-4xl font-bold mb-2 text-black dark:text-white">
              Chunk Visualizer
            </h1>
            <p className="text-sm text-black dark:text-gray-300">
              Visual comparison of text chunking algorithms from various libraries.
            </p>
            <p className="text-sm text-black dark:text-gray-300">
              Missing a library? Send a pull request to <a href="https://github.com/zirkelc/chunk-visualizer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub</a>.
            </p>
          </div>

          {/* Description (large screens only - below inline header) */}
          <div className="hidden lg:block text-center mb-4">
            <p className="text-sm text-black dark:text-gray-300">
              Visual comparison of text chunking algorithms from various libraries.
            </p>
            <p className="text-sm text-black dark:text-gray-300">
              Missing a library? Send a pull request to <a href="https://github.com/zirkelc/chunk-visualizer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub</a>.
            </p>
          </div>
        </div>

        {/* Main Content - Toggle between Column and Row Layout */}
        <div className={layoutMode === 'column' ?
          'flex gap-4 flex-1 min-h-0 overflow-hidden'
          : 'flex-1 min-h-0 overflow-hidden'}>
          <div className={layoutMode === 'row' ? 'flex flex-col gap-4 h-full overflow-y-auto' : layoutMode === 'column' ? 'flex gap-4 flex-1 min-h-0 overflow-x-auto w-full' : 'contents'}>
          {/* Input */}
          <div
            className={layoutMode === 'column' && !inputCollapsed ?
              'flex-1 min-w-[400px] min-h-0 overflow-hidden'
              : layoutMode === 'row' && !inputCollapsed ? 'flex-1 min-h-[400px] overflow-hidden' : ''}
            style={{ order: getSectionOrder('input') }}
          >
            <Container
              label="Input"
              layoutMode={layoutMode}
              collapsed={inputCollapsed}
              onToggleCollapse={() => setInputCollapsed(!inputCollapsed)}
              onMoveLeft={() => moveSection('input', 'left')}
              onMoveRight={() => moveSection('input', 'right')}
              canMoveLeft={canMove('input', 'left')}
              canMoveRight={canMove('input', 'right')}
            >
              <InputWithAST
                text={text}
                onTextChange={setText}
                collapseAll={astCollapsed}
              />
            </Container>
          </div>

          {/* Chunks */}
          <div
            className={layoutMode === 'column' && !chunksCollapsed ?
              'flex-1 min-w-[400px] min-h-0 overflow-hidden'
              : layoutMode === 'row' && !chunksCollapsed ? 'flex-1 min-h-[400px] overflow-hidden' : ''}
            style={{ order: getSectionOrder('chunks') }}
          >
            <Container
              label="Chunks #1"
              layoutMode={layoutMode}
              collapsed={chunksCollapsed}
              onToggleCollapse={() => setChunksCollapsed(!chunksCollapsed)}
              onMoveLeft={() => moveSection('chunks', 'left')}
              onMoveRight={() => moveSection('chunks', 'right')}
              canMoveLeft={canMove('chunks', 'left')}
              canMoveRight={canMove('chunks', 'right')}
              additionalActionButton={
                <button
                  onClick={addComparisonPanel}
                  type="button"
                  title="Add library for comparison"
                  className="px-2 py-1 text-xs font-medium bg-transparent text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-700 dark:hover:border-green-300 rounded transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Compare
                </button>
              }
            >
              <ChunkVisualizerWithOptions
                text={text}
                splitterId={library}
                algorithm={getCurrentAlgorithm()}
                config={{
                  chunkSize,
                  chunkOverlap: 0,
                  maxOverflowRatio,
                }}
                onLibraryChange={(lib) => handleLibraryChange(lib as Library)}
                onAlgorithmChange={handleAlgorithmChange}
                onConfigChange={(updates) => {
                  if (updates.chunkSize !== undefined) setChunkSize(updates.chunkSize);
                  if (updates.maxOverflowRatio !== undefined) setMaxOverflowRatio(updates.maxOverflowRatio);
                }}
                availableAlgorithms={getAvailableAlgorithms()}
                onTooltipMouseEnter={handleTooltipMouseEnter}
                onTooltipMouseLeave={handleTooltipMouseLeave}
              />
            </Container>
          </div>

          {/* Comparison Panels - using same Container component */}
          {comparisonPanels.map((panel, index) => {
            const panelAlgorithm = panel.library === 'chunkdown' ? panel.chunkdownAlgorithm :
                                   panel.library === 'mastra' ? panel.mastraAlgorithm :
                                   panel.langchainAlgorithm;
            
            return (
              <div
                key={panel.id}
                className={layoutMode === 'column' && !panel.collapsed ?
                  'flex-1 min-w-[400px] min-h-0 overflow-hidden'
                  : layoutMode === 'row' && !panel.collapsed ? 'flex-1 min-h-[400px] overflow-hidden' : ''}
                style={{ order: getSectionOrder(panel.id) }}
              >
                <Container
                  label={`Chunks #${index + 2}`}
                  layoutMode={layoutMode}
                  collapsed={panel.collapsed || false}
                  onToggleCollapse={() => updateComparisonPanel(panel.id, { collapsed: !panel.collapsed })}
                  onMoveLeft={() => moveSection(panel.id as SectionId, 'left')}
                  onMoveRight={() => moveSection(panel.id as SectionId, 'right')}
                  canMoveLeft={canMove(panel.id as SectionId, 'left')}
                  canMoveRight={canMove(panel.id as SectionId, 'right')}
                  showCloseButton={true}
                  onClose={() => removeComparisonPanel(panel.id)}
                >
                  <ChunkVisualizerWithOptions
                    text={text}
                    splitterId={panel.library}
                    algorithm={panelAlgorithm}
                    config={{
                      chunkSize: panel.chunkSize,
                      chunkOverlap: 0,
                      maxOverflowRatio: panel.maxOverflowRatio,
                    }}
                    onLibraryChange={(lib) => updateComparisonPanel(panel.id, { library: lib as Library })}
                    onAlgorithmChange={(alg) => {
                      if (panel.library === 'chunkdown') {
                        updateComparisonPanel(panel.id, { chunkdownAlgorithm: alg as ChunkdownAlgorithm });
                      } else if (panel.library === 'mastra') {
                        updateComparisonPanel(panel.id, { mastraAlgorithm: alg as MastraAlgorithm });
                      } else {
                        updateComparisonPanel(panel.id, { langchainAlgorithm: alg as LangchainAlgorithm });
                      }
                    }}
                    onConfigChange={(updates) => {
                      updateComparisonPanel(panel.id, updates);
                    }}
                    availableAlgorithms={splitterRegistry.get(panel.library)?.algorithms || []}
                    onTooltipMouseEnter={handleTooltipMouseEnter}
                    onTooltipMouseLeave={handleTooltipMouseLeave}
                  />
                </Container>
              </div>
            );
          })}
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
