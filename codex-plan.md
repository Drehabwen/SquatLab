# Task Plan

## Objective
- Add an append-only, versioned screening evidence ledger and an explicit backend workflow state machine while preserving the current V3 API and report-readiness behavior.

## Constraints
- Keep `protocol_results` as a compatibility projection; the immutable ledger becomes the audit source.
- Static posture plus qualified Adams evidence gates formal reports; squat remains optional.
- Adams records must retain capture source, trained-observer status, device provenance, version, and review history.
- Poor evidence routes to recapture; notable or conflicting evidence routes to review.
- Existing clients without idempotency keys remain supported during migration.

## Steps
- [in_progress] Define evidence, review-event, workflow-event schemas and migration.
- [pending] Append evidence on protocol submission and make latest ledger versions drive readiness.
- [pending] Add workflow transition rules, persistence, and query endpoints.
- [pending] Extend frontend contracts/API methods without changing the V3 visual flow.
- [pending] Add ledger/idempotency/workflow tests and run backend/frontend regression checks.

## Verification
- Confirm two submissions create versions 1 and 2 while version 1 remains queryable.
- Confirm repeated idempotency keys return the original evidence without adding a version.
- Confirm review decisions append events and update readiness without mutating evidence.
- Confirm workflow transitions map missing, recapture, review, ready, and report-generated states.
- Run backend tests, focused Ruff checks, frontend type checks/tests, and production build.

## Outcome
- In progress.
