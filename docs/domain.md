# Domain language

The todo domain vocabulary is unchanged by the hosting move. The API, the
shared model in `src/shared/todo.ts`, and this glossary all use the same terms.

- **Todo**: one thing to do. `{ id, title, done, priority, createdAt }`.
- **Title**: required, trimmed, 1–200 characters. Blank, missing, non-string,
  or over-long titles are rejected.
- **Done**: a boolean tracking progress. Non-boolean values are rejected.
- **Priority**: `low`, `medium`, or `high`. New todos default to `medium`;
  anything else is rejected on create and on update.
- **Created-at**: server-assigned creation timestamp, carried through unchanged.

Validation lives in `src/shared/todo.ts` so client and Worker share one
implementation, and the HTTP contract (list, create, patch; same status codes)
is the product seam the test suite pins down.
