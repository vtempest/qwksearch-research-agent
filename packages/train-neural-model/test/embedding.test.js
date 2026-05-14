import {
  convertEmbeddingsToUMAP,
  convertTextToEmbedding,
  getEmbeddingModel,
} from "../../ai-research-agent/index.js";

import { test, expect } from "vitest";

test("hnsw demo", async () => {
  // Sample sentences
  const sampleSentences = [
    "The quick brown fox jumps over the lazy dog.",
    "A journey of a thousand miles begins with a single step.",
    "To be or not to be, that is the question.",
    "All that glitters is not gold.",
    "Actions speak louder than words.",
    "Where there's a will, there's a way.",
    "The pen is mightier than the sword.",
    "Knowledge is power.",
    "Time is money.",
    "Practice makes perfect.",
    "Beauty is in the eye of the beholder.",
    "Two wrongs don't make a right.",
    "When in Rome, do as the Romans do.",
    "The early bird catches the worm.",
    "Necessity is the mother of invention.",
    "A picture is worth a thousand words.",
    "Honesty is the best policy.",
    "Laughter is the best medicine.",
    "The grass is always greener on the other side.",
    "Every cloud has a silver lining.",
  ];

  // Query word
  const queryWord = "knowledge about work medicine";

  var pipeline = await getEmbeddingModel();
  var embeddingsDict = {};

  var vectorQuery = await convertTextToEmbedding(queryWord, { pipeline });

  embeddingsDict[queryWord] = vectorQuery;

  console.log("Generating embeddings for sample sentences...");
  for (const sentence of sampleSentences) {
    var vector = await convertTextToEmbedding(sentence, { pipeline });
    embeddingsDict[sentence] = vector;
  }
  const plotDataArray = await convertEmbeddingsToUMAP(
    embeddingsDict,
    1000,
    0.3
  ); // Lower similarity threshold for demo
  console.log(plotDataArray);

  // Find the query word in the plot data
  const queryPoint = plotDataArray.find((point) => point.label === queryWord);
  // if (!queryPoint)

  console.log(
    `x: ${queryPoint.x}, y: ${queryPoint.y}, similarity: ${queryPoint.similarity}`
  );

  // Find the 3 most similar sentences to the query word
  const queryEmbedding = embeddingsDict[queryWord];
  const sortedBySimilarity = plotDataArray
    .filter((point) => point.label !== queryWord)
    .map((point) => ({
      ...point,
      similarity: cosineSimilarity(queryEmbedding, embeddingsDict[point.label]),
    }))
    .sort((a, b) => b.similarity - a.similarity);

    
  for (let i = 0; i < 3 && i < sortedBySimilarity.length; i++) {
    console.log(`${i + 1}. "${sortedBySimilarity[i].label}"`);
    console.log(
      `   Similarity: ${sortedBySimilarity[i].similarity.toFixed(4)}`
    );
  }
});

// Calculate cosine similarity between two vectors
export function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
