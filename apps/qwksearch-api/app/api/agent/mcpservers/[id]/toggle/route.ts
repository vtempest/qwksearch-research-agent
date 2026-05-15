/**
 * @fileoverview MCP server toggle endpoint. POST enables or disables a
 * specific MCP server by ID.
 */
import configManager from '@/lib/config';
import { NextRequest } from 'next/server';

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const body = await req.json();
    const { enabled } = body;
    const { id } = await params;

    if (!id || typeof enabled !== 'boolean') {
      return Response.json(
        {
          message: 'Missing required fields.',
        },
        {
          status: 400,
        },
      );
    }

    const updatedServer = configManager.toggleMCPServer(id, enabled);

    return Response.json(
      {
        server: updatedServer,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error('An error occurred while toggling MCP server', err.message);
    return Response.json(
      {
        message: 'An error has occurred.',
      },
      {
        status: 500,
      },
    );
  }
};
