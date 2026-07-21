"""Range-aware static media serving for demo scenario CCTV clips.

Starlette 0.38 (pinned in this project — see ``requirements.txt``) has no
HTTP Range support in either ``StaticFiles`` or ``FileResponse``; both
always return the full file body with ``200 OK``, ignoring any ``Range``
request header. Browsers rely on Range requests to seek/buffer large
video files — without a ``206 Partial Content`` response, playback of the
~95MB demo clip stalls partway through instead of buffering incrementally,
which is what caused the "restarts from the beginning after ~35s" bug.
This route implements the standard single-range subset of RFC 7233 (the
only form browsers issue for `<video>` seeking) directly, rather than
waiting on a Starlette upgrade.

Public, unauthenticated — an HTML `<video>` tag cannot attach an
Authorization header — and scoped to exactly one directory
(``backend/data/cctv/``) containing only operator-supplied demo clips
(see that directory's ``.gitignore``), never user-uploaded content.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse

router: APIRouter = APIRouter(prefix="/media/cctv", tags=["Demo Scenario Playback"])

CCTV_MEDIA_DIR: Path = Path(__file__).resolve().parents[2] / "data" / "cctv"

_CHUNK_SIZE = 1024 * 1024  # 1 MiB per streamed chunk
_RANGE_PATTERN = re.compile(r"bytes=(\d*)-(\d*)")


def _resolve_media_path(filename: str) -> Path:
    """Resolve ``filename`` under ``CCTV_MEDIA_DIR``, rejecting any path escape.

    ``filename`` comes straight from the URL path — reject anything that
    would resolve outside the media directory (e.g. ``../../etc/passwd``)
    before touching the filesystem.
    """
    candidate = (CCTV_MEDIA_DIR / filename).resolve()
    if CCTV_MEDIA_DIR.resolve() not in candidate.parents and candidate != CCTV_MEDIA_DIR.resolve():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    if not candidate.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    return candidate


def _iter_file_range(path: Path, start: int, end: int):
    """Yield ``path``'s bytes from ``start`` to ``end`` (inclusive), in fixed-size chunks."""
    with path.open("rb") as handle:
        handle.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = handle.read(min(_CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


@router.get(
    "/{filename}",
    summary="Serve a demo scenario CCTV clip, with HTTP Range support",
    description=(
        "Streams a video file from backend/data/cctv/ with proper 206 Partial Content "
        "support for Range requests — required for a browser <video> element to "
        "seek/buffer a large file correctly. Public and unauthenticated."
    ),
    response_class=Response,
)
async def get_media_file(
    filename: str,
    request: Request,
    range_header: Annotated[str | None, Header(alias="range")] = None,
) -> Response:
    path = _resolve_media_path(filename)
    file_size = path.stat().st_size
    media_type = "video/mp4" if path.suffix.lower() == ".mp4" else "application/octet-stream"

    if range_header is None:
        # No Range header — return the whole file. Still worth declaring
        # Accept-Ranges so the browser knows it CAN issue range requests
        # on the next request (e.g. once it wants to seek).
        return StreamingResponse(
            _iter_file_range(path, 0, file_size - 1),
            media_type=media_type,
            headers={"Accept-Ranges": "bytes", "Content-Length": str(file_size)},
        )

    match = _RANGE_PATTERN.match(range_header)
    if not match:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid Range header.")

    start_str, end_str = match.groups()
    start = int(start_str) if start_str else 0
    end = int(end_str) if end_str else file_size - 1
    end = min(end, file_size - 1)

    if start > end or start >= file_size:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Requested range not satisfiable.",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    return StreamingResponse(
        _iter_file_range(path, start, end),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        media_type=media_type,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
        },
    )
