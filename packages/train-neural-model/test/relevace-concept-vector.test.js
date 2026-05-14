import { describe, it, expect } from "vitest";

import  {convertTextToEmbedding} from "../../ai-research-agent/index.js";

describe("rerank similar conceptually with HF-llm", () => {


it("API - rerank similar conceptually", async () => {
  


  const apiKey = process.env.HF_API_KEY;
  const model = 'sentence-transformers/all-MiniLM-L6-v2';

  const sampleSentences = [
    "The quick brown fox jumps over the lazy dog.",
    "To be or not to be, that is the question.",
    "I think, therefore I am.",
    "All that glitters is not gold.",
    "Where there's a will, there's a way."
  ];

  let query3 = "What does the fox say?";


    let similarities = await convertTextToEmbedding(query3, sampleSentences, model, apiKey);

    console.log(JSON.stringify(similarities, null, 2));

    
    let similarities2 = await convertTextToEmbedding(sampleSentences, model, apiKey);

    console.log(JSON.stringify(similarities2, null, 2));



  expect(typeof similarities).toBe("object");
}, 100000)

});
