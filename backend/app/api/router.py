from fastapi import APIRouter

from .routes.assessments import router as assessments_router
from .routes.camera import router as camera_router
from .routes.health import router as health_router
from .routes.reports import router as reports_router
from .routes.screening import router as screening_router
from .routes.sessions import router as sessions_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(assessments_router)
api_router.include_router(sessions_router)
api_router.include_router(reports_router)
api_router.include_router(camera_router)
api_router.include_router(screening_router)
