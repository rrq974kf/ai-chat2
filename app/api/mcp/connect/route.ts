import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';
import type { MCPServerConfig } from '@/types/mcp';

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json() as { config: MCPServerConfig };

    if (!config || !config.id || !config.transport) {
      return NextResponse.json(
        { error: 'Invalid server configuration' },
        { status: 400 }
      );
    }

    await mcpClientManager.connect(config);

    return NextResponse.json({ 
      success: true, 
      message: `Connected to ${config.name}` 
    });
  } catch (error) {
    console.error('MCP connect error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to connect to MCP server' 
      },
      { status: 500 }
    );
  }
}

