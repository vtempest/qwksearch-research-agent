/**
 * @module research/extractor/pdf-to-html/models/Annotation
 * @description Research library module.
 */
export default class Annotation {
  constructor(options) {
    this.category = options.category;
    this.color = options.color;
  }
}

export const ADDED_ANNOTATION = new Annotation({
  category: "Added",
  color: "green",
});

export const REMOVED_ANNOTATION = new Annotation({
  category: "Removed",
  color: "red",
});

export const UNCHANGED_ANNOTATION = new Annotation({
  category: "Unchanged",
  color: "brown",
});

export const DETECTED_ANNOTATION = new Annotation({
  category: "Detected",
  color: "green",
});

export const MODIFIED_ANNOTATION = new Annotation({
  category: "Modified",
  color: "green",
});
