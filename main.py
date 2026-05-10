# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import reports, users, departments, admin
from logger import get_logger

logger = get_logger("main")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="CivicSight API",
    version="1.0.0",
    description="Civic Issue Reporting Platform — Backend API",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    # Explicitly whitelist localhost so we can safely keep credentials=True if needed
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*" 
    ],
    allow_credentials=False, # <--- THIS IS THE MAGIC FIX. Set this to False.
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── Global exception handler ──────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )

# ── Request logging middleware ────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"→ {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"← {response.status_code} {request.url.path}")
    return response

app.include_router(reports.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "CivicSight API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}
