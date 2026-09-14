# Worrek — blue document-editor direction

## Design philosophy

Say what the product is, then show it. Worrek is an AI-powered word document editor. The landing page pairs a direct two-line headline with a believable word processor and an assistant working on the same document. It feels light, modern, practical, friendly and confident.

The attached editor screenshot is the primary reference for the editor-plus-assistant presentation. [Revise](https://revise.io/) is a secondary reference for concise product positioning. Worrek's copy, branding, project-brief content, icon drawings and UI composition are original. The example is conceptual, not a claim that these features are available today.

## Palette

| Role | Color | Use |
| --- | --- | --- |
| Warm neutral | `#F8F8F5` | Airy page background |
| Paper | `#FFFFFF` | Document, ribbon, assistant |
| Ink | `#242831` | Headline and wordmark |
| Blue | `#4274DC` | Headline emphasis, CTA, logo, active state |
| Blue hover | `#3263C5` | Primary CTA hover |
| Pale blue | `#EDF3FF` | Selection and small context accents |
| Muted | `#737883` | Real supporting copy |
| Border | `#E0E3E8` | Fine dividers |
| Editor frame | `#EFF1F4` | Outer product shell |
| Canvas | `#F7F8FA` | Space around the document |

Use blue consistently. No green in the current variation; no dark navy surfaces, gradient decoration or glass effects. A CSS repeating pattern is used only for ruler tick marks. Muted miniature UI is part of the static illustration, not actual controls.

## Typography

- **Manrope variable** for brand, hero, page copy and UI. Locally bundled with its SIL Open Font License; Arial fallback. No font-network requests.
- **Georgia** for the actual document and the small Aa decoration. It no longer emphasizes the marketing headline. Times New Roman fallback.
- **H1:** approximately 96px at 1440px, weight 650, line-height 1.1, tracking −5.5px. Dark first line, blue second line. Fluid down to 29px on narrow phones.
- **H2 / document title:** 34px, Georgia regular, line-height 1.2; 25–27px on phones. Future real page H2s should use Manrope 36–40px / 1.2.
- **Body:** 16px / 1.85 desktop, 14px tablet, 13px mobile (11px below 375px). Copy width is naturally limited by the two short sentences.
- **CTA:** 13px, weight 650, 55px tall; 12px / 51px mobile. Nav CTA: 11px / 44px.
- **Small labels:** 7–10px with restrained tracking. Avoid badge proliferation.
- **Mockup:** 9–11px UI and document body on desktop, sized as a reduced-scale product illustration. Fake controls are excluded from the accessibility tree.

## Spacing and grid

- Scale: 4, 8, 12, 16, 24, 32, 48, 64, 88, 112px; optical adjustments are allowed.
- Main max width: 1296px. Product max width: 1264px inside a 1320px section.
- Page gutters: 56px desktop, 36px laptop, 20px mobile. Product gutters: 28px desktop, 14px mobile.
- Nav: 112px tall desktop, 86px mobile. Hero top padding: 59px desktop, 47px mobile.
- Hero-to-preview breathing room: 88px desktop, 63px mobile. Preview begins around the lower part of the first desktop viewport.
- The mockup uses a flexible word processor beside a 324px AI pane, separated by a 12px gutter. The page canvas has generous horizontal margins and a fine ruler.
- No document-outline sidebar. The formatting ribbon, page structure and prompt composer carry the product identity.
- The FAQ begins 142px after the product preview on desktop and 88px after it on mobile. The footer follows the FAQ after 122px desktop / 80px mobile. Removed the previous large coming-soon closing section.
- “Why use Worrek?” begins 154px after the primary editor preview and contains four alternating feature rows. Each row leaves about 132px before the next on desktop and 91px on mobile. The FAQ follows the feature sequence.

## Surfaces and controls

- Page sections are unboxed. Main product shell: 15px radius, 1px border. Internal panes: 7px radius. CTA: 8px radius. Prompt composer: 9px radius.
- One subtle preview shadow: `0 16px 40px -28px #35466840`, plus a very faint 2px contact shadow.
- Primary CTA: blue, white label, northeast arrow. Nav CTA: outlined neutral.
- Only modest fill/border hover transitions (180ms), disabled for reduced motion. Clear blue keyboard focus ring.
- All CTA and brand links use `href="#"`. No form, signup, waitlist service, API or real preview launch. Early access is implied through “Join waitlist” and “Request early access”.

## Editor concept

- The mockup begins directly with the File/Home/Insert/Layout/Review/View row. There is no branded application strip above it.
- Ribbon: File/Home/Insert/Layout/Review/View, undo/redo, clipboard, font, size, emphasis, alignment, lists, styles and find. These are noninteractive illustration elements.
- Document: a fictional website-refresh brief, section headings, paragraphs and bullets. A verbose overview is selected in blue.
- AI pane: “Worrek AI Agent” heading, request to make the overview concise, a shorter suggested rewrite, decorative apply/retry controls, and a persistent composer with selected-text context and attachment/send icons. Replies do not repeat an assistant name or icon.
- Assistant output deliberately differs from the selected original, so the example demonstrates a useful editing action.
- All illustration content is grouped as one descriptive `role="img"`, with its internals hidden from assistive technology and absent from keyboard navigation.

## FAQ pattern

- Desktop uses a two-column editorial layout: a sticky section introduction on the left and one continuous question list on the right. It does not introduce a grid of cards.
- Questions use native `details` and `summary`, so they work with a keyboard and without JavaScript. The first question is open by default to establish how the section works.
- Rows are separated by 1px neutral borders. The only ornament is a 24px blue plus/minus control; it rotates and changes fill when expanded.
- Summary: 16px / 1.45 desktop, 13px mobile. Answer: 13px / 1.8 desktop, 12px / 1.75 mobile. The answer column remains below 695px for comfortable reading.
- Below 650px the section becomes one column. The heading sits above the list and the sticky behavior is removed.

## Feature demo pattern

- The hero and “Why use Worrek?” heading use the ink color throughout. CTAs have text only, with no arrows. Feature stories have no number badges.
- Document canvases contain real document text, with AI guidance and review messages confined to the right assistant pane.
- Hero decoration combines document and typography motifs with an original picture tile, AI monogram and connected-node symbol. Keep the graphics small and clear of the copy.
- The section starts with one concise introduction, then four independent product stories. Desktop alternates copy/editor and editor/copy; below 900px every story becomes copy first and editor second.
- Every demo uses the same compact Worrek shell: Home/Insert/Layout/Review tabs, formatting toolbar, page canvas and right-side AI pane. Document contents change to clarify each use case while the product frame stays consistent. The branded title strip and filename row are omitted.
- AI responses use one consistent rectangular treatment: a fine neutral border, 6–7px radius, white fill and compact padding.
- The compact editor fills each demo shell through its bottom edge; separate process captions are omitted.
- Demo frame: pale grey-blue shell, 15px radius, 1px neutral border, minimal shadow. Feature copy stays unboxed and below 400px wide on desktop.
- Animation loops last 10–11 seconds. They use opacity, transforms, clipping, background-size and small color changes. Each sequence includes pauses so selection, prompt, response and result remain understandable.
- The four sequences demonstrate: selection/prompt/rewrite; progress across three sections; manual typing/AI bridge/manual typing; and separate accept/reject review actions.
- Animation is decorative and hidden inside a descriptive `role="img"`. `prefers-reduced-motion: reduce` removes every loop and presents an understandable completed state.
- In both the primary mockup and small demos, the editor canvas touches the AI pane with one dividing line. The document page fills its canvas instead of floating inside a large padded surround.
- On phones the feature copy and demo stack. Both primary and feature previews keep the document and AI pane side by side inside a 1208:600 landscape frame, using CSS container-based scaling. Mobile sizing follows the Revise reference: primary inner width is viewport minus 112px with 8px frame padding; feature frames sit 40px from each page edge with 6px frame padding.
- Center the entire “Why use Worrek?” introduction. The FAQ title uses ink throughout. Suggested rewrites have a transparent background and no blue left border; the apply action is text only.

## Responsive behavior

- Desktop: complete side-by-side word processor and AI composer.
- Below 1200px: narrower assistant and page margins; omit Find.
- Below 950px: simplify clipboard/styles and minor metadata, retain both panes.
- At 650px and below: use compact landscape editor illustrations with visible prompt composers. Center all feature headings and descriptions, and hide every floating hero graphic.
- At 374px and below: remove the clipboard group, tighten spacing and reduce document type slightly.
- Keep two headline lines. Text and document content flow naturally; no carousels or horizontal scrolling.

## Sandbox and comparison

All iteration files remain inside `design/`. Current blue design: `prototype/`. Previous green direction, including its original assets and design rules: `prototype/variations/01-green/`.

No dependencies added. No application files changed. The page has no JavaScript. Next.js translation requires a separate explicit request after design approval.
