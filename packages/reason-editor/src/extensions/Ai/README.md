# Ai — writing assistant

Streams a model's suggestion for the current selection (or the caret), shows it
as an inline red/green diff, and writes nothing to the document until the user
accepts it.

## Entry points

| Trigger | Where |
| --- | --- |
| `AI` button | main toolbar (`RichTextAi`) |
| ✨ Ask AI | selection bubble menu |
| `⌘/Ctrl + J` | keyboard, anywhere in the editor |
| `/ai` | slash-command menu |

All four open the same floating panel (`AiMenu`): a filterable command palette
plus a free-form prompt box. Typing filters the commands; `↑`/`↓` and `Enter`
run one, `Enter` on an empty highlight submits the typed prompt instead.

## Review flow

Nothing is applied automatically. While the answer streams the panel shows it
with a **Stop** control (stopping keeps what has already arrived), and once it
settles the actions are **Replace selection** (`⌘/Ctrl + Enter`), **Insert
below**, **Try again**, **Copy** and **Discard**.

## Wiring a real model

The extension ships with an offline demo transform so the menu works with no
backend. Point it at a real one with `getCompletion`:

```ts
import { Ai, createStreamingCompletion } from 'react-reason-editor/ai';

Ai.configure({
  getCompletion: createStreamingCompletion({ endpoint: '/api/ai' }),
  // How much text around the selection is sent as context. 0 sends none.
  contextChars: 4000,
});
```

`createStreamingCompletion` handles a plain text stream, an OpenAI-compatible
SSE stream, and a single JSON object (`{ rewrittenText }`, `{ text }`,
`{ choices: [...] }`), and surfaces a JSON `error` body as the message shown in
the panel. For anything else, implement `AiCompletionFn` directly — it is
called with the instruction, the selection, a clamped context window, the
command id and a `systemPrompt`, plus an `AbortSignal` that fires when the user
cancels.

In this repo the plugin registry defaults the endpoint to the QwkSearch web
app's `/api/agent/rewrite`; it is editable (and clearable, to fall back to the
demo transform) under Settings → Plugins → AI Writing.

## What the extension guarantees about the output

- The response is sanitised before it is shown or applied: chat preambles
  ("Sure — here's a tighter version:"), code fences wrapping the whole answer,
  and quotes around the whole answer are removed, and blank-line runs are
  collapsed. The same clean-up runs on every streamed chunk, so the preview and
  the accepted text always match.
- Markdown structure in the answer (lists, headings, emphasis, tables) is
  converted to real nodes on accept, so "Key takeaways" produces a bullet list
  rather than literal `- ` characters. A single-line rewrite is inserted as
  plain text so the marks already on the range survive.
- Commands that rewrite a selection are hidden — and refuse to run — when the
  caret is collapsed, so they never answer confidently about nothing.

## Customising the commands

```ts
Ai.configure({
  commands: [
    ...DEFAULT_AI_COMMANDS,
    {
      id: 'cut-card',
      label: 'Cut this evidence',
      description: 'Condense into a debate card',
      icon: Scissors,
      group: 'transform',
      prompt:
        'Condense this evidence into a debate card. Preserve exact quotations and identify the claim and the warrant. Do not invent citations.',
    },
  ],
});
```

`group` places the command under a menu heading (`edit`, `tone`, `transform`,
`generate`), `requiresSelection: false` makes it available at a bare caret, and
`options` turns it into a submenu (that is how Translate picks its language).
