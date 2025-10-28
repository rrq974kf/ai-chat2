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

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [connections, setConnections] = useState<MCPConnectionStatus[]>([]);
  const [toolsCache, setToolsCache] = useState<Map<string, MCPTool[]>>(new Map());
  const [promptsCache, setPromptsCache] = useState<Map<string, MCPPrompt[]>>(new Map());
  const [resourcesCache, setResourcesCache] = useState<Map<string, MCPResource[]>>(new Map());

  // LocalStorage에서 서버 설정 로드
  useEffect(() => {
    try {
      const savedServers = localStorage.getItem(STORAGE_KEY_SERVERS);
      const savedConnections = localStorage.getItem(STORAGE_KEY_CONNECTIONS);

      if (savedServers) {
        setServers(JSON.parse(savedServers));
      }
      if (savedConnections) {
        setConnections(JSON.parse(savedConnections));
      }
    } catch (error) {
      console.error('Failed to load MCP config from localStorage:', error);
    }
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
        throw new Error(error.error || 'Failed to connect');
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
    if (!isServerConnected(serverId)) {
      return;
    }

    try {
      // 도구 목록 가져오기
      const toolsRes = await fetch(`/api/mcp/tools?serverId=${serverId}`);
      if (toolsRes.ok) {
        const tools = await toolsRes.json();
        setToolsCache(prev => new Map(prev).set(serverId, tools));
      }

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
    }
  }, [isServerConnected]);

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

