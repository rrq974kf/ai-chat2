'use client';

import { useState } from 'react';
import { Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { MCPTool } from '@/types/mcp';

interface ToolExecutorProps {
  tool: MCPTool;
  serverId: string;
  serverName: string;
}

export default function ToolExecutor({ tool, serverId, serverName }: ToolExecutorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      // 문자열 args를 적절한 타입으로 변환
      const parsedArgs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        try {
          // JSON으로 파싱 시도 (숫자, boolean, 객체 등)
          parsedArgs[key] = JSON.parse(value);
        } catch {
          // 파싱 실패 시 문자열로 유지
          parsedArgs[key] = value;
        }
      }

      const response = await fetch('/api/mcp/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          toolName: tool.name,
          arguments: parsedArgs,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.isError) {
        throw new Error(data.error || 'Tool execution failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute tool');
    } finally {
      setIsExecuting(false);
    }
  };

  const properties = tool.inputSchema.properties || {};
  const required = tool.inputSchema.required || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">{tool.name}</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({serverName})
            </span>
          </div>
          {tool.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
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
          {/* 입력 파라미터 */}
          {Object.keys(properties).length > 0 ? (
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900 dark:text-white">Parameters</h5>
              {Object.entries(properties).map(([key, schema]: [string, { description?: string; type?: string }]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {key}
                    {required.includes(key) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {schema.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {schema.description}
                    </p>
                  )}
                  <input
                    type="text"
                    value={args[key] || ''}
                    onChange={(e) => setArgs({ ...args, [key]: e.target.value })}
                    placeholder={schema.type || 'string'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No parameters required
            </p>
          )}

          {/* 실행 버튼 */}
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute
              </>
            )}
          </button>

          {/* 결과 표시 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900 dark:text-white">Result</h5>
              <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

