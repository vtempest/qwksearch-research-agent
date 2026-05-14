/**
 * @module research/models/providers/nvidia
 * @description Research library module.
 */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Model, ModelList, ProviderMetadata } from "../types";
import BaseModelProvider from "./baseProvider";
import { ChatOpenAI } from "@langchain/openai";
import { UIConfigField } from "../../config/types";
import { getConfiguredModelProviderById } from "../../config/serverRegistry";

interface NvidiaConfig {
  apiKey: string;
  baseURL: string;
}

const defaultChatModels: Model[] = [
  {
    name: "Kimi 2.5",
    key: "moonshotai/kimi-k2-instruct",
  },
];

const providerConfigFields: UIConfigField[] = [
  {
    type: "password",
    name: "API Key",
    key: "apiKey",
    description: "Optional. Enter your own NVIDIA API key to override the site default. Leave blank to use the site-provided key.",
    required: true,
    placeholder: "NVIDIA API Key",
    env: "NVIDIA_API_KEY",
    scope: "server",
  },
  {
    type: "string",
    name: "Base URL",
    key: "baseURL",
    description: "The base URL for NVIDIA's OpenAI-compatible API",
    required: true,
    placeholder: "https://integrate.api.nvidia.com/v1",
    default: "https://integrate.api.nvidia.com/v1",
    env: "NVIDIA_BASE_URL",
    scope: "server",
  },
];

class NvidiaProvider extends BaseModelProvider<NvidiaConfig> {
  constructor(id: string, name: string, config: NvidiaConfig) {
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
      throw new Error("Error Loading NVIDIA Chat Model. Invalid Model Selected");
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

  static parseAndValidate(raw: any): NvidiaConfig {
    if (!raw || typeof raw !== "object")
      throw new Error("Invalid config provided. Expected object");
    if (!raw.apiKey)
      throw new Error("Invalid config provided. API key must be provided");

    return {
      apiKey: String(raw.apiKey),
      baseURL: String(raw.baseURL || "https://integrate.api.nvidia.com/v1"),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: "nvidia",
      name: "NVIDIA",
    };
  }
}

export default NvidiaProvider;
