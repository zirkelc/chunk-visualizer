# Contributing to Chunk Visualizer

Thank you for your interest in contributing! This guide will help you add new text splitting libraries to the visualizer.

## Adding a New Text Splitting Library

The architecture has been designed to make adding new text splitters as easy as possible. Follow these steps:

### 1. Create a New Splitter Class

Create a new file in `src/libs/splitters/` that implements the `TextSplitter` interface:

```typescript
// src/libs/splitters/MyNewSplitter.ts
import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';
import { chunkSizeOptions, chunkOverlapOptions } from './options';

export class MyNewSplitter implements TextSplitter {
  readonly id = 'mynew';  // Unique identifier
  readonly name = 'my-new-library';  // Display name
  readonly version = packageJson.dependencies['my-new-library'].replace('^', '');  // Read from package.json
  readonly algorithms = ['algorithm1', 'algorithm2'] as const;

  async splitText(text: string, config: TextSplitterConfig): Promise<string[]> {
    // chunkSize and chunkOverlap are optional - provide defaults if needed
    const { chunkSize = 200, chunkOverlap = 0, algorithm = 'algorithm1' } = config;
    
    // Your splitting logic here
    // Use the actual library to split the text
    
    return chunks;
  }

  // Define ALL configuration options for each algorithm
  // Include common options (chunkSize, chunkOverlap) when supported
  getAlgorithmConfig(algorithm: string): ConfigOption[] {
    // If your algorithm doesn't support chunk size, return only algorithm-specific options
    if (algorithm === 'algorithm1') {
      return [
        chunkSizeOptions,      // Common option from options.ts
        chunkOverlapOptions,   // Common option from options.ts
        {
          key: 'myOption',
          label: 'My Custom Option',
          type: 'range',
          defaultValue: 1.0,
          min: 0.5,
          max: 2.0,
          step: 0.1,
          description: 'What this option does',
        },
      ];
    }
    
    // If algorithm doesn't support configuration, return empty array
    if (algorithm === 'algorithm2') {
      return [];
    }
    
    return [];
  }
}
```

### 2. Register Your Splitter

Add your splitter to the registry in `src/libs/splitters/registry.ts`:

```typescript
import { MyNewSplitter } from './MyNewSplitter';

class SplitterRegistry {
  constructor() {
    this.register(new ChunkdownSplitter());
    this.register(new LangchainSplitter());
    this.register(new LlamaIndexSplitter());
    this.register(new MastraSplitter());
    this.register(new MyNewSplitter());  // Add this line
  }
  // ...
}
```

### 3. Install Dependencies

Add your library to `package.json`:

```bash
npm install my-new-library
# or
pnpm add my-new-library
```

### 4. Test

That's it! The UI will automatically:
- Show your library in the dropdown
- Display available algorithms
- Render configuration options based on `getAlgorithmConfig()` return value
- Handle text splitting with your implementation

**Important**: The configuration UI is fully dynamic. Only the options returned by `getAlgorithmConfig()` for the selected algorithm will be displayed. This allows you to:
- Hide options that don't apply to certain algorithms (e.g., chunk size for parsers that don't support it)
- Show different options for different algorithms within the same library

## Architecture Overview

### Core Components

1. **TextSplitter Interface** (`src/libs/splitters/types.ts`)
   - Defines the contract all splitters must follow
   - Ensures type safety across the application
   - `chunkSize` and `chunkOverlap` are optional in `TextSplitterConfig`

2. **Common Options** (`src/libs/splitters/options.ts`)
   - Centralized definitions for common config options
   - Includes `chunkSizeOptions` and `chunkOverlapOptions`
   - Import and use these instead of duplicating definitions

3. **Splitter Registry** (`src/libs/splitters/registry.ts`)
   - Central repository for all splitters
   - Provides methods to retrieve splitters by ID

4. **useTextSplitter Hook** (`src/hooks/useTextSplitter.ts`)
   - React hook that handles text splitting
   - Manages loading and error states
   - Works with any registered splitter

5. **ChunkVisualizerWithOptions Component** (`src/components/ChunkVisualizerWithOptions.tsx`)
   - Dynamically renders configuration UI
   - Based on `ConfigOption[]` returned by `getAlgorithmConfig()`
   - Supports all option types: range, number, boolean, select

### File Structure

```
src/
├── libs/
│   └── splitters/
│       ├── types.ts                # Core interfaces
│       ├── options.ts              # Common config options
│       ├── registry.ts             # Splitter registry
│       ├── ChunkdownSplitter.ts    # Chunkdown implementation
│       ├── LangchainSplitter.ts    # LangChain implementation
│       ├── LlamaindexSplitter.ts   # LlamaIndex implementation
│       └── MastraSplitter.ts       # Mastra implementation
├── hooks/
│   └── useTextSplitter.ts          # React hook
└── components/
    ├── ChunkVisualizer.tsx         # Visualization component
    └── ChunkVisualizerWithOptions.tsx  # Visualization with dynamic config UI
```

## Configuration Options

The `ConfigOption` interface supports these types:

- **`range`**: Slider with min/max values
- **`number`**: Numeric input
- **`boolean`**: Checkbox
- **`select`**: Dropdown with predefined options

### Using Common Options

For standard options like `chunkSize` and `chunkOverlap`, import them from `options.ts`:

```typescript
import { chunkSizeOptions, chunkOverlapOptions } from './options';

getAlgorithmConfig(algorithm: string): ConfigOption[] {
  // Use common options when your algorithm supports them
  return [
    chunkSizeOptions,
    chunkOverlapOptions,
    // Add your custom options here
  ];
}
```

### Custom Options Example

```typescript
getAlgorithmConfig(algorithm: string): ConfigOption[] {
  if (algorithm === 'advanced') {
    return [
      chunkSizeOptions,  // From options.ts
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'range',
        defaultValue: 0.7,
        min: 0.0,
        max: 1.0,
        step: 0.1,
        description: 'Controls randomness in splitting',
      },
      {
        key: 'preserveFormatting',
        label: 'Preserve Formatting',
        type: 'boolean',
        defaultValue: true,
        description: 'Keep markdown formatting in chunks',
      },
    ];
  }
  
  // Algorithm with no configurable options
  return [];
}
```

## Key Concepts

### Optional Configuration

The `TextSplitterConfig` interface has optional `chunkSize` and `chunkOverlap` fields. This is important because:

1. **Not all algorithms support chunk size**: Some parsers (like LlamaIndex's markdown parser) split text based on document structure rather than size limits
2. **Dynamic UI**: Only return options in `getAlgorithmConfig()` that are actually supported by each algorithm
3. **Provide defaults**: When destructuring config in `splitText()`, always provide sensible defaults

Example:
```typescript
// LlamaIndex markdown parser - no chunk size support
getAlgorithmConfig(algorithm: string): ConfigOption[] {
  if (algorithm === 'markdown') {
    return []; // No options - splits by structure
  }
  if (algorithm === 'sentence') {
    return [chunkSizeOptions, chunkOverlapOptions];
  }
  return [];
}
```

## Best Practices

1. **Error Handling**: Wrap your splitting logic in try-catch blocks
2. **Async Support**: Use `async/await` if your library requires it
3. **Type Safety**: Leverage TypeScript for better DX
4. **Documentation**: Add JSDoc comments to your splitter class
5. **Testing**: Test your splitter with various text inputs
6. **Use Common Options**: Import from `options.ts` instead of duplicating definitions
7. **Algorithm-Specific Config**: Return different options for different algorithms when appropriate

## Example: Complete Splitter Implementation

```typescript
import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';
import { chunkSizeOptions, chunkOverlapOptions } from './options';

/**
 * Example splitter implementation
 * Demonstrates all features of the TextSplitter interface
 */
export class ExampleSplitter implements TextSplitter {
  readonly id = 'example';
  readonly name = 'Example Splitter';
  readonly version = packageJson.dependencies['example-library'].replace('^', '');
  readonly algorithms = ['simple', 'advanced', 'parser'] as const;

  async splitText(text: string, config: TextSplitterConfig): Promise<string[]> {
    // Provide defaults for optional config values
    const { chunkSize = 200, chunkOverlap = 0, algorithm = 'simple', customOption = 1.0 } = config;

    if (!text.trim()) {
      return [];
    }

    // Simple algorithm: split by character count (uses chunkSize)
    if (algorithm === 'simple') {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      return chunks;
    }

    // Advanced algorithm: use external library (uses chunkSize and customOption)
    if (algorithm === 'advanced') {
      const { splitText } = await import('example-library');
      return splitText(text, {
        maxSize: chunkSize,
        overlap: chunkOverlap,
        customFactor: customOption,
      });
    }

    // Parser algorithm: doesn't support chunk size
    if (algorithm === 'parser') {
      const { parseAndSplit } = await import('example-library');
      return parseAndSplit(text);
    }

    return [];
  }

  getAlgorithmConfig(algorithm: string): ConfigOption[] {
    // Advanced algorithm supports all options
    if (algorithm === 'advanced') {
      return [
        chunkSizeOptions,      // Common option
        chunkOverlapOptions,   // Common option
        {
          key: 'customOption',
          label: 'Custom Factor',
          type: 'range',
          defaultValue: 1.0,
          min: 0.5,
          max: 2.0,
          step: 0.1,
          description: 'Adjusts splitting sensitivity',
        },
      ];
    }

    // Simple algorithm only supports chunk size
    if (algorithm === 'simple') {
      return [chunkSizeOptions];
    }

    // Parser algorithm has no configurable options
    if (algorithm === 'parser') {
      return [];
    }

    return [];
  }
}
```
