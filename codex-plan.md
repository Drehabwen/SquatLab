# Task Plan

## Objective
- Implement the first backend structure loop for joint screening protocols and integrated reports.

## Constraints
- Keep the current React + FastAPI API contract unchanged.
- Add vNext screening APIs alongside existing squat APIs.
- Start with structured protocol metrics; do not attempt full image algorithms in this step.
- Keep report wording as screening guidance, not diagnosis.

## Steps
- [completed] Inspect backend persistence, routing, and current tests.
- [completed] Add screening schemas, repository, rules engine, and routes.
- [completed] Add tests for session creation, protocol results, integrated reports, and recapture/review rules.
- [completed] Run backend and frontend verification and record outcome.

## Verification
- `npm run build` in `frontend`
- `npm run test -- --run` in `frontend`
- `python -m pytest` in `backend`

## Outcome
- Added backend vNext screening tables: `subjects`, `screening_sessions`, `protocol_results`, and `integrated_reports`.
- Added `features/screening` schemas, repository, and rules service for static posture, Adams forward-bend, squat protocol results, and integrated reports.
- Added `/api/v1/subjects` and `/api/v1/screening/...` routes while preserving existing squat routes.
- Added frontend API types and client methods for screening sessions, protocol analysis, and integrated reports.
- Added backend tests covering screening session creation, protocol analysis, integrated report generation, recapture routing, and history summaries.
- Verified with `python -m pytest`, `npm run build`, and `npm run test -- --run`.
