'use client';

import { splitterRegistry } from '../libs/splitters/registry';
import type { TextSplitterConfig } from '../libs/splitters/types';

interface SplitterConfigProps {
  splitterId: string;
  algorithm: string;
  config: TextSplitterConfig;
  onChange: (config: TextSplitterConfig) => void;
}

/**
 * Dynamic configuration component for text splitters
 * Renders algorithm-specific options based on the selected splitter
 */
export function SplitterConfig({
  splitterId,
  algorithm,
  config,
  onChange,
}: SplitterConfigProps) {
  const splitter = splitterRegistry.get(splitterId);

  if (!splitter) return null;

  const options = splitter.getAlgorithmConfig?.(algorithm) || [];

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <div key={option.key}>
          {option.type === 'range' && (
            <>
              <label
                htmlFor={option.key}
                className="block text-sm font-medium mb-1 text-black dark:text-white"
              >
                {option.label}: {config[option.key] ?? option.defaultValue}
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  id={option.key}
                  type="range"
                  min={option.min}
                  max={option.max}
                  step={option.step}
                  value={config[option.key] ?? option.defaultValue}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      [option.key]: Number(e.target.value),
                    })
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <input
                  type="number"
                  min={option.min}
                  max={option.max}
                  step={option.step}
                  value={config[option.key] ?? option.defaultValue}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      [option.key]: Number(e.target.value),
                    })
                  }
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-black dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{option.min}</span>
                <span>{option.max}</span>
              </div>
              {option.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </p>
              )}
            </>
          )}

          {option.type === 'number' && (
            <>
              <label
                htmlFor={option.key}
                className="block text-sm font-medium mb-1 text-black dark:text-white"
              >
                {option.label}
              </label>
              <input
                id={option.key}
                type="number"
                min={option.min}
                max={option.max}
                step={option.step}
                value={config[option.key] ?? option.defaultValue}
                onChange={(e) =>
                  onChange({ ...config, [option.key]: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-700"
              />
              {option.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </p>
              )}
            </>
          )}

          {option.type === 'boolean' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config[option.key] ?? option.defaultValue}
                onChange={(e) =>
                  onChange({ ...config, [option.key]: e.target.checked })
                }
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-black dark:text-white">
                {option.label}
              </span>
              {option.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({option.description})
                </span>
              )}
            </label>
          )}

          {option.type === 'select' && option.options && (
            <>
              <label
                htmlFor={option.key}
                className="block text-sm font-medium mb-1 text-black dark:text-white"
              >
                {option.label}
              </label>
              <select
                id={option.key}
                value={config[option.key] ?? option.defaultValue}
                onChange={(e) =>
                  onChange({ ...config, [option.key]: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-700"
              >
                {option.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {option.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
