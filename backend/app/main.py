import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.deps import get_database
from app.core.responses import Utf8JSONResponse
from app.api.router import api_router
from app.api.routes.camera import clear_live_analysis_store_cache, close_pose_detector_cache
from app.core.config import get_settings
from app.core.errors import AppError, app_error_handler, http_exception_handler
from app.core.logging import configure_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging()
    get_database().initialize()
    logger.info("Starting %s in %s mode", settings.app_name, settings.app_env)
    yield
    close_pose_detector_cache()
    clear_live_analysis_store_cache()
    logger.info("Stopping %s", settings.app_name)


import os
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="青跃智衡 API", version="2.0.0", lifespan=lifespan, default_response_class=Utf8JSONResponse)
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# Mount static directory for serving update APKs
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(os.path.dirname(current_dir), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MiB


@app.middleware("http")
async def request_size_limit_middleware(request: Request, call_next):
    """Reject oversized request bodies to guard against OOM."""
    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_UPLOAD_BYTES:
            return Utf8JSONResponse(
                status_code=413,
                content={
                    "error": {
                        "message": f"Request body exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MiB limit",
                        "type": "PayloadTooLarge",
                    }
                },
            )
    return await call_next(request)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    from app.core.logging import request_id_var

    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    token = request_id_var.set(request_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        return response
    finally:
        request_id_var.reset(token)


@app.exception_handler(AppError)
async def handle_app_error(request: Request, error: AppError) -> JSONResponse:
    return await app_error_handler(request, error)


@app.exception_handler(HTTPException)
async def handle_http_error(request: Request, error: HTTPException) -> JSONResponse:
    return await http_exception_handler(request, error)


@app.exception_handler(Exception)
async def handle_unexpected_error(_: Request, error: Exception) -> JSONResponse:
    logger.exception("Unexpected error: %s", error)
    return Utf8JSONResponse(
        status_code=500,
        content={"error": {"message": "Internal server error", "type": "UnexpectedError"}},
    )


app.include_router(api_router)
