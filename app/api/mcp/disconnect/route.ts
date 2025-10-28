import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const { serverId } = await request.json() as { serverId: string };

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    await mcpClientManager.disconnect(serverId);

    return NextResponse.json({ 
      success: true, 
      message: 'Disconnected successfully' 
    });
  } catch (error) {
    console.error('MCP disconnect error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to disconnect from MCP server' 
      },
      { status: 500 }
    );
  }
}

