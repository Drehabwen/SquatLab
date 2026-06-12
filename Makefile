.PHONY: ci ci-frontend ci-backend lint lint-frontend lint-backend test test-frontend test-backend build

# ── Full CI ──────────────────────────────────────────────
ci: ci-frontend ci-backend

# ── Frontend ─────────────────────────────────────────────
ci-frontend: lint-frontend build test-frontend

lint-frontend:
	cd frontend && npx tsc --noEmit

build:
	cd frontend && npm run build

test-frontend:
	cd frontend && npm test -- --run

# ── Backend ──────────────────────────────────────────────
ci-backend: lint-backend test-backend

lint-backend:
	cd backend && ruff check app/ tests/

test-backend:
	cd backend && python -m pytest tests/ -v --tb=short

# ── Dev ──────────────────────────────────────────────────
dev-frontend:
	cd frontend && npm run dev -- --port 5200

dev-backend:
	cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload

# ── Alembic ──────────────────────────────────────────────
db-upgrade:
	cd backend && alembic upgrade head

db-migrate:
	cd backend && alembic revision --autogenerate -m "auto"

# ── Docker ──────────────────────────────────────────────
docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
