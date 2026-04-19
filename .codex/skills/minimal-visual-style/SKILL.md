---
name: minimal-visual-style
description: Preserve and extend the current minimal visual style in this repo. Use when editing the home page, foraging workbench, map panel, or related frontend surfaces and the goal is to keep the interface minimal, editorial, workbench-first, and token-driven instead of introducing a new visual direction.
---

# Semantic Foraging Minimal Visual Style

Use this skill when frontend work should feel like a continuation of the current app, not a redesign.

## Source Of Truth

Inspect these files before making visual changes:

- `src/tailwind-input.css`
- `src/views/home.ts`
- `src/views/render-page.ts`
- `specs/ui-rendering/spec.md`
- `specs/foraging-workbench/spec.md`
- `docs/architecture.md`

If screenshots or old notes disagree with the code, the code and current specs win.

## Visual Direction

- Keep the page minimal and workbench-first.
- Favor an editorial feel over a product-marketing feel.
- Use one clear accent color and let typography carry most of the visual weight.
- Keep surfaces quiet: thin borders, soft tinting, very limited shadow, no decorative gradients.
- Preserve the sense of open space around a single primary interaction.

## Project Context

- This repo is a server-rendered semantic foraging workbench, not a search landing page.
- The primary interaction is the manual intent-rehearsal form.
- Explanation, map, candidate leads, recent sessions, and runtime details are supporting sections and should not visually overpower the main workbench.
- Browser enhancement may improve typed fragments such as the map, but visual design still has to respect the server-first screen model.

## Style Contract

### Typography

- Keep the sans stack from `src/tailwind-input.css` unless the user explicitly asks for a new direction.
- Use tight tracking on large headings and slightly expanded tracking on small uppercase labels.
- Let headings be bold and compact; supporting text should stay calm and readable.

### Color

- Continue using the `app-*` theme tokens from `src/tailwind-input.css`.
- Keep the palette restrained: canvas, surface, text, soft text, accent, line, ink, and accent ghost are the main working colors.
- Support both light and dark mode through token changes rather than separate component designs.

### Layout

- Keep content in a narrow centered column instead of filling the full viewport width.
- Preserve generous outer spacing and a compact vertical rhythm inside interactive elements.
- Make the intent workbench the visual anchor.
- Supporting sections should stack cleanly and read like documentation or field notes rather than dashboard tiles.

### Components

- Inputs should feel soft and precise: rounded corners, subtle tinted background, thin ring, stronger focus ring.
- Candidate leads and recent sessions should read like clean editorial rows, not dense cards.
- Status text should stay quiet and inline rather than becoming a loud banner.
- Map controls, legend items, and detail panels should match the same restrained system as the rest of the page.

## Anti-Patterns

- Do not add gradient-heavy hero treatments, glossy cards, or marketing-style sections.
- Do not introduce multiple accent colors or decorative illustration unless the user explicitly wants a new identity.
- Do not replace the single-primary-interaction composition with a busy app shell.
- Do not let the map panel become visually heavier than the main workbench form.
- Do not drift into separate visual systems for server-rendered and browser-enhanced states.
