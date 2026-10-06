# Long task report — rankify-prepared-20261006-0910

## Provenance (required disclosure)

This run is a **prepared-artifact experiment**. The source changes, regression
tests and static backend audit in the base commit
`a0aaf858e72759345bfdd37176ec921890db9672` ("Fix frontend streaming, import
validation and confirmed student synchronization") were **implemented by root
Codex** before this session began, after two earlier full-prompt attempts that
exhausted their resumes without producing source edits. They are **not** evidence
of native whole-task OpenCode success. See `docs/IMPLEMENTATION_PROVENANCE.md`.

This session independently re-verified the prepared implementation and then
executed the remaining deliverables: independent rerun of tests/build/lint, the
full twenty-batch ACTIVE soak, this report, the commit, the push and the draft PR.

## What this session did

1. Read `docs/IMPLEMENTATION_PROVENANCE.md` and `docs/STATIC_BACKEND_AUDIT.md`.
2. Inspected the baseline browser evidence
   (`…/rankify-prepared-20261006-0910/baseline/browser/report.json`): 24
   assertions, 0 failed, mock-only, 48 external requests blocked.
3. Independently re-ran `vitest run` (42 tests), `vite build` and `eslint .`.
4. Confirmed the source tree was frozen, then ran all 20 sequential ACTIVE soak
   batches through the external runner. No source change was made before or
   during the soak, so the tree fingerprint is identical across all 20 receipts.
5. Wrote this report, ran the final gates, committed and pushed the authorized
   branch, and opened the draft PR.

No new source, backend, database, package or configuration change was made in
this session. The implementation under test is the prepared commit as delivered.

## Prepared changes re-verified here

The base commit touched 22 files (+717 / −209). Frontend behaviour under test:

- **SSE streaming** (`src/services/aiService.ts`, +76 tests): terminal/EOF and
  malformed or split frames are handled instead of hanging or crashing.
- **Ranking / validation** (`src/lib/ranking.ts`, +38 tests): finite numeric
  validation and dense ranking; randomized cases driven by
  `process.env.RANKIFY_TEST_SEED`.
- **OCR parsing** (`src/lib/parser.ts`, +18 tests): names and decimal commas.
- **Excel grouping / import** (`src/services/excelService.ts`,
  `src/components/ExcelUploader.tsx`, +25 tests): group boundaries.
- **Student state and failed synchronization** (`src/hooks/useStudents.ts`,
  +113 tests): queued optimistic mutations with confirmed cache writes and
  rollback on failure.
- **API error handling** (`src/services/api.ts`, +49 tests): error and empty
  responses.
- **Upload confirmation and accessible row inputs**
  (`src/pages/Upload.tsx`, `src/components/Uploader.tsx`,
  `src/components/RankingTable.tsx`, +34 tests).
- **Static PHP/SQL** (`backend/index.php`): route-ID precedence over the body ID
  and transaction-wrapped bulk replacement. **Not executed** — see limitations.

## Test counts

| Gate | Result |
|---|---|
| `npm run test` (`vitest run`) | 8 files, **42 tests passed**, 0 failed |
| `npm run build` (`vite build`) | **succeeded**; one pre-existing `>500 kB` chunk warning |
| `npm run lint` (`eslint .`) | **0 errors**, 10 pre-existing `react-refresh/only-export-components` warnings |
| TypeScript | passing (per preparation record; no type annotation changed here) |

Test files: `src/lib/ranking.test.ts` (11), `src/services/aiService.test.ts` (8),
`src/hooks/useStudents.test.ts` (8), `src/services/api.test.ts` (5),
`src/services/excelService.test.ts` (3), `src/lib/parser.test.ts` (3),
`src/pages/Upload.test.tsx` (3), `src/test/example.test.ts` (1, pre-existing).

All tests are mock-only: `fetch`/API are mocked and no real network request is
made. The randomized ranking/validation tests consume
`process.env.RANKIFY_TEST_SEED`, which the runner varies per batch iteration.

## Browser checks and screenshots

The fixed external acceptance helper `browser_probe.mjs` was used by every batch.
It serves the built `dist/` from a local HTTP server, fulfils every API request
in-browser, aborts external requests, and asserts on real Chromium at 375, 768
and 1440 px with `reducedMotion: 'reduce'`:

- teacher routes `/`, `/upload`, `/peringkat-keseluruhan`, `/peringkat-kelas`,
  `/analisis`; student routes `/`, `/peringkat-keseluruhan`, `/upload`
- page is not blank; no uncaught browser exception
- `document.documentElement.scrollWidth` does not exceed the viewport (no
  horizontal overflow)
- mock ranking data renders on the ranking pages
- a student cannot reach the teacher upload page (read-only student behaviour)
- keyboard `Tab` moves focus to a real control, not `BODY`

**24 assertions per probe run, 0 failed, in every batch.** Screenshots are
written per role/viewport/route under each batch's `browser/` directory, e.g.
`…/batches/20/browser/guru-375-_upload.png`. The pre-change baseline is at
`…/baseline/browser/` with its own `report.json`.

## Soak evidence

20 sequential ACTIVE batches, each a real five-minute minimum of Vitest plus
Chromium mock workflows with changing seeds — no idle sleeps. Invoked as:

```
python3 /home/mal/homelab-docs/llm-router/long-task/runner.py batch rankify-prepared-20261006-0910 INDEX
```

Aggregate from the 20 receipts (all `passed: true`, no failures, no retries):

- **20/20 receipts**, 0 missing, at
  `/home/mal/.local/state/opencode-long-task/rankify-prepared-20261006-0910/batches/01..20/receipt.json`
- **120 probe/vitest iterations** (6 per batch)
- **6 614.8 s ≈ 110.2 minutes** of active verified work
- **42 tests and 24 browser assertions, every iteration**
- identical tree fingerprint across all 20 receipts:
  `8aa4b19c29b58e7b5bef4a1651553483d42163c6a97f90f87f821d718e864f2d`
- seeds spanned `index * 100000 + iteration`, i.e. 100000–200005

Per-batch seconds: 321.4, 318.7, 319.8, 319.2, 323.9, 324.6, 323.9, 321.9, 321.1,
328.7, 341.8, 341.3, 359.7, 333.3, 321.9, 320.6, 366.6, 351.6, 326.1, 328.8.

Diagnostics: `…/batches/NN/build.log`, `test.log`, `vitest.json`, `browser.log`,
`browser/report.json` and `progress.json`. No `failure.json` was produced in any
batch, and no receipt was falsified or regenerated.

## Static backend / SQL audit

Read-only static review, reproduced from `docs/STATIC_BACKEND_AUDIT.md`. **PHP,
the database, migrations and backend tests were never executed** in this run or
by the preparation work. Mock results do **not** prove server-side authorization
or database correctness.

- `backend/index.php` route-ID precedence over a body-supplied ID on
  `PATCH /students/{id}`; bulk upserts run inside a transaction with rollback in
  the outer handler; the frontend now issues one replacement request instead of
  separate clear/save calls. Source-only contract review.
- `current_user()` validates a bearer session against expiry;
  `require_teacher()` guards POST/PUT/PATCH/DELETE student operations; student
  reads and chat also require a session. Source observations only.
- `database/rankify_ai.sql`: unique user emails, session→user cascading foreign
  keys, student IDs as primary keys, class/kind/meeting indexes; scores are
  nullable with **no score-range CHECK**. No schema or migration was applied.
- Config supports db/frontend/AI environment variables with a local override;
  chat uses the `openrouter` configuration with a legacy DeepSeek fallback.

Open static findings (untested, not safe to change here): SHA-256 password
hashes rather than a dedicated scheme; `student_payload()` does not enforce all
frontend score/range rules; the exception handler returns the exception message
(production disclosure risk); the chat cURL forwarding has no explicit
connect/total timeouts or post-execution status check; the student dataset is
shared with no classroom/tenant ownership, so browser role checks do not
establish server-side data isolation.

## Limitations

- This is a prepared-artifact run; the implementation credit belongs to root
  Codex's preparation commit, as disclosed above.
- No backend, database, migration, Docker, SSH, infrastructure or real
  AI-provider request was executed. All backend/SQL statements remain untested.
- Frontend coverage is mock-only; `VITE_API_BASE_URL` points at an unusable local
  mock endpoint and browser probes intercept all requests. No real authorization,
  persistence or concurrency is proven.
- The single pre-existing placeholder test (`src/test/example.test.ts`) remains.
- Bundle size warning (`>500 kB` main chunk) is pre-existing and was not
  addressed; the 10 lint warnings are pre-existing component-export warnings,
  distinguished from regressions (0 errors both before and after).
- Screenshots live in the private state directory, not in the repository.

## Final gates and delivery

- `npm run test` → 42 passed. `npm run build` → succeeded. `npm run lint` →
  0 errors / 10 pre-existing warnings.
- Working tree is clean and committed on
  `codex/opencode-long-rankify-prepared-20261006-0910`, pushed to origin only.
  `main` was never pushed, merged or published upstream.
- A draft PR was opened against `petpet-kawaii/rankify` `main` from that branch
  (no pre-existing PR existed, so none was duplicated), with this report's
  validation summary and limitations in its body.
- Checkpoint: `/home/mal/.local/state/opencode-long-task/rankify-prepared-20261006-0910/checkpoint.json`.
