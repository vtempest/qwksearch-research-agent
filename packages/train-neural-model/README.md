# neural-net-training

Neural network and machine learning research toolkit for the QwkSearch AI Research Agent. Bundles three complementary capabilities — semantic vector search, gradient-boosted statistical prediction, and transformer language-model training — behind a single package.

## Modules

### 1. Vectorize Search ([src/vectorize-search/](src/vectorize-search/))

Text embeddings and approximate nearest-neighbor search for semantic retrieval.

- **[similarity-vector.js](src/vectorize-search/similarity-vector.js)** — converts text to embeddings via `@huggingface/transformers` (default model: MiniLM-L6-v2), runs in-browser or Node via WebGL/WASM backends.
- **[usearch.js](src/vectorize-search/usearch.js)** — wraps [usearch](https://github.com/unum-cloud/usearch) for fast HNSW-based vector indexing and k-NN queries.
- **[similarity-remote-api.js](src/vectorize-search/similarity-remote-api.js)** — remote embedding API client for offloading to a hosted service.

```ts
import { convertTextToEmbedding, searchVectorIndex } from "neural-net-training";

const vec = await convertTextToEmbedding("hello world");
const hits = await searchVectorIndex(index, "query text", { numNeighbors: 5 });
```

### 2. Correlate Statistics ([src/correlate-statistics/](src/correlate-statistics/))

XGBoost-based supervised learning pipeline for regression, classification, and time-series prediction. Full details, parameter reference, and tuning guide live in [src/correlate-statistics/README.md](src/correlate-statistics/README.md).

- Train models with `trainModels(data, target, options)`
- Predict with `predictFuture(rows, options)`
- Persist via `saveModel(path)` / `loadModel(path)`
- Feature engineering helpers: `calculateRollingStats`, `calculateRMSE`

```ts
import { trainModels, predictFuture } from "neural-net-training";

const r2 = await trainModels(rows, "crop_yield", {
  featuresToUse: ["temperature", "humidity", "rainfall"],
  testSize: 0.2,
  xgbParams: { max_depth: 6, eta: 0.1, objective: "reg:squarederror" },
});
```

### 3. Next-Word Prediction ([src/next-word-prediction/](src/next-word-prediction/))

GPT-style decoder-only transformer implementation in Python/Tinygrad for educational training of language models from scratch. See [src/next-word-prediction/README.md](src/next-word-prediction/README.md) and [src/next-word-prediction/SETUP.md](src/next-word-prediction/SETUP.md) for the full architecture walkthrough, training loop, and GPU setup.

Components: learned positional embeddings, multi-head self-attention with causal masking, position-wise feed-forward, residual connections, and a complete training loop.

## Installation

This package is consumed from within the qwksearch-research-agent workspace. Dependencies are installed at the monorepo root:

```bash
bun install
```

Key runtime dependencies:

| Package                          | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `@huggingface/transformers`      | Text embedding pipelines (MiniLM, etc.) |
| `@tensorflow/tfjs-backend-webgl` | WebGL acceleration for embeddings       |
| `usearch`                        | HNSW vector index                       |
| `xgboost_node`                   | Native XGBoost bindings for Node        |

GPU builds use [Dockerfle.gpu](Dockerfle.gpu) (Node + system graphics libs).

## Build

```bash
bun run build           # Vite build (default)
bun run build:bun       # Vite with 8GB Bun JSC RAM cap
bun run build:node      # Vite under Node with 8GB heap
```

The larger memory caps are needed because the embedding model bundle and XGBoost native bindings push past default heap limits.
