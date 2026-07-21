FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required by psycopg2, plus the native shared
# libraries opencv-python needs to import (even the "headless" wheel links
# against libGL/libglib/libxcb etc. at runtime — python:3.12-slim ships none
# of them, so `import cv2` fails with "libxcb.so.1: cannot open shared
# object file" without these).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Cache mount (not --no-cache-dir) so pip's downloaded wheels — notably
# torch/ultralytics, ~2GB — persist across builds in BuildKit's cache even
# when this layer must rerun (e.g. a requirements.txt or apt-get change
# above invalidates it). Without this, every layer invalidation re-fetches
# every wheel from PyPI from scratch.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
