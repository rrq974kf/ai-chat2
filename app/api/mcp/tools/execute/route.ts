import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const { serverId, toolName, arguments: args } = await request.json() as {
      serverId: string;
      toolName: string;
      arguments?: Record<string, unknown>;
    };

    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: 'Server ID and tool name are required' },
        { status: 400 }
      );
    }

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.callTool(serverId, toolName, args);

    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP call tool error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to execute tool',
        isError: true 
      },
      { status: 500 }
    );
  }
}

