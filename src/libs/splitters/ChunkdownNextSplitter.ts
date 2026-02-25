import { chunkdown } from 'chunkdown-next';
import packageJson from '../../../package.json';
import { chunkSizeOptions } from './options';
import type { ConfigOption, TextSplitter, TextSplitterConfig } from './types';

const maxOverflowRatioOption: ConfigOption = {
  key: 'maxOverflowRatio',
  label: 'Max Overflow Ratio',
  type: 'range',
  defaultValue: 1.5,
  min: 1.0,
  max: 3.0,
  step: 0.1,
  description:
    'Maximum ratio by which a chunk can exceed the target chunk size',
};

/**
 * Chunkdown text splitter implementation
 * Supports markdown-aware text splitting with overflow control
 */
export class ChunkdownNextSplitter implements TextSplitter {
  readonly id = 'chunkdown-next';
  readonly name = 'chunkdown-next';
  readonly version = 'next';
  readonly algorithms = ['markdown'] as const;

  splitText(text: string, config: TextSplitterConfig): string[] {
    const { chunkSize = 200, maxOverflowRatio = 1.5 } = config;

    const splitter = chunkdown({
      chunkSize,
      maxOverflowRatio,
    });

    return splitter.splitText(text);
  }

  getAlgorithmConfig(): ConfigOption[] {
    return [chunkSizeOptions, maxOverflowRatioOption];
  }
}
