from dataclasses import dataclass
import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
BACKEND_DATA_FILE = BACKEND_DIR / "data" / "tournament.json"
REGISTRATIONS_DATA_FILE = BACKEND_DIR / "data" / "registrations.json"


def _cors_origins() -> list[str]:
    raw_value = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


@dataclass(frozen=True, slots=True)
class Settings:
    tournament_data_file: Path
    registrations_data_file: Path
    admin_api_key: str | None
    cors_origins: list[str]


settings = Settings(
    tournament_data_file=Path(
        os.getenv("TOURNAMENT_DATA_FILE", str(BACKEND_DATA_FILE))
    ).expanduser(),
    registrations_data_file=Path(
        os.getenv("REGISTRATIONS_DATA_FILE", str(REGISTRATIONS_DATA_FILE))
    ).expanduser(),
    admin_api_key=os.getenv("ADMIN_API_KEY") or None,
    cors_origins=_cors_origins(),
)
