# Task Plan

## Objective
- Harden the V3 screening architecture by making workflow state, evidence completeness, and formal-report readiness explicit backend domain rules, then connect the V3 frontend to the shared contract without deleting recoverable legacy code.

## Constraints
- Preserve all existing user documentation, V3 UI work, and the currently runnable frontend.
- Treat `frontend/frontend` and `backend/backend` as historical duplicates until build/import references and content differences are proven.
- Gait/silhouette is triage evidence only; static posture plus trained-observer Adams evidence gates a formal report.
- Phone-derived Adams/ATR must not satisfy formal-report conditions; squat remains optional specialty evidence.
- Backend policy is authoritative; frontend readiness is a projection of that policy.

## Steps
- [completed] Audit duplicate trees, active build roots, backend schema, and current V3 mock state.
- [completed] Add the shared workflow/evidence/report-readiness domain contract and policy engine.
- [completed] Expose backend workflow/readiness endpoints with persistence-compatible behavior and tests.
- [completed] Add the shared frontend readiness/provenance contract and API boundary.
- [completed] Remove duplicate roots, archive legacy materials, run regression checks, and record residual risks.

## Verification
- Run the backend test suite, including policy and API tests for missing, unusable, unverified-source, conflict, review, and ready states.
- Run `npm run check`, `npm run test -- --run`, and `npm run build` in the active frontend.
- Confirm the formal-report endpoint rejects an unready session even if the client attempts to bypass the UI.
- Confirm squat absence does not block a formal report and phone-derived Adams/ATR does not unlock one.

## Outcome
- Removed the tracked and untracked duplicate roots `frontend/frontend`, `backend/backend`, `docs/docs`, and `ui-design/ui-design` after proving they contained no unique files.
- Archived old SquatLab V1 documentation, deliverables, generation tooling, V2 high-fidelity assets, and Stitch explorations outside the active development roots.
- Replaced the outdated root README with a single active-project map and added archive/UI indexes.
- Added evidence provenance fields for capture method, trained-observer verification, validated-device identity, recorder, and review status.
- Added backend formal-report readiness policy and endpoints. Static posture and qualified Adams evidence are required; phone-derived Adams cannot unlock a report; squat is optional.
- Added a backend review transition and made integrated-report generation enforce readiness server-side.
- Added an Alembic migration for evidence provenance and matching frontend types/API methods.
- Passed 50 backend tests, frontend TypeScript checking, 25 frontend tests, and the Vite production build.
- Full-repository Ruff still reports pre-existing formatting and unused-variable findings outside this change; record this as a separate cleanup task rather than mixing it into the workflow refactor.
