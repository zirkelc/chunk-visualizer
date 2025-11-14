'use client';

import type { ReactNode } from 'react';

interface ContainerProps {
  label: string;
  layoutMode: 'column' | 'row';
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  children: ReactNode;
  // Optional toggleable section
  toggleableSection?: ReactNode;
  toggleableLabel?: string;
  toggleableButtonContent?: ReactNode; // Custom button content (overrides toggleableLabel)
  toggleableVisible?: boolean;
  onToggleVisible?: () => void;
}

export function Container({
  label,
  layoutMode,
  collapsed,
  onToggleCollapse,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
  children,
  toggleableSection,
  toggleableLabel,
  toggleableButtonContent,
  toggleableVisible = false,
  onToggleVisible,
}: ContainerProps) {
  const hasToggleable = toggleableSection && onToggleVisible;

  return (
    <div
      className={`${
        layoutMode === 'column'
          ? collapsed
            ? 'flex flex-col h-full w-12 flex-shrink-0'
            : 'flex flex-col h-full overflow-hidden'
          : collapsed
            ? 'h-12 w-full flex-shrink-0'
            : 'h-full w-full overflow-hidden flex flex-col'
      }`}
    >
      {/* Collapsed state - show vertical/horizontal label */}
      {collapsed && (
        <div
          className={`bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            layoutMode === 'column'
              ? 'h-full items-start justify-center pt-4'
              : 'h-12 items-center justify-center'
          }`}
          onClick={onToggleCollapse}
        >
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${
              layoutMode === 'column' ? 'writing-mode-vertical transform -rotate-180' : ''
            }`}
            style={layoutMode === 'column' ? { writingMode: 'vertical-rl' } : {}}
          >
            {label}
          </span>
        </div>
      )}

      {/* Expanded state - show parent box with content */}
      {!collapsed && (
        <div className="flex flex-col h-full overflow-hidden bg-gray-100 dark:bg-gray-850 p-3 rounded-lg gap-3 border border-gray-300 dark:border-gray-600">
          {/* Top bar with label and controls */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-black dark:text-white">
                {label}
              </label>

              {/* Toggle button for optional section - moved to left side */}
              {hasToggleable && (
                <button
                  onClick={onToggleVisible}
                  type="button"
                  title={`${toggleableVisible ? 'Hide' : 'Show'} ${toggleableLabel || 'options'}`}
                  className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded transition-colors"
                >
                  {toggleableButtonContent || toggleableLabel || 'Options'}
                </button>
              )}
            </div>

            {/* Right side controls - arrows and collapse button */}
            <div className="flex items-center gap-1">
              <button
                onClick={onMoveLeft}
                type="button"
                title={layoutMode === 'column' ? 'Move left' : 'Move up'}
                disabled={!canMoveLeft}
                className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {layoutMode === 'column' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  )}
                </svg>
              </button>
              <button
                onClick={onMoveRight}
                type="button"
                title={layoutMode === 'column' ? 'Move right' : 'Move down'}
                disabled={!canMoveRight}
                className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {layoutMode === 'column' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  )}
                </svg>
              </button>

              {/* Collapse button */}
              <button
                onClick={onToggleCollapse}
                type="button"
                title={collapsed ? 'Expand' : 'Collapse'}
                className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {collapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Toggleable section (if present and visible) */}
          {hasToggleable && toggleableVisible && (
            <div className="flex-shrink-0 max-h-[40%] overflow-y-auto">
              {toggleableSection}
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
