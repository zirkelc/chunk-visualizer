# Chunk Visualizer

This project provides a playground for visual comparison of different text chunking algorithms.

## Libraries

### [chunkdown](https://github.com/zirkelc/chunkdown)

Available algorithms:
- `markdown`

### [@langchain/textsplitters](https://www.npmjs.com/package/@langchain/textsplitters)

Available algorithms:
- `markdown`
- `character`
- `sentence`

### ~~[@mastra/rag](https://www.npmjs.com/package/@mastra/rag)~~

> [!NOTE]
> Currently disabled due to compatibility issues: https://github.com/mastra-ai/mastra/issues/9389

Available algorithms:
- `recursive`
- `character`
- `markdown`

## Architecture

This project uses a modular, extensible architecture for text splitters:

- **Text Splitter Interface**: All splitters implement a common `TextSplitter` interface
- **Splitter Registry**: Central registry manages all available splitters
- **Dynamic UI**: Configuration options are automatically rendered based on splitter capabilities
- **Type-Safe**: Full TypeScript support ensures type safety across the application

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
│   └── useTextSplitter.ts         # React hook for splitting
└── components/
    ├── ChunkVisualizer.tsx        # Visualization component
    └── SplitterConfig.tsx         # Dynamic config UI
```

## Contributing

Want to add a new library? It's easy! See [CONTRIBUTING.md](./CONTRIBUTING.md) for a step-by-step guide.

The new architecture makes it trivial to add support for additional text splitting libraries - just implement the `TextSplitter` interface and register it!

## License

MIT
