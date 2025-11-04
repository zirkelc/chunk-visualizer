/**
 * Configuration for text splitting
 */
export interface TextSplitterConfig {
  chunkSize: number;
  chunkOverlap?: number;
  algorithm?: string;
  // Library-specific options can be added dynamically
  [key: string]: any;
}

/**
 * Configuration option definition for UI rendering
 */
export interface ConfigOption {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select' | 'range';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: any; label: string }>;
  description?: string;
}

/**
 * Base interface that all text splitters must implement
 */
export interface TextSplitter {
  /** Unique identifier for the splitter */
  readonly id: string;

  /** Display name (library name) */
  readonly name: string;

  /** Library version */
  readonly version: string;

  /** Available algorithms/strategies for this splitter */
  readonly algorithms: readonly string[];

  /** Whether this splitter is currently disabled */
  readonly disabled?: boolean;

  /**
   * Split text into chunks
   * @param text The text to split
   * @param config Configuration options
   * @returns Array of text chunks
   */
  splitText(text: string, config: TextSplitterConfig): Promise<string[]> | string[];

  /**
   * Get algorithm-specific configuration options for UI rendering
   * @param algorithm The algorithm name
   * @returns Array of configuration options
   */
  getAlgorithmConfig?(algorithm: string): ConfigOption[];
}
