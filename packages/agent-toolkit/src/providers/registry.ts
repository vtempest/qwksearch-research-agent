/**
 * @module research/models/providers/registry
 * @description Provider registry with lazy loading to avoid circular dependencies
 */
import type { ProviderConstructor } from "./base";
import OpenAIProvider from "./openai";
import OllamaProvider from "./ollama";
import AnthropicProvider from "./anthropic";
import GeminiProvider from "./gemini";
import GroqProvider from "./groq";
import DeepSeekProvider from "./deepseek";
import NvidiaProvider from "./nvidia";
import OpenRouterProvider from "./openrouter";

// Direct export of providers - no lazy loading needed with proper import structure
export const providers: Record<string, ProviderConstructor<any>> = {
  openai: OpenAIProvider,
  ollama: OllamaProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  groq: GroqProvider,
  deepseek: DeepSeekProvider,
  nvidia: NvidiaProvider,
  openrouter: OpenRouterProvider,
};
