import {
  CharacterTextSplitter,
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
} from '@langchain/textsplitters';
import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';
import { chunkOverlapOptions, chunkSizeOptions } from './options';

/**
 * LangChain text splitter implementation
 * Supports multiple splitting strategies: markdown, character, and sentence-based
 */
export class LangchainSplitter implements TextSplitter {
  readonly id = 'langchain';
  readonly name = '@langchain/textsplitters';
  readonly version = packageJson.dependencies['@langchain/textsplitters'].replace('^', '');
  readonly algorithms = ['markdown', 'character', 'sentence'] as const;

  async splitText(text: string, config: TextSplitterConfig): Promise<string[]> {
    const { chunkSize = 200, chunkOverlap = 0, algorithm = 'markdown' } = config;

    let splitter;

    switch (algorithm) {
      case 'markdown':
        splitter = new MarkdownTextSplitter({
          chunkSize,
          chunkOverlap,
        });
        break;

      case 'character':
        splitter = new CharacterTextSplitter({
          chunkSize,
          chunkOverlap,
        });
        break;

      case 'sentence':
        splitter = new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
        });
        break;

      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    return await splitter.splitText(text);
  }

  getAlgorithmConfig(): ConfigOption[] {
    // All LangChain algorithms support the same common options
    return [
        chunkSizeOptions,
        chunkOverlapOptions,
    ];
  }
}
