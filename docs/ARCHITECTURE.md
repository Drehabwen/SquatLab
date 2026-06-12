# Architecture

## 1. Requirements And Decisions

| Topic | Decision | Reason |
| --- | --- | --- |
| Frontend stack | React + TypeScript + Vite | Fast iteration, matches your current local strengths, easy to keep clean and standalone |
| Backend stack | FastAPI + SQLite | Small, typed, easy to document, enough for V1.0 |
| Service type | Split frontend/backend in one repo | Keeps product boundaries clear without over-engineering |
| API shape | REST | Simple to document for software-copyright materials |
| Real-time | Frontend-local pose loop first | Avoids premature backend streaming complexity in V1.0 |
| Auth | No account auth in V1.0 | Single-user local-first product, cleaner scope |
| Error handling | Typed backend error hierarchy + global handler | Consistent API behavior and better maintainability |

## 2. Product Boundary

The backend owns:

- assessment persistence
- structured scoring orchestration
- report preview generation
- configuration defaults

The frontend owns:

- page flow
- camera UI and guidance
- local interaction states
- display of assessment results and history

The frontend should not own long-term scoring rules once the real squat engine is added.

## 3. Repository Structure

```text
frontend/
  src/
    app/
    features/
      squat/
      history/
      settings/
    shared/
      api/
      config/
      layout/
      types/

backend/
  app/
    api/
      routes/
    core/
    features/
      squat/
    shared/
  tests/
```

## 4. Backend Layers

```text
Route -> Service -> Repository
```

- Routes parse requests and return response envelopes.
- Services hold business rules and scoring logic.
- Repositories handle SQLite reads and writes.

## 5. Backend Endpoints

- `GET /health`
- `GET /ready`
- `POST /api/v1/squat/assessments`
- `GET /api/v1/squat/sessions`
- `POST /api/v1/squat/reports/preview`

## 6. Data Model Direction

### Assessment

- session id
- squat count
- depth ratio
- knee valgus ratio
- trunk lean degrees
- heel lift ratio
- balance ratio
- computed scores
- compensation flags
- created at

### Report Preview

- summary
- key findings
- risk flags
- training suggestions

## 7. Security And Operations

- explicit CORS origins from environment
- request ID middleware
- security headers middleware
- fail-fast config loading
- no wildcard production CORS

## 8. V1.0 Follow-Up Modules

- browser-side pose detector
- squat repetition state machine
- configurable scoring thresholds
- PDF export
- trend analytics
