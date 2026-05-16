/**
 * @description Line-item transformation that identifies list items starting with
 * bullet characters (-, •, –) or numbered patterns (`1. text`) and assigns
 * `BlockType.LIST`. Non-dash bullet characters are normalised to `-` by marking
 * the original line REMOVED and inserting a replacement `LineItem` (ADDED),
 * preserving the debug diff trail.
 */

import ToLineItemTransformation from '../base/toLineItemTransform'
import ParseResult from '../../models/parseResult'
import LineItem from '../../models/lineItem'
import Word from '../../models/word'
import { REMOVED_ANNOTATION, ADDED_ANNOTATION, DETECTED_ANNOTATION } from '../../models/annotation'
import BlockType from '../../models/blockType'
import { isListItemCharacter, isNumberedListItem } from '../../utils/stringFunctions'

// Detect items starting with -, \u2022, etc...
export default class DetectListItems extends ToLineItemTransformation {
  constructor () {
    super('Detect List Items')
  }

  transform(parseResult: ParseResult): ParseResult {
    var foundListItems = 0
    var foundNumberedItems = 0
    parseResult.pages.forEach(page => {
      const newItems = []
      page.items.forEach(item => {
        newItems.push(item)
        if (!item.type) {
          var text = item.text()
          if (isListItemCharacter(item.words[0].string)) {
            foundListItems++
            if (item.words[0].string === '-') {
              item.annotation = DETECTED_ANNOTATION
              item.type = BlockType.LIST
            } else {
              item.annotation = REMOVED_ANNOTATION
              const newWords = item.words.map(word => new Word({
                ...word,
              }))
              newWords[0].string = '-'
              newItems.push(new LineItem({
                ...item,
                words: newWords,
                annotation: ADDED_ANNOTATION,
                type: BlockType.LIST,
              }))
            }
          } else if (isNumberedListItem(text)) { // TODO check that starts with 1 (kala chakra)
            foundNumberedItems++
            item.annotation = DETECTED_ANNOTATION
            item.type = BlockType.LIST
          }
        }
      })
      page.items = newItems
    })

    return new ParseResult({
      ...parseResult,
      messages: [
        'Detected ' + foundListItems + ' plain list items.',
        'Detected ' + foundNumberedItems + ' numbered list items.',
      ],
    })
  }
}
