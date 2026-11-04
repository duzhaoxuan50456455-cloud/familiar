import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Familiar API", version="0.1.0")

# CORS: restrict to the frontend origin.
# In development this defaults to the Vite dev server.
# Set CORS_ORIGIN to the deployed frontend URL in production.
cors_origin = os.getenv("CORS_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[cors_origin],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    """Liveness check used by deployment platforms and local verification."""
    return {"status": "ok"}
