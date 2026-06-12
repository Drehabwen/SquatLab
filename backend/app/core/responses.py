import json
from typing import Any

from fastapi.responses import JSONResponse


class Utf8JSONResponse(JSONResponse):
    """JSONResponse that preserves non-ASCII characters (e.g. Chinese) instead of escaping them."""

    media_type = "application/json; charset=utf-8"

    def render(self, content: Any) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")
