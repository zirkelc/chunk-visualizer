# Contributing to Chunk Visualizer

Thank you for your interest in contributing! This guide will help you add new text splitting libraries to the visualizer.

## Adding a New Text Splitting Library

The architecture has been designed to make adding new text splitters as easy as possible. Follow these steps:

### 1. Create a New Splitter Class

Create a new file in `src/lib/splitters/` that implements the `TextSplitter` interface:

```typescript
// src/lib/splitters/MyNewSplitter.ts
import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';

export class MyNewSplitter implements TextSplitter {
  readonly id = 'mynew';  // Unique identifier
  readonly name = 'my-new-library';  // Display name
  readonly version = packageJson.dependencies['my-new-library'].replace('^', '');  // Read from package.json
  readonly algorithms = ['algorithm1', 'algorithm2'] as const;

  async splitText(text: string, config: TextSplitterConfig): Promise<string[]> {
    const { chunkSize, algorithm = 'algorithm1' } = config;
    
    // Your splitting logic here
    // Use the actual library to split the text
    
    return chunks;
  }

  // Optional: Define algorithm-specific configuration options
  getAlgorithmConfig(algorithm: string): ConfigOption[] {
    return [
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
}
```

### 2. Register Your Splitter

Add your splitter to the registry in `src/lib/splitters/registry.ts`:

```typescript
import { MyNewSplitter } from './MyNewSplitter';

class SplitterRegistry {
  constructor() {
    this.register(new ChunkdownSplitter());
    this.register(new LangchainSplitter());
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
- Render any custom configuration options
- Handle text splitting with your implementation

## Architecture Overview

### Core Components

1. **TextSplitter Interface** (`src/lib/splitters/types.ts`)
   - Defines the contract all splitters must follow
   - Ensures type safety across the application

2. **Splitter Registry** (`src/lib/splitters/registry.ts`)
   - Central repository for all splitters
   - Provides methods to retrieve splitters by ID

3. **useTextSplitter Hook** (`src/hooks/useTextSplitter.ts`)
   - React hook that handles text splitting
   - Manages loading and error states
   - Works with any registered splitter

4. **SplitterConfig Component** (`src/components/SplitterConfig.tsx`)
   - Dynamically renders configuration UI
   - Based on `ConfigOption[]` returned by splitters

### File Structure

```
src/
├── lib/
│   └── splitters/
│       ├── types.ts               # Core interfaces
│       ├── registry.ts            # Splitter registry
│       ├── ChunkdownSplitter.ts   # Chunkdown implementation
│       ├── LangchainSplitter.ts   # LangChain implementation
│       └── MastraSplitter.ts      # Mastra implementation
├── hooks/
│   └── useTextSplitter.ts         # React hook
└── components/
    ├── ChunkVisualizer.tsx        # Visualization component
    └── SplitterConfig.tsx         # Dynamic config UI
```

## Configuration Options

The `ConfigOption` interface supports these types:

- **`range`**: Slider with min/max values
- **`number`**: Numeric input
- **`boolean`**: Checkbox
- **`select`**: Dropdown with predefined options

Example:

```typescript
getAlgorithmConfig(): ConfigOption[] {
  return [
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
```

## Best Practices

1. **Error Handling**: Wrap your splitting logic in try-catch blocks
2. **Async Support**: Use `async/await` if your library requires it
3. **Type Safety**: Leverage TypeScript for better DX
4. **Documentation**: Add JSDoc comments to your splitter class
5. **Testing**: Test your splitter with various text inputs

## Example: Complete Splitter Implementation

```typescript
import packageJson from '../../../package.json';
import type { TextSplitter, TextSplitterConfig, ConfigOption } from './types';

/**
 * Example splitter implementation
 * Demonstrates all features of the TextSplitter interface
 */
export class ExampleSplitter implements TextSplitter {
  readonly id = 'example';
  readonly name = 'Example Splitter';
  readonly version = packageJson.dependencies['example-library'].replace('^', '');
  readonly algorithms = ['simple', 'advanced'] as const;

  async splitText(text: string, config: TextSplitterConfig): Promise<string[]> {
    const { chunkSize, algorithm = 'simple', customOption = 1.0 } = config;

    if (!text.trim()) {
      return [];
    }

    // Simple algorithm: split by character count
    if (algorithm === 'simple') {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      return chunks;
    }

    // Advanced algorithm: use external library
    const { splitText } = await import('example-library');
    return splitText(text, {
      maxSize: chunkSize,
      customFactor: customOption,
    });
  }

  getAlgorithmConfig(algorithm: string): ConfigOption[] {
    if (algorithm === 'advanced') {
      return [
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
    return [];
  }
}
```
