/**
 * @fileoverview Single MCP server operations. DELETE removes an MCP server
 * by ID. PATCH updates an existing MCP server's name and configuration.
 */
import configManager from '@/lib/config';
import { NextRequest } from 'next/server';

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        {
          message: 'MCP Server ID is required.',
        },
        {
          status: 400,
        },
      );
    }

    configManager.removeMCPServer(id);

    return Response.json(
      {
        message: 'MCP server deleted successfully.',
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error('An error occurred while deleting MCP server', err.message);
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

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const body = await req.json();
    const { name, config } = body;
    const { id } = await params;

    if (!id || !name || !config) {
      return Response.json(
        {
          message: 'Missing required fields.',
        },
        {
          status: 400,
        },
      );
    }

    const updatedServer = await configManager.updateMCPServer(
      id,
      name,
      config,
    );

    return Response.json(
      {
        server: updatedServer,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error('An error occurred while updating MCP server', err.message);
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
