# NextGeneration Engineering Playbook

## Purpose

This document expands the repository rules in `AGENTS.md` into a working playbook for future refactors, feature work, review, ideation, and testing.

The project is a strong baseline, not a golden reference. Preserve what is already coherent and deliberately avoid repeating the technical debt that is visible today.

## Current Baseline

### Stack and Structure

- Framework: Next.js 16 App Router with React 19 and TypeScript strict mode.
- State management: Zustand in `src/stores/editor-store.ts`.
- Domain layer: book document models, factories, and seed data in `src/lib/book`.
- UI split: shell components in `src/components/shell`, editing UI in `src/components/editor`, preview UI in `src/components/viewer`.
- Styling: Tailwind 4 plus project theme tokens and shared utilities in `src/app/globals.css`.

### Qualities Worth Preserving

- Domain types and data factories are already grouped instead of being embedded inside UI files.
- Editor mutations are centralized in the Zustand store instead of being distributed across components.
- The visual direction is distinct and intentional instead of default template styling.
- The product already has a clean top-level mode split between design and preview.

### Known Debt That Must Not Be Copied Forward

- Loose typing in canvas, viewer, and domain shapes.
- `any` usage in rendering and drag/drop flows.
- `@ts-ignore` style bypasses.
- React patterns that derive local state through `useEffect` and synchronous `setState`.
- Unused imports and variables.
- Mojibake / encoding corruption in user-facing text.
- Lint does not currently pass, so existing code is not a perfect implementation reference.

## Rule-to-Repo Evidence

Each rule exists because there is evidence for it in the current repository.

| Rule | Why it exists in this repo |
| --- | --- |
| Preserve architecture | Domain models, state, and UI are already separated in `src/lib/book`, `src/stores`, and `src/components`. |
| Preserve visual language | `src/app/globals.css` defines a coherent warm palette, glass surfaces, and book-specific utilities. |
| Keep mutations in the store | `editor-store.ts` already owns page/object CRUD, history, and selection. |
| Ban `any` and ignore comments | `npm run lint` currently reports `no-explicit-any` and `ban-ts-comment` failures in editor/viewer code. |
| Avoid derive-via-effect state | `npm run lint` currently reports `react-hooks/set-state-in-effect` in `FloatingContextMenu.tsx`. |
| Keep UTF-8 clean | Seed data and labels visibly contain mojibake, so corrupted text is a known risk. |
| Require lint before done | Lint already catches the classes of issues this repo most needs to control. |

## Refactor Playbook

### Default Refactor Order

1. Confirm the user-visible behavior and invariants before changing structure.
2. Move shared logic into typed helpers before changing component render flow.
3. Tighten types before widening features.
4. Refactor one vertical slice at a time:
   editor state
   canvas/editor rendering
   viewer rendering
   serialization/import-export
5. Re-run lint after each slice that changes TypeScript or React logic.

### Safe Refactor Patterns

- Prefer extracting pure helpers over adding more local component state.
- Prefer discriminated unions for `PageObject` variants over broad catch-all object shapes.
- Prefer selectors and store actions over direct `getState()` usage in new code unless the interaction is global and event-driven.
- Prefer tokenized theme changes in `globals.css` over inline one-off styles when introducing repeatable UI patterns.

### Unsafe Patterns

- Rebuilding the store around component-local state without a migration plan.
- Mixing domain mutation and view rendering inside Konva or flipbook nodes.
- Adding new object types without updating domain types, factory creation, editor handling, and preview rendering together.
- Treating sample seed content as authoritative copy when it is already encoding-damaged.

## Feature and Component Rules

### Adding a New Object Type

Every new object type must update all of the following together:

- Type definition in `src/lib/book/types.ts`
- Factory creation in `src/lib/book/factories.ts`
- Store add/update behavior if new invariants are needed
- Editor rendering in `src/components/editor/BookCanvas.tsx`
- Preview rendering in `src/components/viewer/BookViewer.tsx`
- Toolbar/context affordances if the object is user-creatable
- Tests or test cases covering create, update, delete, ordering, and preview behavior

### Adding a New Editor Feature

- Keep mutations in the store unless the feature is purely presentational.
- Define invariants first:
  selection behavior
  undo/redo expectations
  page ordering implications
  preview sync implications
- If the feature affects both design and preview, document the expected sync behavior before implementation.

### UI and UX Rules

- Preserve the existing warm editorial aesthetic unless the task is an intentional redesign.
- Favor deliberate UI over template-like generic controls.
- Check desktop and mobile implications for changes to topbar, viewer stage, filmstrip, and floating controls.
- Reuse theme tokens and shared utilities before creating new visual primitives.

## Testing and Acceptance

### Minimum Validation for Any Non-Trivial Change

- `npm run lint`
- Verify page add, duplicate, delete, and reorder behavior still works.
- Verify object add, update, delete, and layer movement still work.
- Verify preview stays synchronized with selected page.
- Verify cover, back cover, and odd/even spread behavior if viewer logic is touched.

### Suggested Test Matrix for Future Automation

- Store invariants:
  undo/redo stacks
  selected page fallback after delete
  selected object cleanup after delete
  z-index normalization after reorder and delete
- Editor interactions:
  keyboard undo/redo
  delete shortcut
  canvas deselect on background click
  filmstrip drag reorder
- Viewer interactions:
  editor-to-preview page sync
  preview-to-editor page sync
  navigation button enable/disable state
  cover/back-cover translation behavior

## Review Checklist

Before approving a patch, check:

- Does it preserve the `src/lib/book` -> `src/stores` -> `src/components` responsibility split?
- Does it add any new `any`, ignore comments, or dead code?
- Does it derive state in effects that should be computed directly?
- Does it keep the visual system aligned with `globals.css`?
- Does it preserve page/order/selection/history invariants?
- Does it keep preview behavior aligned with design behavior?
- Does it introduce or leave behind corrupted UTF-8 text in touched files?

## Priority Improvement Themes

These are the highest-value future improvements aligned with the current codebase:

1. Replace broad `PageObject` typing with discriminated unions and typed payloads.
2. Extract geometry and view-model helpers from large editor and viewer components.
3. Define serialization and import/export contracts for `BookDocument`.
4. Add acceptance coverage for spread logic and design/preview synchronization.

## Agent Usage

Codex-first agent prompts live in `.codex/agents/`.

Use them as role prompts for specialized work:

- `repo-governor` for governance and patch compliance
- `refactor-architect` for safe refactor sequencing
- `ui-consistency-critic` for UX and visual review
- `editor-domain-guardian` for state and invariant review
- `test-oracle` for test design and validation coverage
- `idea-forge` for constrained feature ideation
- `regression-scout` for bug and regression analysis
