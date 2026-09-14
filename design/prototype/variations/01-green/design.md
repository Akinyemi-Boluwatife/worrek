# Worrek — first landing-page direction

## Philosophy and personality

An open notebook, before the first sentence. Warm, quiet, confident and a little playful. Generous space gives the headline authority; original editing marks add a human touch. The product is hinted at through a realistic document, not a feature catalogue. This is a coming-soon concept, not the final product UI.

The supplied reference informs warmth, hierarchy and simplicity only. Copy, wordmark, vector decorations, typography treatment and editor composition are original to this exploration.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Cream | `#F7F6EF` | Main page background |
| Paper | `#FFFEFB` | Document and preview surface |
| Ink | `#252B25` | Headline and wordmark |
| Forest | `#45694D` | Primary CTA, italic emphasis, drawing details |
| Forest dark | `#33533B` | Primary CTA hover |
| Muted | `#707569` | Supporting copy |
| Sage | `#E9ECDF` | Small selections and neutral accents |
| Line | `#DCDED2` | Dividers and restrained borders |

One chromatic family: green. No gradients or glass effects. Lower-contrast tiny text belongs only to the decorative mockup; real page content stays readable.

## Typography

- **Manrope variable**, locally bundled under the SIL Open Font License. Fallback: Arial, sans-serif. Friendly, clean letterforms; no font service required at runtime.
- **Georgia italic** for the emphasized hero phrase and closing line. Georgia regular for the preview document. This editorial contrast is the primary visual signature. Times New Roman is the serif fallback.
- **H1:** 106px at 1440px, weight 650, line-height 1.06, tracking −6px. Fluid down to 36px on narrow phones. Two intentional lines; italic phrase stays inline.
- **H2 / closing statement:** 38px, line-height 1.2, tracking −1.7px; 32px on mobile.
- **Body:** 15px / 1.85 desktop; 13px / 1.85 mobile, restrained line lengths. Navigation: 12px. CTA: 14px, weight 650.
- **Eyebrow / captions:** 9–10px uppercase, 1.7–2.1px tracking. Plain text, no pill badges.
- The preview is a reduced-scale illustration; its internal typography deliberately follows UI proportions rather than page-body sizing.

## Space and layout

- Base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Optical adjustments are welcome.
- Main content max width: 1296px. Preview max width: 1168px inside a 1216px section with gutters.
- Desktop gutters: at least 56px; laptop 36px; mobile 20px (preview 16px).
- Nav height: 116px desktop, 90px mobile. Hero begins 71px after nav at 1440px.
- Hero bottom breathing room: 110px desktop, 73px mobile. Preview starts near the lower edge of the first desktop viewport.
- Closing section: approximately 96px vertical spacing. Footer is separated by one fine rule.
- Main composition: centered hero, asymmetric small doodles, wide editor, brief editorial sign-off. No feature grid.
- Editor grid: 178px outline / flexible document / 266px assistant. Laptop reduces sidebars; tablet removes outline; mobile puts the assistant below the document.

## Surfaces, borders and buttons

- Page sections stay unboxed. Buttons have 9px corners; preview 12px; miniature controls 5–8px.
- Borders: 1px solid muted green-grey. Buttons use a stronger border where needed.
- Shadow: only the large preview, `0 12px 44px -24px #2f412833`. No floating-card collection.
- Primary CTA: forest fill, cream label, 54px height, 25px horizontal padding, a simple northeast arrow.
- Nav CTA: transparent fill, subtle outlined border, 46px height.
- Hover: restrained fill change over 180ms. Clear keyboard focus ring; reduced-motion preference removes transitions.
- Both CTA links use `href="#"` and are visual placeholders. They perform no signup, collection, or request.

## Graphics

An original folded-stroke W placeholder, a small tilted document, an editable “Aa” selection, and a hand-drawn four-point mark. Use inline SVG and CSS, single strokes and imperfect angles. Avoid mascots, stock illustrations, gradients and ornamental UI cards. Hide purely decorative content from assistive technology.

## Responsive and accessibility rules

- 1440px is the main design target. Fluid type and widths adapt through laptop and tablet.
- At 950px: remove outline panel; simplify toolbar and status. At 650px: stack document and assistant, simplify miniature navigation, scale back doodles.
- At narrow phone widths: retain two-line headline, readable page copy, full-width preview, and two-column compact assistant excerpt.
- No carousel, sideways scrolling, interaction traps, or animation. All page copy remains selectable.
- Semantic header, main, sections, footer; one H1; skip link; visible focus. Preview is one labeled static illustration with internal fake controls hidden from the accessibility tree and absent from keyboard navigation.

## Iteration boundaries

Everything lives in `design/`. No framework, application dependency, backend, form, API, or integration. The font is the only bundled third-party asset; its license is beside it. Implementation in Next.js needs a separate explicit request after design approval.
