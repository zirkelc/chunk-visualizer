import type { Heading, Node, Nodes, Root, RootContent } from 'mdast';

/**
 * Section node type for hierarchical AST
 * Represents a heading with its associated content and nested subsections
 */
export interface Section extends Node {
  type: 'section';
  depth: number;
  heading: Heading | undefined;
  children: (RootContent | Section)[];
}

/**
 * Hierarchical AST root that contains only sections.
 */
export interface HierarchicalRoot extends Node {
  type: 'root';
  children: Array<Section | RootContent>;
}

/**
 * Transform a flat mdast AST into a hierarchical structure where headings
 * contain their associated content and nested subsections.
 */
export const createHierarchicalAST = (root: Root): HierarchicalRoot => {
  const transform = (nodes: RootContent[]): (RootContent | Section)[] => {
    const result: (RootContent | Section)[] = [];
    let i = 0;

    while (i < nodes.length) {
      const node = nodes[i];

      if (node.type === 'heading') {
        const section: Section = {
          type: 'section',
          depth: node.depth,
          heading: node,
          children: [],
        };

        /**
         * Move past the heading
         */
        i++;

        /**
         * Collect all content until we hit a heading of same or higher level or a thematic break
         */
        const startPos = i; // Track where children start
        while (i < nodes.length) {
          const nextNode = nodes[i];

          if (nextNode.type === 'heading' && nextNode.depth <= node.depth) {
            /**
             * Found a heading at same or higher level - stop collecting
             */
            break;
          }

          if (nextNode.type === 'thematicBreak') {
            /**
             * Found a thematic break - stop collecting content for this section
             * Thematic break will be handled as standalone content
             */
            break;
          }

          section.children.push(nextNode);
          i++;
        }

        /**
         * Now recursively process the collected children to handle nested headings
         * Filter out only RootContent nodes for recursive processing
         */
        const contentNodes = section.children.filter(
          (child): child is RootContent => !isSection(child),
        );
        section.children = transform(contentNodes);

        /**
         * Calculate position for section (from heading start to last child end)
         */
        if (node.position) {
          const lastChild = section.children[section.children.length - 1];
          const endPos = lastChild?.position?.end || node.position.end;
          
          section.position = {
            start: node.position.start,
            end: endPos,
          };
        }

        result.push(section);
      } else if (node.type === 'thematicBreak') {
        /**
         * Thematic breaks are standalone content that act as section boundaries
         */
        result.push(node);
        i++;
      } else {
        /**
         * Regular non-heading content
         */
        result.push(node);
        i++;
      }
    }

    return result;
  };

  const sections = transform(root.children);

  return {
    type: 'root',
    children: sections,
  };
};

/**
 * Check if a node is a Section
 */
export const isSection = (node: Node): node is Section => {
  return node?.type === 'section';
};

/**
 * Convert hierarchical AST back to flat structure
 */
export const flattenHierarchicalAST = (ast: HierarchicalRoot): Root => {
  const flatten = (nodes: (RootContent | Section)[]): RootContent[] => {
    const result: RootContent[] = [];

    for (const node of nodes) {
      if (isSection(node)) {
        if (node.heading) {
          result.push(node.heading);
        }
        result.push(...flatten(node.children));
      } else {
        result.push(node);
      }
    }

    return result;
  };

  return {
    type: 'root',
    children: flatten(ast.children),
  };
};
