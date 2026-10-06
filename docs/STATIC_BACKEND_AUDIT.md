# Static PHP and SQL audit

`PATCH /students/{id}` previously merged the body after the route ID, allowing
a body ID to select a different record. The route ID now takes precedence.
This is a static correctness fix. PHP, the database, migrations and backend
tests were not executed; frontend mock results do not validate this change.

The review inspected `backend/index.php`, `backend/config.php`,
`backend/config.local.example.php`, and `database/rankify_ai.sql`. It did not
inspect local overrides, `.env` files, credentials or deployed backend behavior.

## Observed source behavior

- `current_user()` checks a bearer session against its expiry using a prepared
  query. `require_teacher()` guards POST, PUT, PATCH and DELETE student operations.
  Student reads and chat also require a session. These are source observations,
  not runtime authorization results.
- Bulk student upserts use a transaction. The outer exception handler rolls
  back an active transaction. The new PUT replacement validates the input array and row shapes before
  deleting and upserting inside the same transaction. The frontend now uses
  that single request instead of separate clear/save calls. This transaction
  contract was reviewed in source only and has not been tested against PHP/SQL.
- The SQL schema has unique user emails, session-to-user foreign keys with
  cascading deletion, student IDs as primary keys and class/kind/meeting indexes.
  Scores and optional pre/post scores are nullable; no score-range CHECK is
  declared. No schema or migration was applied.
- Configuration supports database/frontend/AI environment variables and a local
  override. The chat route uses the `openrouter` configuration. A legacy
  DeepSeek key fallback also exists; documentation and deployment must match the
  endpoint/model configured. No credential value was exported.

## Remaining limitations

- Login compares SHA-256 password hashes; the schema stores 64-character hashes.
  Migrating to a dedicated password hashing scheme requires coordinated login,
  schema and seed changes, which were not attempted in this static-only review.
- `student_payload()` does not enforce all frontend score/range rules. Bulk rows now receive array shape checks before the typed helper call,
  but comprehensive field and numeric validation remains incomplete.
  These paths need backend runtime tests when that testing is authorized.
- The exception handler returns the exception message. Production error
  disclosure and a safe server-side logging policy need a separate runtime review.
- The chat cURL request forwards streamed chunks without explicit connect/total
  timeout settings in this source or an HTTP-status check after execution.
  Backend/provider error frames and premature EOF therefore need frontend mock
  regression coverage; actual provider behavior was not exercised.
- The student dataset is shared; this schema does not express classroom/tenant
  ownership. Browser role checks do not establish server-side data isolation.

The complete long-task report must independently state frontend test/browser
and soak evidence. This static audit makes no claim that those gates passed.
