import usearch from "usearch";


// Main implementation
async function convertEmbeddingsToUSearch(documentVectors, options = {}) {
  return { index, labels };
}

export async function searchVectorIndex(index, query, options = {}) {
  const { numNeighbors = 5, pipeline } = options;

  var queryVector = await convertTextToEmbedding(query, { pipeline });
  // console.log(JSON.stringify(Array.from(queryVector)))

  queryVector = new Float32Array(queryVector);

  const results = await index.search(queryVector, numNeighbors);
  const resultJson = Array.from(results.keys || [])
    .map((key, index) => ({
      key: Number(key),
      distance: results.distances[index],
    }))
    .sort((a, b) => a.distance - b.distance);

  return resultJson;
}




/**
 * <img src="https://i.imgur.com/wtJqEqX.png" width="350" /> 
 * Text embeddings convert words or phrases into numerical vectors in a high-dimensional
 * space, where each dimension represents a semantic feature extracted by a model like
 * MiniLM-L6-v2. In this concept space, words with similar meanings have vectors that
 * are close together, allowing for quantitative comparisons of semantic similarity.
 * These vector representations enable powerful applications in natural language processing,
 * including semantic search, text classification, and clustering, by leveraging the
 * geometric properties of the embedding space to capture and analyze the relationships
 * between words and concepts.
 * [Text Embeddings, Classification, and Semantic Search
 *  (Youtube)](https://www.youtube.com/watch?v=sNa_uiqSlJo&t=129s)
 *
 * @param {string} text - The text to embed.
 * @param {Object} [options]
 * @param {AutoTokenizer} options.pipeline
 *  - The pipeline to use for embedding.
 * @param {number} options.precision default=4 - The number of decimal places to round to.
 * @returns {Promise<{embeddingsDict: Object.<string, number[]>, embedding: number[]}>}
  * @category Similarity
  */
export async function convertTextToEmbedding(text, options = {}) {
  var { precision = 4, pipeline } = options;

  if (!pipeline) pipeline = await getEmbeddingModel();

  const embedding = await pipeline(text, { pooling: "mean", normalize: true });
  // return embedding;
  const roundedEmbedding = Array.from(embedding.data).map((num) =>
    parseFloat(num.toFixed(precision))
  );
  return roundedEmbedding;
}

/**
 * Initialize HuggingFace Transformers pipeline for embedding text.
 * 
 * <img src="https://i.imgur.com/3R5Tsrf.png" width="350px" />
 * @param {Object} [options]
 * @param {string} options.pipelineName default "feature-extraction",
 * @param {string} options.modelName default="Xenova/all-MiniLM-L6-v2" - 
 * The name of the model to use
 * @returns {Promise<import("@huggingface/transformers").AutoTokenizer>} The pipeline.
  * @category Similarity
  */
export async function getEmbeddingModel(options = {}) {
  // const {pipeline} = await import("../../../transformers.js/dist/transformers")
  const {pipeline} = await import("@huggingface/transformers")
  const {
    pipelineName = "feature-extraction",
    modelName = "Xenova/all-MiniLM-L6-v2",
    quantized = true,
    gpu = false,
  } = options;
  
  return await pipeline(pipelineName, modelName, {
    quantized,
    dtype: "fp32",
    device: gpu ? "cuda" : "cpu",
  });
}



import fs from "fs";
// Example usage
async function main() {
  const pipeline = await getEmbeddingModel();

  const documents = [
    {
      id: 0,
      text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    },
    {
      id: 1,
      text: "The only way to achieve true innovation is to embrace uncertainty with an open mind.",
    },
    {
      id: 2,
      text: "Life is like riding a bicycle. To keep your balance, you must keep moving forward.",
    },
    {
      id: 3,
      text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    },
    {
      id: 4,
      text: "Leadership is not about being in charge. Leadership is about taking care of those in your charge.",
    },
    {
      id: 6,
      text: "Every challenge is an opportunity in disguise, waiting to be discovered.",
    },
    {
      id: 7,
      text: "In the midst of chaos, there is also opportunity for growth and transformation.",
    },
    {
      id: 8,
      text: "The journey of a thousand miles begins with a single step forward.",
    },
    {
      id: 9,
      text: "Knowledge speaks, but wisdom listens and learns from every experience.",
    },
    {
      id: 10,
      text: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    },
  ];
  const query = "when to plant a tree";
  // Convert documents to vectors
  const documentVectors = await Promise.all(
    documents.map((doc) => convertTextToEmbedding(doc.text, { pipeline }))
  );

  const numDimensions = 384,
    maxElements = 100,
    metric = "cos",
    connectivity = 3;
  const index = new usearch.Index({
    metric: "cos", // USearch supports 'cos' and 'l2'
    dimensions: numDimensions,
    connectivity: connectivity,
    // quantization: "f32"  // Disable quantization for exact search
  });

  // Add vectors to index
  const labels = [];
  for (let i = 0; i < documentVectors.length; i++) {
    index.add(BigInt(i), new Float32Array(documentVectors[i]));
    labels.push(i);
  }

  console.log(`Index created with ${documentVectors.length} elements`);
  index.a;
  index.save("./vectors.bin");
  var content = fs.readFileSync("./vectors.bin");
  const base64String = Buffer.from(content).toString("base64");
  console.log(base64String);

  // Search
  const results = await searchVectorIndex(index, query, {
    pipeline,
    numNeighbors: 5,
  });

  // Display results
  console.log(results);
}

// Execute if running directly
// main().catch(console.error);
