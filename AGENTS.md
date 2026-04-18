<!-- BEGIN:nextjs-agent-rules -->
# NextGeneration Repository Rules

This is NOT the Next.js you know.

Next.js 16 has breaking changes in APIs, conventions, and file structure. Read the relevant guide in `node_modules/next/dist/docs/` before changing framework-facing code, and do not ignore deprecation notices.

## Mandatory Rules

1. Preserve the current architecture.
   - Keep domain models and factories in `src/lib/book`.
   - Keep editor state and mutations in `src/stores`.
   - Keep rendering and interaction logic in `src/components`.
   - Do not move business mutations into UI components unless there is a clear architectural rewrite plan.

2. Preserve the existing product language.
   - Treat the current warm pastel-brown visual system in `src/app/globals.css` as the baseline.
   - Extend tokens and shared utilities before introducing ad hoc colors, shadows, or duplicate styling patterns.

3. Keep state changes action-centric.
   - Prefer store actions over scattered local mutation logic.
   - Maintain document invariants for page ordering, page side assignment, object layering, selection, and undo/redo history.

4. Keep typing strict.
   - Do not introduce `any`, broad index signatures, or `@ts-ignore`.
   - Prefer explicit TypeScript models, discriminated unions, and narrow helper types.

5. Keep React logic derivation-safe.
   - Do not derive render state via `useEffect` followed by synchronous `setState` when the value can be computed from props, store state, or memoized helpers.
   - Remove unused imports, variables, and dead logic as part of the change that introduces them.

6. Treat current code as a baseline, not a perfect reference.
   - Existing lint violations and encoding issues must not be copied into new work.
   - When touching legacy code, leave it better typed and cleaner than before when the scope reasonably allows it.

7. Use clean UTF-8 text.
   - Keep UI copy, docs, and source files in clean UTF-8 encoding.
   - Fix mojibake in touched areas instead of preserving corrupted text.

8. A change is not done until validation passes.
   - Run `npm run lint` before considering implementation complete.
   - If lint fails because of pre-existing issues outside the change scope, call that out explicitly and do not add new violations.

## Working References

- Detailed playbook: `docs/governance/engineering-playbook.md`
- Codex-first agent library: `.codex/agents/`
<!-- END:nextjs-agent-rules -->
