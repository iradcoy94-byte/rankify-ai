# Preparation and experiment provenance

The original base is ef7b74b9e2471cd8808f16867d02749d0bab0a3e on the
private petpet-kawaii/rankify fork. No upstream/main push or merge is authorized.

Two full-prompt OpenCode attempts stopped before implementing the requested
changes or performing any soak batches:

- rankify-20261006-063155: exhausted five resumes; invalid mandatory tool
  arguments persisted; three bounded helper diagnoses were used.
- rankify-20261006-073843: exhausted five resumes; initial Responses assistant
  history caused HTTP 400, repaired by the opt-in local compatibility shim.
  Later requests/read exploration and a checkpoint did not produce source edits
  or active soak batches. It exited zero despite incomplete deliverables.

Both original run records remain terminal. Their budgets/deadlines are not reset.
The changes and regression tests in this preparation commit were implemented by
root Codex after those failures. They are not evidence of native whole-task
OpenCode success. A subsequent prepared-artifact experiment must report this
assistance explicitly and preserve the full remaining verification, twenty
active five-minute batches, report, commit, push and draft-PR requirements.

Preparation addresses SSE terminal/EOF and malformed frames, finite numeric
validation and dense ranking, OCR names/decimal commas, Excel group boundaries,
API error/empty response handling, queued optimistic mutations with confirmed
cache and rollback, upload confirmation, accessible row inputs, and static PHP
route-ID/transaction replacement correctness. PHP/SQL were not executed.

The frontend suite currently contains 42 mock regression tests (including one
pre-existing placeholder). Vitest passed all 42 before the final source freeze;
subsequent experiments must independently rerun the tests and browser checks.
Lint has zero errors and ten existing component-export warnings. Build succeeds
with the existing large JavaScript bundle warning. Static backend limitations
are recorded separately in STATIC_BACKEND_AUDIT.md. This is preparation evidence,
not a completed long-task report or proof of a 100-minute soak.

Preparation Chromium checks passed all 24 role/route/viewport workflows at
375, 768 and 1440 pixels with mocked APIs and blocked external requests.
Screenshots: private state directory prepared-browser/. TypeScript checking
passed after correcting the existing optional login-overload annotation.
