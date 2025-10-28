'use client';

import { useState } from 'react';
import { FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { MCPResource } from '@/types/mcp';

interface ResourceViewerProps {
  resource: MCPResource;
  serverId: string;
  serverName: string;
}

export default function ResourceViewer({
  resource,
  serverId,
  serverName,
}: ResourceViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<{ contents?: Array<{ mimeType?: string; text?: string; blob?: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReadResource = async () => {
    setIsLoading(true);
    setError(null);
    setContent(null);

    try {
      const response = await fetch('/api/mcp/resources/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          uri: resource.uri,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to read resource');
      }

      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read resource');
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
            <h4 className="font-semibold text-gray-900 dark:text-white">{resource.name}</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({serverName})
            </span>
          </div>
          <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-1">
            {resource.uri}
          </div>
          {resource.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {resource.description}
            </p>
          )}
          {resource.mimeType && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              {resource.mimeType}
            </span>
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
          {!content && !isLoading && (
            <button
              onClick={handleReadResource}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              Read Resource
            </button>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {content && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-gray-900 dark:text-white">Content</h5>
                <button
                  onClick={handleReadResource}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Refresh
                </button>
              </div>
              
              {content.contents?.map((item, idx: number) => (
                <div key={idx} className="space-y-2">
                  {item.mimeType && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Type: {item.mimeType}
                    </div>
                  )}
                  
                  {item.text && (
                    <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {item.text}
                    </pre>
                  )}
                  
                  {item.blob && (
                    <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Binary data (base64): {item.blob.substring(0, 100)}...
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

