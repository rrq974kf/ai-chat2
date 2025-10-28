'use client';

import { useState } from 'react';
import { Trash2, Power, PowerOff, Loader2 } from 'lucide-react';
import type { MCPServerConfig, MCPConnectionStatus } from '@/types/mcp';

interface ServerCardProps {
  server: MCPServerConfig;
  status?: MCPConnectionStatus;
  onConnect: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function ServerCard({
  server,
  status,
  onConnect,
  onDisconnect,
  onDelete,
}: ServerCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isConnected = status?.connected ?? false;

  const handleToggleConnection = async () => {
    setIsLoading(true);
    try {
      if (isConnected) {
        await onDisconnect(server.id);
      } else {
        await onConnect(server.id);
      }
    } catch (error) {
      console.error('Connection toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransportLabel = (transport: string) => {
    switch (transport) {
      case 'stdio':
        return 'STDIO';
      case 'sse':
        return 'SSE';
      case 'streamable-http':
        return 'HTTP';
      default:
        return transport.toUpperCase();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {server.name}
            </h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                isConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {isConnected ? '연결됨' : '연결 안됨'}
            </span>
          </div>

          {server.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {server.description}
            </p>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Transport:</span>
              <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                {getTransportLabel(server.transport)}
              </span>
            </div>

            {server.transport === 'stdio' && server.command && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 dark:text-gray-400 shrink-0">Command:</span>
                <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 break-all">
                  {server.command} {server.args?.join(' ')}
                </code>
              </div>
            )}

            {(server.transport === 'sse' || server.transport === 'streamable-http') &&
              server.url && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">URL:</span>
                  <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 break-all">
                    {server.url}
                  </code>
                </div>
              )}
          </div>

          {status?.error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {status.error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleConnection}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-colors ${
              isConnected
                ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400'
                : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isConnected ? '연결 해제' : '연결'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isConnected ? (
              <PowerOff className="w-5 h-5" />
            ) : (
              <Power className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={() => onDelete(server.id)}
            disabled={isConnected}
            className="p-2 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 dark:bg-gray-700 dark:hover:bg-red-900/30 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="삭제"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

