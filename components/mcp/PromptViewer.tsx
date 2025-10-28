'use client';

import { useState } from 'react';
import { Eye, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { MCPPrompt } from '@/types/mcp';

interface PromptViewerProps {
  prompt: MCPPrompt;
  serverId: string;
  serverName: string;
}

export default function PromptViewer({ prompt, serverId, serverName }: PromptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetPrompt = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/mcp/prompts/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          promptName: prompt.name,
          arguments: args,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get prompt');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get prompt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">{prompt.name}</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({serverName})
            </span>
          </div>
          {prompt.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{prompt.description}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* 프롬프트 인자 */}
          {prompt.arguments && prompt.arguments.length > 0 ? (
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900 dark:text-white">Arguments</h5>
              {prompt.arguments.map((arg) => (
                <div key={arg.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {arg.name}
                    {arg.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {arg.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {arg.description}
                    </p>
                  )}
                  <input
                    type="text"
                    value={args[arg.name] || ''}
                    onChange={(e) => setArgs({ ...args, [arg.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No arguments required
            </p>
          )}

          {/* 가져오기 버튼 */}
          <button
            onClick={handleGetPrompt}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Get Prompt
              </>
            )}
          </button>

          {/* 에러 표시 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* 결과 표시 */}
          {result && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900 dark:text-white">Prompt Content</h5>
              {result.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result.description}
                </p>
              )}
              <div className="space-y-2">
                {result.messages?.map((msg: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {msg.role}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {msg.content.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

