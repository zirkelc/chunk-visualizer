import { Document, MarkdownNodeParser, SentenceSplitter } from 'llamaindex';
import packageJson from '../../../package.json';
import { chunkOverlapOptions, chunkSizeOptions } from './options';
import type { ConfigOption, TextSplitter, TextSplitterConfig } from './types';

/**
 * LlamaIndex text splitter implementation
 * Supports sentence and markdown splitting strategies
 */
export class LlamaIndexSplitter implements TextSplitter {
  readonly id = 'llamaindex';
  readonly name = 'llamaindex';
  readonly version = packageJson.dependencies['llamaindex'].replace('^', '');
  readonly algorithms = ['sentence', 'markdown'] as const;

  async splitText(text: string, config: TextSplitterConfig): Promise<string[]> {
    const {
      chunkSize = 200,
      chunkOverlap = 0,
      algorithm = 'markdown',
    } = config;

    switch (algorithm) {
      case 'sentence': {
        const splitter = new SentenceSplitter({
          chunkSize,
          chunkOverlap,
        });
        return splitter.splitText(text);
      }

      case 'markdown': {
        // markdown parser doesn't support chunk size configuration
        const parser = new MarkdownNodeParser();
        const document = new Document({ text });
        const nodes = parser.getNodesFromDocuments([document]);

        // Extract text content from nodes
        return nodes.map((node) => node.getContent());
      }

      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
  }

  getAlgorithmConfig(algorithm: string): ConfigOption[] {
    switch (algorithm) {
      case 'markdown':
        // Markdown parser doesn't have any configurable options
        return [];
      case 'sentence':
        // Sentence splitter supports chunkSize and chunkOverlap
        return [chunkSizeOptions, chunkOverlapOptions];
      default:
        return [];
    }
  }
}
