import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';

/**
 * Mastra RAG text splitter implementation
 */
export class MastraSplitter implements TextSplitter {
  readonly id = 'mastra';
  readonly name = '@mastra/rag';
  readonly version = packageJson.dependencies['@mastra/rag'].replace('^', '');
  readonly algorithms = ['recursive', 'character', 'markdown'] as const;
  readonly disabled = true; // Currently disabled due to browser compatibility issues

  async splitText(text: string, config: TextSplitterConfig): Promise<string[]> {
    const { MDocument } = await import('@mastra/rag');
    const { chunkSize, chunkOverlap = 0, algorithm = 'recursive' } = config;

    const doc = MDocument.fromText(text);
    const chunkedDoc = await doc.chunk({
      strategy: algorithm as 'recursive' | 'character' | 'markdown',
      maxSize: chunkSize,
      overlap: chunkOverlap,
    });

    return chunkedDoc.map((chunk: any) => chunk.text);
  }

  getAlgorithmConfig(): ConfigOption[] {
    return [];
  }
}
