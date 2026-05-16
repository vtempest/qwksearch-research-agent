/**
 * @module research/extractor/pdf-to-html/transformations/ToTextBlocks
 * @description Flattens each page's parsed block items into plain text objects,
 * replacing structured PDF block nodes with `{ category, text }` pairs. The
 * `category` is derived from the block's `BlockType` name (e.g. "Paragraph",
 * "Heading", "List") or falls back to "Unknown" when no type is assigned.
 * `text` is extracted via `BlockType.blockToText`, which concatenates all
 * inline text spans within the block. The result is a new `ParseResult` whose
 * pages contain only these lightweight text items, discarding geometry and
 * style metadata — making downstream NLP processing and serialization simpler.
 */
import Transformation from "./Transformation";
import ParseResult from "../models/ParseResult";
import BlockType from "../models/BlockType";

export default class ToTextBlocks extends Transformation {
  constructor() {
    super("To Text Blocks", "TextBlock");
  }

  transform(parseResult /*: ParseResult */) /*: ParseResult */ {
    parseResult.pages.forEach((page) => {
      const textItems = [];
      page.items.forEach((block) => {
        // TODO category to type (before have no unknowns, have paragraph)
        const category = block.type ? block.type.name : "Unknown";
        textItems.push({
          category: category,
          text: BlockType.blockToText(block),
        });
      });
      page.items = textItems;
    });
    return new ParseResult({
      ...parseResult,
    });
  }
}
