import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone

# Per-request correlation ID — set by the request_context middleware.
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class JsonFormatter(logging.Formatter):
    """Emit log records as one-line JSON for machine-readability."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "req_id": request_id_var.get("-"),
        }
        if record.exc_info and record.exc_info[1] is not None:
            payload["exc"] = str(record.exc_info[1])
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
