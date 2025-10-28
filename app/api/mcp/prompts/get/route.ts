import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const { serverId, promptName, arguments: args } = await request.json() as {
      serverId: string;
      promptName: string;
      arguments?: Record<string, string>;
    };

    if (!serverId || !promptName) {
      return NextResponse.json(
        { error: 'Server ID and prompt name are required' },
        { status: 400 }
      );
    }

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.getPrompt(serverId, promptName, args);

    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP get prompt error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get prompt' 
      },
      { status: 500 }
    );
  }
}

