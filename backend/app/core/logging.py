"""JSON-structured logging + request id propagation.

The output format is one JSON object per line, ready for ingestion by Loki,
Datadog, ELK, or grep. When ``LOG_FORMAT`` is anything other than ``"json"``
(the default in development), records render with the stdlib formatter so
local dev keeps its familiar look.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
import uuid
from contextvars import ContextVar
from typing import Any

from starlette.types import ASGIApp, Receive, Scope, Send

_request_id_var: ContextVar[str | None] = ContextVar("_request_id_var", default=None)


def get_request_id() -> str | None:
    return _request_id_var.get()


def set_request_id(value: str | None) -> None:
    _request_id_var.set(value)


_RESERVED_RECORD_KEYS = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "asctime", "message", "taskName",
}


class JsonFormatter(logging.Formatter):
    """Render log records as compact JSON, one object per line."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
                  + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        request_id = _request_id_var.get()
        if request_id:
            payload["request_id"] = request_id

        try:
            from app.core.audit_context import get_audit_user_id
            user_id = get_audit_user_id()
            if user_id is not None:
                payload["user_id"] = user_id
        except Exception:
            pass

        for key, value in record.__dict__.items():
            if key in _RESERVED_RECORD_KEYS or key.startswith("_"):
                continue
            payload[key] = value

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = record.stack_info

        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging() -> None:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = os.getenv("LOG_FORMAT", "json").lower()

    handler = logging.StreamHandler(sys.stdout)
    if log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        ))

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(log_level)

    for noisy in ("uvicorn.access", "uvicorn.error", "uvicorn", "fastapi"):
        logging.getLogger(noisy).handlers = []
        logging.getLogger(noisy).propagate = True


class RequestIDMiddleware:
    """Pure-ASGI middleware that stamps each request with an ID.

    Reuses an inbound ``X-Request-Id`` header if the upstream proxy supplied
    one, otherwise generates a UUID4 hex. The ID is stored in a contextvar
    (so log records can pick it up) and echoed back in the response header.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = None
        for name, value in scope.get("headers", []):
            if name == b"x-request-id":
                request_id = value.decode("latin-1")[:64]
                break
        if not request_id:
            request_id = uuid.uuid4().hex

        token = _request_id_var.set(request_id)

        async def send_with_header(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("latin-1")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_header)
        finally:
            _request_id_var.reset(token)
