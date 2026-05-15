/**
 * @fileoverview MCP (Model Context Protocol) server management. GET lists all
 * configured MCP servers. POST registers a new MCP server with its type,
 * name, and connection config.
 */
import configManager from '@/lib/config';
import { getConfiguredMCPServers } from '@/lib/config/serverRegistry';
import { NextRequest } from 'next/server';

export const GET = async (req: Request) => {
  try {
    const servers = getConfiguredMCPServers();

    return Response.json(
      {
        servers,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error('An error occurred while fetching MCP servers', err);
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

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { type, name, config } = body;

    if (!type || !name || !config) {
      return Response.json(
        {
          message: 'Missing required fields.',
        },
        {
          status: 400,
        },
      );
    }

    const newServer = configManager.addMCPServer(type, name, config);

    return Response.json(
      {
        server: newServer,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error('An error occurred while creating MCP server', err);
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
