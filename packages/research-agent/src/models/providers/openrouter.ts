/**
 * @module research/models/providers/openrouter
 * @description OpenRouter provider — OpenAI-compatible gateway that exposes
 * models from many vendors (Anthropic, Google, Meta, Mistral, etc.) via a
 * single API key.
 */
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Model, ModelList, ProviderMetadata } from '../types';
import BaseModelProvider from './baseProvider';
import { ChatOpenAI } from '@langchain/openai';
import { UIConfigField } from '../../config/types';
import { getConfiguredModelProviderById } from '../../config/serverRegistry';

interface OpenRouterConfig {
  apiKey: string;
  baseURL: string;
}

const defaultChatModels: Model[] = [
  { name: 'Claude Opus 4.7', key: 'anthropic/claude-opus-4-7' },
  { name: 'Claude Sonnet 4.6', key: 'anthropic/claude-sonnet-4-6' },
  { name: 'Claude Haiku 4.5', key: 'anthropic/claude-haiku-4-5' },
  { name: 'GPT-5', key: 'openai/gpt-5' },
  { name: 'GPT-5 Mini', key: 'openai/gpt-5-mini' },
  { name: 'GPT-4o', key: 'openai/gpt-4o' },
  { name: 'GPT-4o Mini', key: 'openai/gpt-4o-mini' },
  { name: 'Gemini 2.5 Pro', key: 'google/gemini-2.5-pro' },
  { name: 'Gemini 2.5 Flash', key: 'google/gemini-2.5-flash' },
  { name: 'Llama 3.3 70B', key: 'meta-llama/llama-3.3-70b-instruct' },
  { name: 'Mistral Large', key: 'mistralai/mistral-large' },
  { name: 'DeepSeek V3', key: 'deepseek/deepseek-chat' },
  { name: 'Qwen 2.5 72B', key: 'qwen/qwen-2.5-72b-instruct' },
];

const providerConfigFields: UIConfigField[] = [
  {
    type: 'password',
    name: 'API Key',
    key: 'apiKey',
    description: 'Your OpenRouter API key (get one at openrouter.ai/keys)',
    required: true,
    placeholder: 'sk-or-...',
    env: 'OPENROUTER_API_KEY',
    scope: 'server',
  },
  {
    type: 'string',
    name: 'Base URL',
    key: 'baseURL',
    description: 'The base URL for the OpenRouter API',
    required: true,
    placeholder: 'https://openrouter.ai/api/v1',
    default: 'https://openrouter.ai/api/v1',
    env: 'OPENROUTER_BASE_URL',
    scope: 'server',
  },
];

class OpenRouterProvider extends BaseModelProvider<OpenRouterConfig> {
  constructor(id: string, name: string, config: OpenRouterConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    return { chat: defaultChatModels };
  }

  async getModelList(): Promise<ModelList> {
    const defaultModels = await this.getDefaultModels();
    const configProvider = getConfiguredModelProviderById(this.id)!;

    return {
      chat: [...defaultModels.chat, ...configProvider.chatModels],
    };
  }

  async loadChatModel(key: string): Promise<BaseChatModel> {
    const modelList = await this.getModelList();
    const exists = modelList.chat.find((m) => m.key === key);

    if (!exists) {
      throw new Error(
        'Error Loading OpenRouter Chat Model. Invalid Model Selected',
      );
    }

    return new ChatOpenAI({
      apiKey: this.config.apiKey,
      temperature: 0.7,
      model: key,
      configuration: {
        baseURL: this.config.baseURL,
        defaultHeaders: {
          'HTTP-Referer': 'https://qwksearch.com',
          'X-Title': 'QwkSearch',
        },
      },
    }) as unknown as BaseChatModel;
  }

  static parseAndValidate(raw: any): OpenRouterConfig {
    if (!raw || typeof raw !== 'object')
      throw new Error('Invalid config provided. Expected object');
    if (!raw.apiKey || !raw.baseURL)
      throw new Error(
        'Invalid config provided. API key and base URL must be provided',
      );

    return {
      apiKey: String(raw.apiKey),
      baseURL: String(raw.baseURL),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: 'openrouter',
      name: 'OpenRouter',
    };
  }
}

export default OpenRouterProvider;
