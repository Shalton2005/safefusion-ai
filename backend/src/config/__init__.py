"""
Configuration package for SafeFusion AI backend.

Re-exports the singleton :data:`settings` instance so that any module
can import it directly from the package root::

    from src.config import settings
"""

from src.config.settings import settings

__all__: list[str] = ["settings"]
