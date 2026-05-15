import { MCPServerMetadata } from './baseMCPServer';

export type MCPTool = {
  name: string;
  description: string;
  inputSchema?: any;
};

export type MCPServerType = 'composio' | 'custom';

export type { MCPServerMetadata };
