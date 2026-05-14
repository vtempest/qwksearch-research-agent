import { test, expect } from "vitest";
import {
  addEmbeddingVectorsToIndex, 
  searchVectorIndex, getAllEmbeddings,
  getEmbeddingModel,
  convertTextToEmbedding,
} from "../index.js"

test("hnsw", async () => {

  const  pipeline = await getEmbeddingModel();

  console.log(1)
    const documents = [
      "The quick brown fox jumps over the lazy dog",
      "Lorem ipsum dolor sit amet",
      "foxes are red",
      "foxes are not blue",
      "foxes like to hunt their prey",
    ];
    const query = "What does the fox eat?";


  let documentVectors = [];

  for (let doc of documents) 
    documentVectors.push(await convertTextToEmbedding(doc, { pipeline }));

  const {index} = await addEmbeddingVectorsToIndex(documentVectors, {pipeline});

  const result = await searchVectorIndex(index, query, {pipeline});
  console.log(result);
  
  // // var index2 = await importVectorIndexFromString(base64)


  // const result2 = await searchVectorIndex(index2, query, {pipeline});
  // console.log(result2);

  expect(result).toBeDefined();
}, 90000);



