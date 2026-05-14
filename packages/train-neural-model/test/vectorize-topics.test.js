import { test, expect } from "vitest";
import fs from "fs";
import phrasesModel from "../../ai-research-agent/src/wordlists/wiki-phrases-model-240k.json"
import { convertTextToEmbedding, getEmbeddingModel,
} from "../../ai-research-agent"
import usearch from "usearch";
import { searchVectorIndex } from "../src/similarity/usearch";

// test("query autocomplete", async () => {
  
  const vectorizedTopics = await vectorizeJson(phrasesModel);

//   expect(vectorizedTopics).toBeDefined();
// });


/**
 * Vectorizes all string phrases in a JSON object using text embeddings
 * @param {Object} inputJson - Nested JSON structure containing phrases
 * @returns {Promise<{vectorizedJson: Object, embeddings: number[][]}>}
 */
async function vectorizeJson(inputJson) {
    // 1. Extract all phrases from nested structure
    const phrases = [];
    const phrasePositions = [];
    
    // Traverse JSON to collect phrases and their positions
    Object.entries(inputJson).forEach(([outerKey, outerVal]) => {
        // console.log(outerKey, outerVal);
        Object.entries(outerVal).forEach(([innerKey, innerGroups]) => {
            innerGroups.forEach((group, groupIdx) => {
                group.forEach((item, itemIdx) => {
                    if (typeof item === 'string') {
                        phrases.push(innerKey + " " + item);
                        phrasePositions.push({ outerKey, innerKey, groupIdx, itemIdx });
                    }
                });
            });
        });
    });


    
    // 2. Batch convert phrases to embeddings and log each phrase
    var pipeline = await getEmbeddingModel();
    let maxPhrases = 100000
    let embeddings = []
for (const phrase of phrases) {
    if (--maxPhrases < 0) break;
    const embedding = await convertTextToEmbedding(phrase, {pipeline});
    embeddings.push(embedding);
    }

    
  const numDimensions = 384,
  maxElements = 100,
  metric = "cos",
  connectivity = 3;
const index = new usearch.Index({
  metric, // USearch supports 'cos' and 'l2'
  dimensions: numDimensions,
  connectivity: connectivity,
  // quantization: "f32"  // Disable quantization for exact search
});

// Add vectors to index
const labels = [];
for (let i = 0; i < embeddings.length; i++) {
  index.add(BigInt(i), new Float32Array(embeddings[i]));
  labels.push(i);
}

console.log(`Index created with ${embeddings.length} elements`);
index.save("./vectors.bin");

index.load("./vectors.bin");

// var content = fs.readFileSync("./vectors.bin");

const query = "how to hack web apps";

// Search
const results = await searchVectorIndex(index, query, {
  pipeline,
  numNeighbors: 10,
});

//convert labels to phrases in results
results.forEach(result => {
    const phrase = phrases[result.key];
    result.content = phrase;
});

results.map(result => {
    console.log(result.content);
});

    return { index, labels };
}
