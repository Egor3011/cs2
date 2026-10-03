from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, admin_registrations, matches, registrations, tournament


app = FastAPI(
    title="CS2 Tournament API",
    description="API for reading and managing CS2 tournament data.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ETag", "X-Tournament-Version"],
)

app.include_router(tournament.router)
app.include_router(matches.router)
app.include_router(registrations.router)
app.include_router(admin.router)
app.include_router(admin_registrations.router)


@app.get("/api/admin/access", tags=["admin"])
def admin_access() -> dict[str, bool]:
    return {"requiresKey": settings.admin_api_key is not None}


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
