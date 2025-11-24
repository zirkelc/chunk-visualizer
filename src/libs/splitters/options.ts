import { ConfigOption } from "./types";

export const chunkSizeOptions: ConfigOption = {
    key: 'chunkSize',
    label: 'Chunk Size',
    type: 'range',
    defaultValue: 200,
    min: 1,
    max: 2000,
    step: 1,
    description: 'Target size for each chunk',
};

export const chunkOverlapOptions: ConfigOption = {
    key: 'chunkOverlap',
    label: 'Chunk Overlap',
    type: 'range',
    defaultValue: 0,
    min: 0,
    max: 500,
    step: 1,
    description: 'Number of characters to overlap between chunks',
};
