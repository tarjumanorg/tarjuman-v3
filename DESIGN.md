# Design System

How this product looks, feels, and stays consistent. This is the authoritative reference for UI
decisions; [`guide.md`](./.agents/rules/guide.md) covers engineering and
[`architecture.md`](./.agents/rules/architecture.md) covers structure.

The goal is a single, coherent visual language with as few bespoke decisions as possible. Consistency
comes from reuse, not from re-deciding.

## Philosophy

- **One component vocabulary.** The shared design-system primitives (`shadcn-svelte`, built on `bits-ui`
  and Tailwind) are the default building blocks for everything — interactive *and* static.
- **Defaults first, override only when necessary.** Start from the primitive's defaults. Reach for a
  custom style only when a real need isn't met, and keep the override minimal and local.
- **Compose, don't fork.** Build features by composing primitives. Don't copy a component to tweak it;
  extend it through its supported variant/prop surface.
- **Static by default.** Non-interactive UI still uses the design system, rendered as plain HTML with no
  client hydration — the look is shared, the JavaScript cost is zero.
- **Tailwind for layout, components for everything else.** Use utilities for layout and one-off spacing;
  use primitives for anything with visual identity (buttons, inputs, cards, dialogs, tables).

## Design tokens

Tokens are the single source of truth for visual style. They live as CSS variables in the global
stylesheet and are exposed to Tailwind through its theme layer.

- **Style through tokens, never literals.** Reference semantic tokens; do not hardcode colors, radii,
  spacing, or shadows in components.
- **Semantic over raw.** Prefer role-based tokens (surface, foreground, primary, muted, accent,
  destructive, border, focus ring) over raw palette values, so theming stays centralized.
- **Theme in one place.** All token and theme changes happen in the global stylesheet's theme layer.
- **Light and dark are token swaps.** Theming is achieved by changing token values, not by branching
  styles in components.

## Color

- Use semantic color roles for surfaces, text, borders, and interactive accents.
- Meaning must never rely on color alone — pair it with text, icon, or shape for accessibility.
- Maintain sufficient contrast in both themes; verify against accessibility contrast guidance.

## Typography

- **Defined roles.** Use the established type roles — a body/reading face, and a dedicated Arabic face for
  Arabic and Qur'anic text via the project's Arabic-text utility.
- **Scale, don't improvise.** Size and weight come from the type scale; avoid arbitrary font sizes.
- **Readable measure and rhythm.** Respect line length, line height, and spacing for long-form content.
- **RTL-aware.** Arabic content renders right-to-left with correct shaping and alignment.

## Spacing, radius, elevation & layout

- Spacing, corner radius, and elevation are token-driven and consistent across the app.
- **Mobile-first and responsive** by default; design for small screens, then enhance upward.
- Prefer modern, content-aware layout (flex/grid, and container queries where a component's context
  matters more than the viewport).
- **Use modern CSS methods — Tailwind v4 ships them as first-class utilities:**
  - **Spacing between siblings:** `gap-*` on a flex/grid parent — never `space-y-*`/`space-x-*` (CSS sibling-selector utilities that break on comment nodes and inline custom elements).
  - **Square sizing:** `size-*` instead of paired `w-*/h-*` (e.g. `size-4` = `w-4 h-4`).
  - **Logical properties:** `ms-*/me-*` (inline start/end), `ps-*/pe-*` (padding inline) instead of `ml-*/mr-*/pl-*/pr-*` — RTL-safe by default.
  - **Component-responsive layout:** `@container` / `@container-size` + `@sm:`, `@md:` etc. instead of viewport breakpoints when a component's own width matters more than the screen.
  - **Nested grid alignment:** `grid-cols-subgrid` / `grid-rows-subgrid` to align nested items to a parent grid's tracks.
  - **Parent-conditional styles:** `has-[...]` variant (e.g. `has-[:checked]:bg-gold`) instead of JS-driven class toggling.
  - **CSS-native enter/exit transitions:** `starting:opacity-0 starting:scale-95` (`@starting-style`) instead of JS transition libraries for simple show/hide animations.
  - **Auto-sizing inputs:** `field-sizing-content` for textareas that grow with their content.

## Iconography

- **One icon library**, used consistently. Don't mix icon sets or hand-roll ad-hoc inline SVG for UI icons.
- Size and color icons through tokens/utilities so they align with surrounding type.

## Components & states

- Build from the `ui/` primitives; import them through their namespaced/grouped entry points.
- Express variation through a component's variant API, not by piling on ad-hoc classes.
- **Design every state.** Account for loading, empty, error, disabled, and success — not just the
  happy path. Provide clear feedback for asynchronous actions.

> [!CAUTION]
> **`data-active:` Tailwind variants do not work with bits-ui 2.x.** bits-ui sets `data-state="active"` on active triggers/items, not `data-active`. Components installed via `npx shadcn-svelte@latest add` may ship with `data-active:` classes that silently never fire, breaking active-state visuals (background, shadow, color). Always use `data-[state=active]:` instead. `src/lib/components/ui/tabs/tabs-trigger.svelte` has already been patched — audit any newly added component for this before use.

## Interaction & motion

- Motion is **subtle and purposeful** — it clarifies change, it doesn't decorate.
- Keep transitions short and consistent, and **respect reduced-motion** preferences.

## Accessibility

- Use semantic HTML; layer ARIA only to fill genuine gaps.
- Everything is keyboard operable, with visible focus.
- Label controls and provide meaningful alternative text.
- Treat accessibility as a baseline requirement, consistent with the project's inclusive-by-design principle.

## Voice & content

- The product's primary language is Indonesian; copy is clear, concise, and respectful of the subject matter.
- Prefer plain, honest microcopy — especially for status, empty, and error states.

## Do / Don't

- **Do** start from a primitive and its defaults; **don't** build a parallel one-off.
- **Do** reference tokens; **don't** hardcode visual values.
- **Do** keep non-interactive UI JavaScript-free; **don't** hydrate for purely visual components.
- **Do** design all states; **don't** ship only the happy path.
- **Do** centralize theme changes in the global stylesheet; **don't** scatter overrides across components.
**don't** use emoji or unicode symbols when `@lucide/svelte` works.
