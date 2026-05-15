import { UIConfigField } from '../config/types';

export type MCPServerMetadata = {
  name: string;
  key: string;
  description: string;
  icon?: string;
};

abstract class BaseMCPServer<CONFIG> {
  constructor(
    protected id: string,
    protected name: string,
    protected config: CONFIG,
  ) { }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getTools(): Promise<any[]>;
  abstract isConnected(): boolean;

  static getServerConfigFields(): UIConfigField[] {
    throw new Error('Method not implemented.');
  }

  static getServerMetadata(): MCPServerMetadata {
    throw new Error('Method not implemented.');
  }

  static parseAndValidate(raw: any): any {
    throw new Error('Method not implemented.');
  }
}

export type MCPServerConstructor<CONFIG> = {
  new(id: string, name: string, config: CONFIG): BaseMCPServer<CONFIG>;
  parseAndValidate(raw: any): CONFIG;
  getServerConfigFields: () => UIConfigField[];
  getServerMetadata: () => MCPServerMetadata;
};

export const createMCPServerInstance = <P extends MCPServerConstructor<any>>(
  Server: P,
  id: string,
  name: string,
  rawConfig: unknown,
): InstanceType<P> => {
  const cfg = Server.parseAndValidate(rawConfig);
  return new Server(id, name, cfg) as InstanceType<P>;
};

export default BaseMCPServer;
