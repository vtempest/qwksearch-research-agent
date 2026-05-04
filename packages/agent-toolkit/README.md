# ai-research-agent

Multi-provider AI agent toolkit for generating language responses, searching the web, extracting page content, and managing long-term memory across 10+ LLM providers.

Built on top of [LangChain](https://js.langchain.com) and [LangGraph](https://langchain-ai.github.io/langgraphjs/), with a small registry of pre-tuned agent prompts (research, summarization, citation answering, query resolution, knowledge-graph extraction, etc.) and tool wrappers around the [QwkSearch](https://qwksearch.com) API.

## Install

```bash
npm install ai-research-agent
```

## Quick start

```ts
import { generateLanguageResponse } from "ai-research-agent";

const response = await generateLanguageResponse({
  provider: "groq",
  apiKey: process.env.GROQ_API_KEY,
  agent: "question",
  query: "Explain transformer attention in two sentences.",
});

console.log(response.content);
```

`response.content` is HTML by default (set `html: false` for raw Markdown). Agents that define an `after` hook also return parsed data on `response.extract`.

## Supported providers

| Provider      | ID             | Default model                                     | Notes                       |
| ------------- | -------------- | ------------------------------------------------- | --------------------------- |
| Anthropic     | `anthropic`  | `claude-3-7-sonnet-20250219`                    |                             |
| OpenAI        | `openai`     | `gpt-4o`                                        |                             |
| Groq          | `groq`       | `meta-llama/llama-4-maverick-17b-128e-instruct` |                             |
| Google Vertex | `google`     | Gemini 2.x                                        |                             |
| XAI           | `xai`        | `grok-beta`                                     |                             |
| Cloudflare    | `cloudflare` | `llama-4-scout-17b-16e-instruct`                | apiKey =`token:accountId` |
| Together AI   | `togetherai` | `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo`   |                             |
| Perplexity    | `perplexity` | `sonar`                                         |                             |
| NVIDIA NIM    | `nvidia`     | `moonshotai/kimi-k2.5`                          |                             |
| Ollama        | `ollama`     | `llama3.2`                                      | Local — no key required    |

The full registry (including context lengths) is exported as `LANGUAGE_MODELS`.

## Built-in agents

The `agent` option selects a prompt template from [`AGENT_PROMPTS`](src/agents/agent-prompts.ts):

- `question` — general-purpose Q&A with chat history.
- `question-research-engine` — long-form, journalistic, citation-style answer.
- `query-resolution` — rephrases a follow-up question into standalone search queries.
- `query-resolution-search` — classifies a query and proposes search categories as JSON.
- `summarize`, `summarize-bullets`, `summary-longtext` — single-shot and reduce-style summarization.
- `answer-cite-sources` — answers a query against a `{context}` block with `[n]` citations.
- `suggest-followups` — emits 4–5 follow-up questions inside `<suggestions>` tags.
- `remember-user` — extracts factual user memories as structured JSON.
- `knowledge-graph-nodes` — builds a temporal knowledge graph from a document.
- `results-relevance-filter` — picks the most relevant URLs from a search result list.

Templates use `{variableName}` placeholders that are filled from the options object (`query`, `article`, `chat_history`, `context`, etc.). Unknown templates fall back to [LangChain Hub](https://smith.langchain.com/hub) when `LANGCHAIN_API_KEY` is provided.

## Agent tools

`AGENT_TOOLS` registers callable tools that the ReAct agent attaches automatically when a prompt declares them in its `tools` array:

- `web_search` — QwkSearch metasearch over 100+ engines.
- `extract_page` — Mozilla Readability + Mercury extraction with PDF and YouTube support.
- `generate_ai_response` — proxy to QwkSearch's hosted `/language` endpoint.

Set `QWKSEARCH_URL` and `QWKSEARCH_API_KEY` in the environment, or pass `baseURL`/`apiKey` per-call.

## Memory

```ts
import { SimpleMemory, MemoryAgent, DrizzleMemoryStorage } from "ai-research-agent";
```

- `SimpleMemory` — in-memory store implementing `IMemoryStorage`.
- `DrizzleMemoryStorage` — Drizzle ORM-backed persistence; pair with `createMemorySchema()`.
- `MemoryAgent` — high-level wrapper that uses the `remember-user` agent to extract facts from chat turns and writes them to a storage backend.

See [src/memory/README.md](src/memory/README.md) and [src/memory/ARCHITECTURE.md](src/memory/ARCHITECTURE.md) for details.

## Package layout

```
src/
  agents/                    # prompt + tool registry, generate function, model list
    agent-prompts.ts         # AGENT_PROMPTS, extractJSONFromLanguageReply
    agent-tools.ts           # AGENT_TOOLS (web_search, extract_page, ...)
    generate-language.ts     # generateLanguageResponse — main entry point
    generate-language-types.ts
    language-model-names.ts  # LANGUAGE_MODELS, LANGUAGE_PROVIDERS
    llm-providers.ts         # createLLMProvider — LangChain chat-model factory
    index.ts                 # barrel export
  memory/                    # SimpleMemory, MemoryAgent, Drizzle storage
  providers/                 # alternate provider abstractions (model registry)
  utils/                     # markdown-to-html, document helpers
  index.ts                   # public entry — re-exports agents + memory
```

## Build

```bash
npm run build      # vite build
npm run make       # clean + build with extra heap
npm run test       # vitest
```

Vite bundles ES + CJS targets to `dist/`, emits `.d.ts` files alongside, and applies a `fs/promises` polyfill so the bundle works in browser and edge runtimes (Cloudflare Workers, Vercel Edge).
