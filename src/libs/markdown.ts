import type { Nodes } from 'mdast';
import {
  fromMarkdown as mdastFromMarkdown,
  type Value,
} from 'mdast-util-from-markdown';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { toMarkdown as mdastToMarkdown } from 'mdast-util-to-markdown';
import { toString as mdastToString } from 'mdast-util-to-string';
import { gfm } from 'micromark-extension-gfm';

export { mdastToString as toString };

export const fromMarkdown = (value: Value) => {
  return mdastFromMarkdown(value, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
};

export const toMarkdown = (tree: Nodes) => {
  return mdastToMarkdown(tree, {
    extensions: [gfmToMarkdown()],
  });
};

export const getContentSize = (input: Nodes): number => {
  const plainText = mdastToString(input);
  return plainText.length;
};
