# Document chat automation capabilities

This matrix describes the chat contract against `@docx-editor.dev/core` 2.20.0. Recheck the installed TypeScript declarations and the [official automation reference](https://www.docx-editor.dev/docs/2.x/api/core/automation) before changing the editor package version.

The model supplies paragraph IDs, exact current paragraph text, UTF-16 offsets, and requested values. The browser resolves those IDs to host handles against its current unsaved document. Every write follows the selected review or auto-approval mode, requires a matching revision, and receives post-apply acknowledgement. One host batch commits as one transaction and undo unit. The browser save flow remains separate.

| Capability | Chat status | Automation path | Boundary |
| --- | --- | --- | --- |
| Text replacement and paragraph insertion/deletion | Available | `insertText`, `replaceSpan`, `insertParagraph`, `deleteParagraph` | One operation per existing paragraph per proposal. |
| Heading and basic lists | Available | `setParagraphFormat`; editor `toggleList` | List change is a separate proposal. |
| Bold and italic | Available | `getFont`, `setFont` | Explicit ranges only. |
| Font family, point size, text color, underline, highlight, strike, subscript, superscript | Available | `getFont`, `setFont` | Font size is 0.5–400 pt in 0.5 pt steps; colors are `#RRGGBB`; highlight is limited to the Word palette. Omitted fields remain unchanged. |
| Alignment, indents, line spacing, paragraph spacing, widow control | Available | `getParagraphFormat`, `setParagraphFormat` | Measurements are points. A list change cannot share the proposal. |
| Paged phrase search | Available, read only | `search` with model-text projection | Scans the whole editor body and returns exact paragraph ranges in pages of 100, with a total count and continuation offset. Multiple matches require disambiguation before a targeted edit. |
| Table listing and inspection | Available, read only | `getTables`, `getTable` | Lists at most 20 tables. Inspection returns up to 20 rows, 12 columns, and 500 characters per cell; table writes remain future work. |
| Links and advanced list structure | Future | `setHyperlink`, list operations | Need target and outcome representation. |
| Tables, pictures, fields, page layout, and other stories | Future | Corresponding automation operations | Need scoped context, target identity, and previews. |
| Comments, tracked changes, content controls, custom nodes | Future | Corresponding automation operations | Need review setup or richer document context and action-specific validation. |

Snapshot `marks` retain the existing bold/italic coverage. Snapshot `formatting` reports other directly authored run values only; an absent value does not describe the rendered style cascade. `paragraphFormat` reports the paragraph's own properties, with `null` for properties the paragraph does not author. See the [official formatting guidance](https://www.docx-editor.dev/docs/2.x/editor-api/formatting).

The browser adapter checks the live revision and exact paragraph text before applying. The backend verifies requested formatting from the returned snapshot. Rich structure is outside the current chat snapshot, so no arbitrary automation operation is accepted from model output. Follow the [vendor's agent guide](https://www.docx-editor.dev/docs/2.x/build-a-docx-agent) and [batching rules](https://www.docx-editor.dev/docs/2.x/editor-api/batching-and-errors) when extending this matrix.
