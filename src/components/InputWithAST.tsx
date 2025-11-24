'use client';

import type { Node, Parent, RootContent } from 'mdast';
import { useEffect, useState } from 'react';
import {
  createHierarchicalAST,
  type HierarchicalRoot,
  isSection,
  type Section,
} from '../libs/ast';
import { fromMarkdown } from '../libs/markdown';

interface InputWithASTProps {
  text: string;
  onTextChange: (text: string) => void;
  collapseAll?: boolean;
}

interface TreeNodeProps {
  node: Node | Parent | RootContent | Section;
  depth: number;
  parentPath?: string;
  collapseAll?: boolean;
  onNodeHover: (position: { start: number; end: number } | null) => void;
  onNodeClick: (position: { start: number; end: number } | null, path: string, event: React.MouseEvent) => void;
  selectedNodePaths: string[];
  currentPath: string;
}

const nodeColors: Record<string, string> = {
  root: 'text-gray-700 dark:text-gray-300',
  heading: 'text-blue-600 dark:text-blue-400',
  paragraph: 'text-green-600 dark:text-green-400',
  text: 'text-gray-600 dark:text-gray-400',
  code: 'text-purple-600 dark:text-purple-400',
  inlineCode: 'text-purple-500 dark:text-purple-400',
  list: 'text-orange-600 dark:text-orange-400',
  listItem: 'text-orange-500 dark:text-orange-400',
  blockquote: 'text-indigo-600 dark:text-indigo-400',
  thematicBreak: 'text-red-500 dark:text-red-400',
  emphasis: 'text-pink-600 dark:text-pink-400',
  strong: 'text-pink-700 dark:text-pink-400',
  link: 'text-cyan-600 dark:text-cyan-400',
  linkReference: 'text-cyan-600 dark:text-cyan-400',
  image: 'text-teal-600 dark:text-teal-400',
  imageReference: 'text-teal-600 dark:text-teal-400',
  html: 'text-yellow-600 dark:text-yellow-400',
  break: 'text-gray-400 dark:text-gray-500',
  table: 'text-emerald-600 dark:text-emerald-400',
  tableRow: 'text-emerald-500 dark:text-emerald-400',
  tableCell: 'text-emerald-400 dark:text-emerald-400',
  delete: 'text-red-600 dark:text-red-400',
};

function TreeNode({
  node,
  depth,
  parentPath = '',
  collapseAll = false,
  onNodeHover,
  onNodeClick,
  selectedNodePaths,
  currentPath,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // For sections, check if heading or children exist
  const hasChildren = isSection(node)
    ? (node.heading !== undefined || (node.children && node.children.length > 0))
    : ('children' in node && node.children && node.children.length > 0);

  const nodePath = currentPath; // Use the passed currentPath directly

  // Apply collapse all state (but not to root node at depth 0)
  useEffect(() => {
    if (depth > 0) {
      setIsExpanded(!collapseAll);
    }
  }, [collapseAll, depth]);

  const extractTextFromNode = (node: Node): string => {
    if ('value' in node && typeof node.value === 'string') {
      return node.value;
    }
    if ('children' in node && Array.isArray(node.children)) {
      return node.children.map(extractTextFromNode).join('');
    }
    return '';
  };

  const getNodeLabel = () => {
    if (isSection(node)) {
      const headingText =
        node.heading?.children?.map(extractTextFromNode).join('') || '';
      return `Section: "${headingText}" (h${node.depth})`;
    }

    let label = node.type;

    if (node.type === 'heading' && 'depth' in node) {
      label += ` (h${node.depth})`;
    } else if (node.type === 'code' && 'lang' in node && node.lang) {
      label += ` (${node.lang})`;
    } else if (node.type === 'list' && 'ordered' in node) {
      label += node.ordered ? ' (ordered)' : ' (unordered)';
    } else if (node.type === 'text' && 'value' in node) {
      const text = node.value;
      label += `: "${text.replace(/\n/g, '\\n')}"`;
    } else if (node.type === 'inlineCode' && 'value' in node) {
      label += `: \`${node.value}\``;
    } else if (node.type === 'link' && 'url' in node) {
      const url = node.url;
      label += `: ${url}`;
      if ('title' in node && node.title) {
        label += ` "${node.title}"`;
      }
    } else if (node.type === 'linkReference' && 'identifier' in node) {
      label += `: [${node.identifier}]`;
    } else if (node.type === 'image' && 'url' in node) {
      const url = node.url;
      label += `: ${url}`;
      if ('alt' in node && node.alt) {
        label += ` alt="${node.alt}"`;
      }
      if ('title' in node && node.title) {
        label += ` "${node.title}"`;
      }
    } else if (node.type === 'imageReference' && 'identifier' in node) {
      label += `: [${node.identifier}]`;
    } else if (node.type === 'definition' && 'url' in node) {
      if ('identifier' in node) {
        label += `: [${node.identifier}]`;
      }
      const url = node.url;
      label += `: ${url}`;
      if ('title' in node && node.title) {
        label += ` "${node.title}"`;
      }
    } else if (node.type === 'table' && 'children' in node && node.children) {
      const rows = node.children.length;
      const firstRow = node.children[0];
      const cols =
        firstRow && 'children' in firstRow && firstRow.children
          ? firstRow.children.length
          : 0;
      label += ` (${rows}×${cols})`;
    } else if (
      node.type === 'tableRow' &&
      'children' in node &&
      node.children
    ) {
      label += ` (${node.children.length} cells)`;
    } else {
      if ('value' in node && typeof node.value === 'string') {
        const text = node.value;
        label += `: "${text}"`;
      } else if ('url' in node && typeof node.url === 'string') {
        const url = node.url;
        label += `: ${url}`;
        // Add title if present
        if ('title' in node && typeof node.title === 'string' && node.title) {
          label += ` "${node.title}"`;
        }
      } else if ('alt' in node && typeof node.alt === 'string') {
        label += `: "${node.alt}"`;
        // Add title if present
        if ('title' in node && typeof node.title === 'string' && node.title) {
          label += ` "${node.title}"`;
        }
      } else if ('depth' in node && typeof node.depth === 'number') {
        label += ` (depth ${node.depth})`;
      } else if ('lang' in node && typeof node.lang === 'string' && node.lang) {
        label += ` (${node.lang})`;
      } else if ('ordered' in node && typeof node.ordered === 'boolean') {
        label += node.ordered ? ' (ordered)' : ' (unordered)';
      }
    }

    return label;
  };

  const colorClass = isSection(node)
    ? 'text-purple-700 dark:text-purple-400'
    : nodeColors[node.type] || 'text-slate-600 dark:text-slate-300';

  // Get position from node
  const getNodePosition = () => {
    if ('position' in node && node.position) {
      return {
        start: node.position.start.offset || 0,
        end: node.position.end.offset || 0,
      };
    }
    return null;
  };

  const nodePosition = getNodePosition();
  const isSelected = selectedNodePaths.includes(currentPath);

  const handleMouseEnter = () => {
    if (nodePosition) {
      onNodeHover(nodePosition);
    }
  };

  const handleMouseLeave = () => {
    onNodeHover(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodePosition) {
      onNodeClick(nodePosition, currentPath, e);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`group flex items-center py-0.5 transition-colors duration-150 cursor-pointer ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/50'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        style={{ paddingLeft: `${depth * 16}px` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Expand/collapse icon */}
        <div className="flex items-center mr-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center"
            >
              {isExpanded ? '−' : '+'}
            </button>
          ) : (
            <div className="w-4 h-4"></div>
          )}
        </div>

        {/* Node content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <span className={`text-sm ${isSelected ? 'font-semibold' : 'font-normal'} ${colorClass} block overflow-hidden text-ellipsis whitespace-nowrap`}>
            {getNodeLabel()}
          </span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {isSection(node) ? (
            <>
              {/* Render heading as first child if it exists */}
              {node.heading && (
                <TreeNode
                  key={`${nodePath}-heading`}
                  node={node.heading}
                  depth={depth + 1}
                  parentPath={nodePath}
                  collapseAll={collapseAll}
                  onNodeHover={onNodeHover}
                  onNodeClick={onNodeClick}
                  selectedNodePaths={selectedNodePaths}
                  currentPath={`${nodePath}-heading`}
                />
              )}
              {/* Render section children */}
              {node.children.map((child, index) => {
                const childPath = `${nodePath}-child-${index}`;
                return (
                  <TreeNode
                    key={childPath}
                    node={child}
                    depth={depth + 1}
                    parentPath={nodePath}
                    collapseAll={collapseAll}
                    onNodeHover={onNodeHover}
                    onNodeClick={onNodeClick}
                    selectedNodePaths={selectedNodePaths}
                    currentPath={childPath}
                  />
                );
              })}
            </>
          ) : (
            'children' in node && node.children && node.children.map((child, index) => {
              const childPath = `${nodePath}-${index}`;
              return (
                <TreeNode
                  key={childPath}
                  node={child}
                  depth={depth + 1}
                  parentPath={nodePath}
                  collapseAll={collapseAll}
                  onNodeHover={onNodeHover}
                  onNodeClick={onNodeClick}
                  selectedNodePaths={selectedNodePaths}
                  currentPath={childPath}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function InputWithAST({
  text,
  onTextChange,
  collapseAll = false,
}: InputWithASTProps) {
  const [hierarchicalAst, setHierarchicalAst] =
    useState<HierarchicalRoot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Array<{
    start: number;
    end: number;
    path: string;
  }>>([]);
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);

  // Parse the markdown text to AST
  useEffect(() => {
    if (!text.trim()) {
      setHierarchicalAst(null);
      setError(null);
      return;
    }

    try {
      const tree = fromMarkdown(text);
      const hierarchical = createHierarchicalAST(tree);
      setHierarchicalAst(hierarchical);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse markdown');
      setHierarchicalAst(null);
    }
  }, [text]);

  const handleNodeHover = (position: { start: number; end: number } | null) => {
    setHoveredPosition(position);
  };

  const handleNodeClick = (
    position: { start: number; end: number } | null,
    path: string,
    event: React.MouseEvent
  ) => {
    if (!position) return;

    if (event.shiftKey) {
      // Add to selection or remove if already selected
      setSelectedPositions(prev => {
        const exists = prev.some(p => p.path === path);
        if (exists) {
          return prev.filter(p => p.path !== path);
        } else {
          return [...prev, { ...position, path }];
        }
      });
    } else {
      // Single selection (replace all)
      setSelectedPositions([{ ...position, path }]);
    }
    setLastSelectedPath(path);
  };

  // Render text with highlighting
  const renderTextWithHighlight = () => {
    if (!text) return <>{text || ' '}</>;

    // Combine selected positions and hovered position
    const positions = [...selectedPositions];

    // Only add hover position if it doesn't overlap with any selection
    if (hoveredPosition) {
      const hoverOverlapsSelection = selectedPositions.some(p =>
        // Check if hover overlaps with any selected region
        (hoveredPosition.start >= p.start && hoveredPosition.start < p.end) ||
        (hoveredPosition.end > p.start && hoveredPosition.end <= p.end) ||
        (hoveredPosition.start <= p.start && hoveredPosition.end >= p.end)
      );

      if (!hoverOverlapsSelection) {
        positions.push({ ...hoveredPosition, path: 'hover' });
      }
    }

    if (positions.length === 0) {
      return <>{text}</>;
    }

    // Merge overlapping positions
    const mergedPositions: Array<{start: number; end: number; isHover: boolean}> = [];
    const sortedPositions = [...positions].sort((a, b) => a.start - b.start);

    sortedPositions.forEach(pos => {
      const isHover = pos.path === 'hover';
      if (mergedPositions.length === 0) {
        mergedPositions.push({ start: pos.start, end: pos.end, isHover });
      } else {
        const last = mergedPositions[mergedPositions.length - 1];
        if (pos.start <= last.end) {
          // Overlapping or adjacent - merge them
          last.end = Math.max(last.end, pos.end);
          // If either is not hover, the merged one is not hover (selection takes priority)
          if (!isHover) {
            last.isHover = false;
          }
        } else {
          // Not overlapping - add as new position
          mergedPositions.push({ start: pos.start, end: pos.end, isHover });
        }
      }
    });

    // Build text with highlights
    let result = [];
    let lastEnd = 0;

    mergedPositions.forEach((pos, index) => {
      // Add text before this highlight
      if (pos.start > lastEnd) {
        result.push(text.substring(lastEnd, pos.start));
      }

      // Skip if this position starts before lastEnd (shouldn't happen after merging, but safety check)
      if (pos.start >= lastEnd) {
        const className = pos.isHover
          ? "bg-blue-200 dark:bg-blue-600/50 text-black dark:text-white"
          : "bg-yellow-200 dark:bg-yellow-600/50 text-black dark:text-white";

        result.push(
          <mark key={`highlight-${index}`} className={className}>
            {text.substring(pos.start, pos.end)}
          </mark>
        );

        lastEnd = pos.end;
      }
    });

    // Add remaining text
    if (lastEnd < text.length) {
      result.push(text.substring(lastEnd));
    }

    return <>{result}</>;
  };

  const hasSelection = selectedPositions.length > 0;

  const handleClearSelection = () => {
    setSelectedPositions([]);
    setLastSelectedPath(null);
  };

  // Always show split view with text and AST
  return (
    <div className="flex gap-2 w-full h-full overflow-hidden">
      {/* Text display with highlighting on the left - wrapper with height constraint */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        {/* Markdown Header */}
        <div className="flex items-center justify-between px-2 py-2 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Markdown</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Invisible button for height consistency */}
            <button
              type="button"
              disabled
              className="px-2 py-1 text-xs font-medium opacity-0 pointer-events-none border border-transparent rounded flex items-center gap-1"
            >
              0 selected
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Markdown content */}
        {hasSelection || hoveredPosition ? (
          // Show read-only highlighted view when hovering/selecting
          <div
            className="flex-1 p-3 overflow-auto bg-white dark:bg-gray-800 font-mono text-sm text-black dark:text-white cursor-pointer"
            onClick={hasSelection ? handleClearSelection : undefined}
            title={hasSelection ? "Click to clear selection and edit" : undefined}
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          >
            {renderTextWithHighlight()}
          </div>
        ) : (
          // Show editable textarea when not highlighting
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="flex-1 p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm text-black dark:text-white bg-white dark:bg-gray-800"
            placeholder="Enter your text here..."
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          />
        )}
      </div>

      {/* AST tree on the right - wrapper with height constraint */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        {/* AST Header */}
        <div className="flex items-center justify-between px-2 py-2 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">AST</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearSelection}
              type="button"
              title={hasSelection ? "Clear all selections and return to edit mode" : "No selections"}
              disabled={!hasSelection}
              className={`px-2 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded transition-colors flex items-center gap-1 ${
                hasSelection
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              {selectedPositions.length} selected
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* AST Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 p-2 text-sm">
          {error ? (
            <div className="text-red-600 dark:text-red-400 text-sm">
              Error parsing markdown: {error}
            </div>
          ) : hierarchicalAst ? (
            <TreeNode
              node={hierarchicalAst}
              depth={0}
              collapseAll={collapseAll}
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}
              selectedNodePaths={selectedPositions.map(p => p.path)}
              currentPath="/root"
            />
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm">
              Enter some markdown text to see the AST
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
