/**
 * Calculate the semantic similarity between one text and a list of
 * other sentences by comparing their embeddings.
 * https://huggingface.co/docs/api-inference/detailed_parameters#sentence-similarity-task
 *
 * <img src="https://i.imgur.com/ex2UWnu.png" width="350px" />
 * @param {string} source_sentence The string that you wish to
 * compare the other strings with. This can be a phrase, sentence,
 * or longer passage, depending on the model being used.
 * @param {Array<string>} sentences A list of strings which will be compared
 * against the source_sentence.
 * @param {Object} [options]
  * @param {string} options.model default="sentence-transformers/all-MiniLM-L6-v2"
 * @param {string} options.HF_API_KEY Required https://huggingface.co/settings/tokens
 * @returns array of 0-1 similarity scores for each sentence
  * @category Similarity
  */
export async function weighRelevanceConceptVectorAPI(
  source_sentence,
  sentences,
  options = {}
) {
  var { model = "sentence-transformers/all-MiniLM-L6-v2", HF_API_KEY = 0 } =
    options;

  if (!HF_API_KEY) return { error: "No API key" };

  const url = `https://api-inference.huggingface.co/models/${model}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {
        source_sentence,
        sentences,
      },
    }),
  });

  if (!response.ok) {
    console.error("API request failed:", await response.text());
    return null;
  }

  var jsonSimilarityScores =  await response.json();

  return jsonSimilarityScores;
}