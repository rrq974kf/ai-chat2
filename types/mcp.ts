export type TransportType = 'stdio' | 'sse' | 'streamable-http';

export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: TransportType;
  // STDIO transport 설정
  command?: string;
  args?: string[];
  // SSE, HTTP transport 설정
  url?: string;
  // 환경 변수
  env?: Record<string, string>;
}

export interface MCPConnectionStatus {
  serverId: string;
  connected: boolean;
  lastConnected?: number;
  error?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: string;
      text?: string;
    };
  }>;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

