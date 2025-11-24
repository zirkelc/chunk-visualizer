import { SentenceSplitter, MarkdownNodeParser, Document } from 'llamaindex';
import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';

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
    const { chunkSize, chunkOverlap = 0, algorithm = 'markdown' } = config;

    switch (algorithm) {
      case 'sentence': {
        const splitter = new SentenceSplitter({
          chunkSize,
          chunkOverlap,
        });
        return splitter.splitText(text);
      }

      case 'markdown': {
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

  getAlgorithmConfig(): ConfigOption[] {
    // LlamaIndex doesn't have algorithm-specific options beyond the common ones
    return [];
  }
}
