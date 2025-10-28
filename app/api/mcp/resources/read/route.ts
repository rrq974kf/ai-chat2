import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const { serverId, uri } = await request.json() as {
      serverId: string;
      uri: string;
    };

    if (!serverId || !uri) {
      return NextResponse.json(
        { error: 'Server ID and URI are required' },
        { status: 400 }
      );
    }

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.readResource(serverId, uri);

    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP read resource error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to read resource' 
      },
      { status: 500 }
    );
  }
}

