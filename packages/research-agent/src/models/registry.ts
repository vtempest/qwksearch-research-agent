/**
 * @fileoverview Registry for managing and loading AI model providers.
 * Handles initialization, model discovery, and dynamic provider switching.
 */
import { ConfigModelProvider } from '../config/types';
import BaseModelProvider, {
  createProviderInstance,
} from './providers/baseProvider';
import { getConfiguredModelProviders } from '../config/serverRegistry';
// Import directly from registry file to avoid circular dependency through providers/index.ts
import { providers } from './providers/registry';
import { MinimalProvider, ModelList } from './types';
import configManager from '../config';

/**
 * Registry for managing AI model providers and loading chat models.
 */
class ModelRegistry {
  activeProviders: (ConfigModelProvider & {
    provider: BaseModelProvider<any>;
  })[] = [];

  constructor() {
    this.initializeActiveProviders();
  }

  private initializeActiveProviders() {
    const configuredProviders = getConfiguredModelProviders();

    configuredProviders.forEach((p) => {
      try {
        const provider = providers[p.type];
        if (!provider) throw new Error('Invalid provider type');

        this.activeProviders.push({
          ...p,
          provider: createProviderInstance(provider, p.id, p.name, p.config),
        });
      } catch (err) {
        console.error(
          `Failed to initialize provider. Type: ${p.type}, ID: ${p.id}, Config: ${JSON.stringify(p.config)}, Error: ${err}`,
        );
      }
    });
  }

  async getActiveProviders() {
    const providers: MinimalProvider[] = [];

    await Promise.all(
      this.activeProviders.map(async (p) => {
        let m: ModelList = { chat: [] };

        try {
          m = await p.provider.getModelList();
        } catch (err: any) {
          console.error(
            `Failed to get model list. Type: ${p.type}, ID: ${p.id}, Error: ${err.message}`,
          );

          m = {
            chat: [
              {
                key: 'error',
                name: err.message,
              },
            ],
          };
        }

        providers.push({
          id: p.id,
          name: p.name,
          chatModels: m.chat,
        });
      }),
    );

    return providers;
  }

  async loadChatModel(providerId: string, modelName: string) {
    let provider = this.activeProviders.find((p) => p.id === providerId);

    // Fallback to any available provider if the requested one doesn't exist.
    // This handles guest users who may have a stale providerId in localStorage.
    if (!provider && this.activeProviders.length > 0) {
      // Prefer NVIDIA, then Groq, then anything else. The earlier version of
      // this code unconditionally reassigned `provider` for each name, which
      // erased an earlier match if a later one didn't exist.
      provider =
        this.activeProviders.find((p) =>
          p.name.toLowerCase().includes('nvidia'),
        ) ??
        this.activeProviders.find((p) =>
          p.name.toLowerCase().includes('groq'),
        ) ??
        this.activeProviders[0];

      console.log(
        `[ModelRegistry.loadChatModel] requested provider "${providerId}" not found, falling back to "${provider.id}" (${provider.name})`,
      );
    }

    if (!provider) {
      console.error(
        '[ModelRegistry.loadChatModel] no providers configured; activeProviders is empty',
      );
      throw new Error(
        'No model providers configured. Please add a provider in settings or set NVIDIA_API_KEY environment variable.',
      );
    }

    console.log(
      `[ModelRegistry.loadChatModel] loading model "${modelName}" from provider "${provider.id}" (${provider.type})`,
    );
    const model = await provider.provider.loadChatModel(modelName);

    return model;
  }

  /**
   * Check if a provider is using global environment-based API keys.
   * Used for rate limiting guest users.
   */
  isProviderEnvBased(providerId: string): boolean {
    let provider = this.activeProviders.find((p) => p.id === providerId);

    // If not found, check if fallback would use an env-based provider
    if (!provider && this.activeProviders.length > 0) {
      provider = this.activeProviders.find((p) =>
        p.name.toLowerCase().includes('nvidia'),
      );
      if (!provider) {
        provider = this.activeProviders.find((p) =>
          p.name.toLowerCase().includes('groq'),
        );
      }
      if (!provider) {
        provider = this.activeProviders[0];
      }
    }

    return provider?.isEnvBased === true;
  }

  async addProvider(
    type: string,
    config: Record<string, any>,
  ): Promise<ConfigModelProvider> {
    const provider = providers[type];
    if (!provider) throw new Error('Invalid provider type');

    const newProvider = configManager.addModelProvider(type, config);

    const instance = createProviderInstance(
      provider,
      newProvider.id,
      newProvider.name,
      newProvider.config,
    );

    let m: ModelList = { chat: [] };

    try {
      m = await instance.getModelList();
    } catch (err: any) {
      console.error(
        `Failed to get model list for newly added provider. Type: ${type}, ID: ${newProvider.id}, Error: ${err.message}`,
      );

      m = {
        chat: [
          {
            key: 'error',
            name: err.message,
          },
        ],
      };
    }

    this.activeProviders.push({
      ...newProvider,
      provider: instance,
    });

    return {
      ...newProvider,
      chatModels: m.chat || [],
    };
  }

  async removeProvider(providerId: string): Promise<void> {
    configManager.removeModelProvider(providerId);
    this.activeProviders = this.activeProviders.filter(
      (p) => p.id !== providerId,
    );

    return;
  }

  async updateProvider(
    providerId: string,
    config: any,
  ): Promise<ConfigModelProvider> {
    const updated = await configManager.updateModelProvider(
      providerId,
      config,
    );
    const instance = createProviderInstance(
      providers[updated.type],
      providerId,
      updated.name,
      config,
    );

    let m: ModelList = { chat: [] };

    try {
      m = await instance.getModelList();
    } catch (err: any) {
      console.error(
        `Failed to get model list for updated provider. Type: ${updated.type}, ID: ${updated.id}, Error: ${err.message}`,
      );

      m = {
        chat: [
          {
            key: 'error',
            name: err.message,
          },
        ],
      };
    }

    this.activeProviders.push({
      ...updated,
      provider: instance,
    });

    return {
      ...updated,
      chatModels: m.chat || [],
    };
  }

  /* Using async here because maybe in the future we might want to add some validation?? */
  async addProviderModel(
    providerId: string,
    type: 'chat',
    model: any,
  ): Promise<any> {
    const addedModel = configManager.addProviderModel(providerId, type, model);
    return addedModel;
  }

  async removeProviderModel(
    providerId: string,
    type: 'chat',
    modelKey: string,
  ): Promise<void> {
    configManager.removeProviderModel(providerId, type, modelKey);
    return;
  }
}

export default ModelRegistry;
