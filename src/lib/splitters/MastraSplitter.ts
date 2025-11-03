import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';

/**
 * Mastra RAG text splitter implementation
 * Currently disabled due to browser compatibility issues
 * @see https://github.com/mastra-ai/mastra/issues/9389
 */
export class MastraSplitter implements TextSplitter {
  readonly id = 'mastra';
  readonly name = '@mastra/rag';
  readonly version = packageJson.dependencies['@mastra/rag'].replace('^', '');
  readonly algorithms = ['recursive', 'character', 'markdown'] as const;
  readonly disabled = true;

  async splitText(_text: string, _config: TextSplitterConfig): Promise<string[]> {
    // Currently disabled due to compatibility issues
    // When re-enabled, implement splitting logic here
    
    // eslint-disable-next-line no-console
    console.warn('Mastra splitter is currently disabled');
    return [];

    /* Future implementation when compatibility is resolved:
    const { MDocument } = await import('@mastra/rag');
    const { chunkSize, chunkOverlap = 0, algorithm = 'recursive' } = config;

    const doc = MDocument.fromText(text);
    const chunkedDoc = await doc.chunk({
      strategy: algorithm,
      maxSize: chunkSize,
      overlap: chunkOverlap,
    });

    return chunkedDoc.map((chunk: any) => chunk.text);
    */
  }

  getAlgorithmConfig(): ConfigOption[] {
    return [];
  }
}
