"""Text cleaning for raw loader output.

Loader output (especially PDF text extraction) tends to carry layout
artifacts that hurt both readability and downstream embedding quality:
hyphenated line-wraps, repeated whitespace, page-boundary noise, and
control characters. This module normalizes that away while leaving
the actual prose untouched — it must never rewrite words or reorder text.
"""

from __future__ import annotations

import re
import unicodedata


_CONTROL_CHARS_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HYPHENATED_LINEBREAK_PATTERN = re.compile(r"(\w)-\n(\w)")
_MULTIPLE_BLANK_LINES_PATTERN = re.compile(r"\n{3,}")
_TRAILING_WHITESPACE_PATTERN = re.compile(r"[ \t]+\n")
_HORIZONTAL_WHITESPACE_RUN_PATTERN = re.compile(r"[ \t]+")


def clean_text(raw_text: str) -> str:
    """Normalize extracted document text for chunking and embedding.

    Steps (each idempotent, order-independent except where noted):
        1. Unicode-normalize (NFKC) so visually identical characters compare equal.
        2. Strip control characters left by PDF extraction.
        3. Rejoin words hyphenated across a line break ("indus-\\ntrial" -> "industrial").
        4. Collapse any run of spaces/tabs (including a lone tab) to a single space.
        5. Strip trailing whitespace from each line.
        6. Collapse 3+ consecutive blank lines down to one blank line.
        7. Trim leading/trailing whitespace from the whole document.
    """
    if not raw_text:
        return ""

    text = unicodedata.normalize("NFKC", raw_text)
    text = _CONTROL_CHARS_PATTERN.sub("", text)
    text = _HYPHENATED_LINEBREAK_PATTERN.sub(r"\1\2", text)
    text = _HORIZONTAL_WHITESPACE_RUN_PATTERN.sub(" ", text)
    text = _TRAILING_WHITESPACE_PATTERN.sub("\n", text)
    text = _MULTIPLE_BLANK_LINES_PATTERN.sub("\n\n", text)
    return text.strip()
