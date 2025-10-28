'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  MCPServerConfig, 
  MCPConnectionStatus, 
  MCPTool, 
  MCPPrompt, 
  MCPResource 
} from '@/types/mcp';

interface MCPContextType {
  servers: MCPServerConfig[];
  connections: MCPConnectionStatus[];
  addServer: (server: Omit<MCPServerConfig, 'id'>) => void;
  updateServer: (id: string, server: Partial<MCPServerConfig>) => void;
  removeServer: (id: string) => void;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  isServerConnected: (id: string) => boolean;
  getConnectionStatus: (id: string) => MCPConnectionStatus | undefined;
  exportConfig: () => void;
  importConfig: (file: File) => Promise<void>;
  refreshServerData: (serverId: string) => Promise<void>;
  // 캐시된 데이터
  toolsCache: Map<string, MCPTool[]>;
  promptsCache: Map<string, MCPPrompt[]>;
  resourcesCache: Map<string, MCPResource[]>;
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

const STORAGE_KEY_SERVERS = 'mcp-servers';
const STORAGE_KEY_CONNECTIONS = 'mcp-connections';
const STORAGE_KEY_TOOLS_CACHE = 'mcp-tools-cache';
const STORAGE_KEY_PROMPTS_CACHE = 'mcp-prompts-cache';
const STORAGE_KEY_RESOURCES_CACHE = 'mcp-resources-cache';

// Map <-> Object 변환 헬퍼 함수
const mapToObject = <T,>(map: Map<string, T>): Record<string, T> => {
  const obj: Record<string, T> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};

const objectToMap = <T,>(obj: Record<string, T>): Map<string, T> => {
  const map = new Map<string, T>();
  Object.entries(obj).forEach(([key, value]) => {
    map.set(key, value);
  });
  return map;
};

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [connections, setConnections] = useState<MCPConnectionStatus[]>([]);
  const [toolsCache, setToolsCache] = useState<Map<string, MCPTool[]>>(new Map());
  const [promptsCache, setPromptsCache] = useState<Map<string, MCPPrompt[]>>(new Map());
  const [resourcesCache, setResourcesCache] = useState<Map<string, MCPResource[]>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // LocalStorage에서 서버 설정 및 캐시 로드
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 서버 및 연결 상태 복원
        const savedServers = localStorage.getItem(STORAGE_KEY_SERVERS);
        const savedConnections = localStorage.getItem(STORAGE_KEY_CONNECTIONS);

        if (savedServers) {
          setServers(JSON.parse(savedServers));
        }
        if (savedConnections) {
          setConnections(JSON.parse(savedConnections));
        }

        // 캐시 복원
        const savedToolsCache = localStorage.getItem(STORAGE_KEY_TOOLS_CACHE);
        const savedPromptsCache = localStorage.getItem(STORAGE_KEY_PROMPTS_CACHE);
        const savedResourcesCache = localStorage.getItem(STORAGE_KEY_RESOURCES_CACHE);

        if (savedToolsCache) {
          setToolsCache(objectToMap(JSON.parse(savedToolsCache)));
        }
        if (savedPromptsCache) {
          setPromptsCache(objectToMap(JSON.parse(savedPromptsCache)));
        }
        if (savedResourcesCache) {
          setResourcesCache(objectToMap(JSON.parse(savedResourcesCache)));
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load MCP config from localStorage:', error);
        setIsInitialized(true);
      }
    };

    initializeData();
  }, []);

  // 서버 목록이 변경될 때마다 저장
  useEffect(() => {
    if (servers.length > 0) {
      localStorage.setItem(STORAGE_KEY_SERVERS, JSON.stringify(servers));
    }
  }, [servers]);

  // 연결 상태가 변경될 때마다 저장
  useEffect(() => {
    if (connections.length > 0) {
      localStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(connections));
    }
  }, [connections]);

  // 캐시를 localStorage에 저장
  useEffect(() => {
    if (isInitialized && toolsCache.size > 0) {
      localStorage.setItem(STORAGE_KEY_TOOLS_CACHE, JSON.stringify(mapToObject(toolsCache)));
    }
  }, [toolsCache, isInitialized]);

  useEffect(() => {
    if (isInitialized && promptsCache.size > 0) {
      localStorage.setItem(STORAGE_KEY_PROMPTS_CACHE, JSON.stringify(mapToObject(promptsCache)));
    }
  }, [promptsCache, isInitialized]);

  useEffect(() => {
    if (isInitialized && resourcesCache.size > 0) {
      localStorage.setItem(STORAGE_KEY_RESOURCES_CACHE, JSON.stringify(mapToObject(resourcesCache)));
    }
  }, [resourcesCache, isInitialized]);

  // 초기화 완료 후 연결된 서버들의 데이터 재검증
  useEffect(() => {
    if (!isInitialized) return;

    const verifyConnections = async () => {
      const connectedServers = connections.filter(c => c.connected);
      
      for (const conn of connectedServers) {
        try {
          // 서버 데이터 가져오기 시도
          const toolsRes = await fetch(`/api/mcp/tools?serverId=${conn.serverId}`);
          
          if (!toolsRes.ok) {
            // 연결 실패 시 상태 업데이트
            setConnections(prev =>
              prev.map(c =>
                c.serverId === conn.serverId
                  ? { ...c, connected: false, error: 'Server connection lost' }
                  : c
              )
            );
            continue;
          }

          // 데이터 새로고침
          const tools = await toolsRes.json();
          setToolsCache(prev => new Map(prev).set(conn.serverId, tools));

          const promptsRes = await fetch(`/api/mcp/prompts?serverId=${conn.serverId}`);
          if (promptsRes.ok) {
            const prompts = await promptsRes.json();
            setPromptsCache(prev => new Map(prev).set(conn.serverId, prompts));
          }

          const resourcesRes = await fetch(`/api/mcp/resources?serverId=${conn.serverId}`);
          if (resourcesRes.ok) {
            const resources = await resourcesRes.json();
            setResourcesCache(prev => new Map(prev).set(conn.serverId, resources));
          }

          console.log(`✅ MCP 세션 복원 성공: ${conn.serverId}`);
        } catch (error) {
          console.error(`❌ MCP 세션 복원 실패: ${conn.serverId}`, error);
          // 연결 실패 시 상태 업데이트
          setConnections(prev =>
            prev.map(c =>
              c.serverId === conn.serverId
                ? { ...c, connected: false, error: 'Failed to restore session' }
                : c
            )
          );
        }
      }
    };

    verifyConnections();
  }, [isInitialized]);

  const addServer = useCallback((server: Omit<MCPServerConfig, 'id'>) => {
    const newServer: MCPServerConfig = {
      ...server,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setServers(prev => [...prev, newServer]);
  }, []);

  const updateServer = useCallback((id: string, updates: Partial<MCPServerConfig>) => {
    setServers(prev =>
      prev.map(server => (server.id === id ? { ...server, ...updates } : server))
    );
  }, []);

  const removeServer = useCallback(async (id: string) => {
    // 연결된 경우 먼저 연결 해제
    if (isServerConnected(id)) {
      await disconnectServer(id);
    }
    
    setServers(prev => prev.filter(server => server.id !== id));
    setConnections(prev => prev.filter(conn => conn.serverId !== id));
    
    // 캐시 삭제
    setToolsCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(id);
      return newCache;
    });
    setPromptsCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(id);
      return newCache;
    });
    setResourcesCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(id);
      return newCache;
    });
  }, []);

  const connectServer = useCallback(async (id: string) => {
    const server = servers.find(s => s.id === id);
    if (!server) {
      throw new Error('Server not found');
    }

    try {
      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: server }),
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = error.error || 'Failed to connect';
        
        // 타임아웃 에러 시 더 구체적인 안내
        if (errorMessage.includes('Request timed out') || errorMessage.includes('-32001')) {
          errorMessage = `연결 타임아웃: MCP 서버를 시작할 수 없습니다.\n\n` +
            `해결 방법:\n` +
            `1. Command와 Args가 올바르게 분리되어 있는지 확인하세요.\n` +
            `   예: Command="npx", Args="-y @modelcontextprotocol/server-time"\n` +
            `2. Windows에서는 npx를 사용하세요 (Node.js와 함께 설치됨).\n` +
            `3. 서버 목록에서 삭제 후 "Time Server" 프리셋 버튼으로 다시 추가해보세요.`;
        }
        
        throw new Error(errorMessage);
      }

      // 연결 상태 업데이트
      setConnections(prev => {
        const filtered = prev.filter(c => c.serverId !== id);
        return [
          ...filtered,
          {
            serverId: id,
            connected: true,
            lastConnected: Date.now(),
          },
        ];
      });

      // 연결 후 데이터 새로고침
      await refreshServerData(id);
    } catch (error) {
      console.error('Failed to connect server:', error);
      
      // 에러 상태 업데이트
      setConnections(prev => {
        const filtered = prev.filter(c => c.serverId !== id);
        return [
          ...filtered,
          {
            serverId: id,
            connected: false,
            error: error instanceof Error ? error.message : 'Connection failed',
          },
        ];
      });
      
      throw error;
    }
  }, [servers]);

  const disconnectServer = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: id }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      // 연결 상태 업데이트
      setConnections(prev =>
        prev.map(conn =>
          conn.serverId === id ? { ...conn, connected: false } : conn
        )
      );
    } catch (error) {
      console.error('Failed to disconnect server:', error);
      throw error;
    }
  }, []);

  const isServerConnected = useCallback(
    (id: string) => {
      const status = connections.find(c => c.serverId === id);
      return status?.connected ?? false;
    },
    [connections]
  );

  const getConnectionStatus = useCallback(
    (id: string) => {
      return connections.find(c => c.serverId === id);
    },
    [connections]
  );

  const refreshServerData = useCallback(async (serverId: string) => {
    const connected = connections.find(c => c.serverId === serverId)?.connected;
    if (!connected) {
      return;
    }

    try {
      // 도구 목록 가져오기
      const toolsRes = await fetch(`/api/mcp/tools?serverId=${serverId}`);
      if (!toolsRes.ok) {
        throw new Error('Failed to fetch tools');
      }
      const tools = await toolsRes.json();
      setToolsCache(prev => new Map(prev).set(serverId, tools));

      // 프롬프트 목록 가져오기
      const promptsRes = await fetch(`/api/mcp/prompts?serverId=${serverId}`);
      if (promptsRes.ok) {
        const prompts = await promptsRes.json();
        setPromptsCache(prev => new Map(prev).set(serverId, prompts));
      }

      // 리소스 목록 가져오기
      const resourcesRes = await fetch(`/api/mcp/resources?serverId=${serverId}`);
      if (resourcesRes.ok) {
        const resources = await resourcesRes.json();
        setResourcesCache(prev => new Map(prev).set(serverId, resources));
      }
    } catch (error) {
      console.error('Failed to refresh server data:', error);
      // 에러 발생 시 연결 상태를 false로 업데이트
      setConnections(prev =>
        prev.map(c =>
          c.serverId === serverId
            ? { ...c, connected: false, error: 'Failed to fetch server data' }
            : c
        )
      );
      throw error;
    }
  }, [connections]);

  const exportConfig = useCallback(() => {
    const config = {
      servers,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [servers]);

  const importConfig = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      if (!config.servers || !Array.isArray(config.servers)) {
        throw new Error('Invalid config file format');
      }

      // 기존 서버와 ID 충돌 방지
      const importedServers = config.servers.map((server: MCPServerConfig) => ({
        ...server,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      }));

      setServers(prev => [...prev, ...importedServers]);
    } catch (error) {
      console.error('Failed to import config:', error);
      throw error;
    }
  }, []);

  const value: MCPContextType = {
    servers,
    connections,
    addServer,
    updateServer,
    removeServer,
    connectServer,
    disconnectServer,
    isServerConnected,
    getConnectionStatus,
    exportConfig,
    importConfig,
    refreshServerData,
    toolsCache,
    promptsCache,
    resourcesCache,
  };

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error('useMCP must be used within MCPProvider');
  }
  return context;
}

