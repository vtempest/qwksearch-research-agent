/**
 * @module research/models/providers/openrouter
 * @description Research library module.
 */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Model, ModelList, ProviderMetadata } from "../types";
import BaseModelProvider from "./baseProvider";
import { ChatOpenAI } from "@langchain/openai";
import { UIConfigField } from "../../config/types";
import { getConfiguredModelProviderById } from "../../config/serverRegistry";

interface OpenRouterConfig {
  apiKey: string;
  baseURL: string;
}

const defaultChatModels: Model[] = [
  {
    name: "Claude Sonnet 4.5",
    key: "anthropic/claude-sonnet-4.5",
  },
  {
    name: "GPT-4o",
    key: "openai/gpt-4o",
  },
  {
    name: "DeepSeek V3",
    key: "deepseek/deepseek-chat",
  },
  {
    name: "Llama 3.3 70B",
    key: "meta-llama/llama-3.3-70b-instruct",
  },
];

const providerConfigFields: UIConfigField[] = [
  {
    type: "password",
    name: "API Key",
    key: "apiKey",
    description: "Your OpenRouter API key",
    required: true,
    placeholder: "OpenRouter API Key",
    env: "OPENROUTER_API_KEY",
    scope: "server",
  },
  {
    type: "string",
    name: "Base URL",
    key: "baseURL",
    description: "The base URL for OpenRouter's OpenAI-compatible API",
    required: true,
    placeholder: "https://openrouter.ai/api/v1",
    default: "https://openrouter.ai/api/v1",
    env: "OPENROUTER_BASE_URL",
    scope: "server",
  },
];

class OpenRouterProvider extends BaseModelProvider<OpenRouterConfig> {
  constructor(id: string, name: string, config: OpenRouterConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    return {
      chat: defaultChatModels,
    };
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
        "Error Loading OpenRouter Chat Model. Invalid Model Selected",
      );
    }

    return new ChatOpenAI({
      apiKey: this.config.apiKey,
      temperature: 0.7,
      model: key,
      configuration: {
        baseURL: this.config.baseURL,
      },
    }) as unknown as BaseChatModel;
  }

  static parseAndValidate(raw: any): OpenRouterConfig {
    if (!raw || typeof raw !== "object")
      throw new Error("Invalid config provided. Expected object");
    if (!raw.apiKey)
      throw new Error("Invalid config provided. API key must be provided");

    return {
      apiKey: String(raw.apiKey),
      baseURL: String(raw.baseURL || "https://openrouter.ai/api/v1"),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: "openrouter",
      name: "OpenRouter",
    };
  }
}

export default OpenRouterProvider;
