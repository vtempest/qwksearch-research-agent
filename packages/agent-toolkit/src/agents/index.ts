/**
 * @fileoverview Barrel export for the agents module.
 * Exposes prompts, tools, model registry, provider factory, and the
 * top-level generate function in a single import surface.
 */

export {
  generateLanguageResponse,
  convertMarkdownToHTMLEscaped,
} from "./generate-language";

export type {
  LLMProviderName,
  GenerateLanguageOptions,
  GenerateLanguageResult,
} from "./generate-language";

export type {
  AgentPrompt,
  AgentTool,
} from "./generate-language-types";

export { AGENT_PROMPTS, extractJSONFromLanguageReply } from "./agent-prompts";
export { AGENT_TOOLS } from "./agent-tools";
export { LANGUAGE_MODELS, LANGUAGE_PROVIDERS } from "./language-model-names";
export { createLLMProvider } from "./llm-providers";
