import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get('serverId');

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    const resources = await mcpClientManager.listResources(serverId);

    return NextResponse.json(resources);
  } catch (error) {
    console.error('MCP list resources error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to list resources' 
      },
      { status: 500 }
    );
  }
}

