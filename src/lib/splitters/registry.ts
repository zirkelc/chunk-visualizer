import { ChunkdownSplitter } from './ChunkdownSplitter';
import { LangchainSplitter } from './LangchainSplitter';
import { MastraSplitter } from './MastraSplitter';
import type { TextSplitter } from './types';

/**
 * Registry for managing all available text splitters
 * Provides a central place to register and retrieve splitters
 */
class SplitterRegistry {
  private splitters: Map<string, TextSplitter> = new Map();

  constructor() {
    // Register all available splitters
    this.register(new ChunkdownSplitter());
    this.register(new LangchainSplitter());
    this.register(new MastraSplitter());
  }

  /**
   * Register a new text splitter
   * @param splitter The splitter to register
   */
  register(splitter: TextSplitter): void {
    this.splitters.set(splitter.id, splitter);
  }

  /**
   * Get a specific splitter by ID
   * @param id The splitter ID
   * @returns The splitter or undefined if not found
   */
  get(id: string): TextSplitter | undefined {
    return this.splitters.get(id);
  }

  /**
   * Get all registered splitters
   * @returns Array of all splitters
   */
  getAll(): TextSplitter[] {
    return Array.from(this.splitters.values());
  }

  /**
   * Get only enabled splitters (not disabled)
   * @returns Array of enabled splitters
   */
  getEnabled(): TextSplitter[] {
    return this.getAll().filter((s) => !s.disabled);
  }

  /**
   * Check if a splitter is registered
   * @param id The splitter ID
   * @returns True if registered
   */
  has(id: string): boolean {
    return this.splitters.has(id);
  }
}

/**
 * Global registry instance
 * Import and use this instance throughout the application
 */
export const splitterRegistry = new SplitterRegistry();
