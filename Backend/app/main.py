from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import admin, api_v1_auth, auth_me, depts, events, registrations

settings = get_settings()

app = FastAPI(
    title="IARE Event Hub API",
    version="0.1.0",
    description="FastAPI backend for college event management with student, event manager, and main admin roles.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "message" in exc.detail:
        content = exc.detail
    else:
        content = {"message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"message": "validation error", "errors": exc.errors()},
    )


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}


app.include_router(auth_me.router)
app.include_router(api_v1_auth.router)
app.include_router(depts.router)
app.include_router(events.router)
app.include_router(registrations.router)
app.include_router(admin.router)
