import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { MCPServerConfig, MCPTool, MCPPrompt, MCPResource } from '@/types/mcp';

class MCPClientManager {
  private static instance: MCPClientManager;
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  async connect(config: MCPServerConfig): Promise<void> {
    // 이미 연결되어 있으면 재연결
    if (this.clients.has(config.id)) {
      await this.disconnect(config.id);
    }

    const client = new Client(
      {
        name: 'ai-chat-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      }
    );

    let transport;

    try {
      switch (config.transport) {
        case 'stdio': {
          if (!config.command) {
            throw new Error('STDIO transport requires command');
          }
          
          // STDIO는 서버 환경에서만 동작
          if (typeof window !== 'undefined') {
            throw new Error('STDIO transport is not supported in browser');
          }

          transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: config.env,
          });
          break;
        }

        case 'sse': {
          if (!config.url) {
            throw new Error('SSE transport requires URL');
          }

          transport = new SSEClientTransport(new URL(config.url));
          break;
        }

        case 'streamable-http': {
          if (!config.url) {
            throw new Error('Streamable HTTP transport requires URL');
          }

          transport = new StreamableHTTPClientTransport(new URL(config.url));
          break;
        }

        default:
          throw new Error(`Unsupported transport type: ${config.transport}`);
      }

      await client.connect(transport);
      
      this.clients.set(config.id, client);
      this.transports.set(config.id, transport);
      
      console.log(`Connected to MCP server: ${config.name} (${config.id})`);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${config.name}:`, error);
      
      // STDIO transport 에러 시 더 구체적인 정보 제공
      if (config.transport === 'stdio') {
        const commandStr = config.args 
          ? `${config.command} ${config.args.join(' ')}`
          : config.command;
        console.error(`Command attempted: ${commandStr}`);
        
        // 에러 메시지 개선
        if (error instanceof Error && error.message.includes('timed out')) {
          throw new Error(
            `MCP 서버 연결 타임아웃: "${commandStr}" 명령을 실행할 수 없습니다.\n` +
            `Command와 Args가 올바르게 설정되었는지 확인해주세요.`
          );
        }
      }
      
      throw error;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    const transport = this.transports.get(serverId);

    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.error(`Error closing client for ${serverId}:`, error);
      }
      this.clients.delete(serverId);
    }

    if (transport && typeof transport.close === 'function') {
      try {
        await transport.close();
      } catch (error) {
        console.error(`Error closing transport for ${serverId}:`, error);
      }
      this.transports.delete(serverId);
    }
  }

  getClient(serverId: string): Client | undefined {
    return this.clients.get(serverId);
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client found for server: ${serverId}`);
    }

    const response = await client.listTools();
    return response.tools as MCPTool[];
  }

  async callTool(serverId: string, name: string, args?: Record<string, unknown>) {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client found for server: ${serverId}`);
    }

    return await client.callTool({ name, arguments: args });
  }

  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client found for server: ${serverId}`);
    }

    const response = await client.listPrompts();
    return response.prompts as MCPPrompt[];
  }

  async getPrompt(serverId: string, name: string, args?: Record<string, string>) {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client found for server: ${serverId}`);
    }

    return await client.getPrompt({ name, arguments: args });
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client found for server: ${serverId}`);
    }

    const response = await client.listResources();
    return response.resources as MCPResource[];
  }

  async readResource(serverId: string, uri: string) {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client found for server: ${serverId}`);
    }

    return await client.readResource({ uri });
  }

  // 모든 연결된 서버의 도구 목록 반환 (AI Function Calling용)
  async getAllTools(): Promise<Array<MCPTool & { serverId: string }>> {
    const allTools: Array<MCPTool & { serverId: string }> = [];

    for (const [serverId, client] of this.clients.entries()) {
      try {
        const tools = await this.listTools(serverId);
        allTools.push(...tools.map(tool => ({ ...tool, serverId })));
      } catch (error) {
        console.error(`Failed to list tools for ${serverId}:`, error);
      }
    }

    return allTools;
  }

  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    await Promise.all(serverIds.map(id => this.disconnect(id)));
  }
}

// 싱글톤 인스턴스 export
export const mcpClientManager = MCPClientManager.getInstance();

