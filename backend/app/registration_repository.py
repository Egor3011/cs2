import json
import os
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock

from app.models import Registration, RegistrationCreate, model_to_json_dict


class RegistrationDataError(RuntimeError):
    """Raised when tournament registrations cannot be stored."""


class RegistrationRepository:
    def __init__(self, data_file: Path) -> None:
        self.data_file = data_file
        self._lock = RLock()

    def create(self, registration: RegistrationCreate) -> Registration:
        with self._lock:
            registrations = self._read_unlocked()
            stored = Registration(
                **model_to_json_dict(registration),
                id=os.urandom(8).hex(),
                createdAt=datetime.now(timezone.utc).isoformat(),
            )
            registrations.append(model_to_json_dict(stored))
            self._write_unlocked(registrations)
            return stored

    def get_all(self) -> list[Registration]:
        with self._lock:
            registrations = [
                Registration.model_validate(item)
                for item in self._read_unlocked()
            ]
            return sorted(
                registrations,
                key=lambda item: item.created_at,
                reverse=True,
            )

    def _read_unlocked(self) -> list[dict]:
        try:
            with self.data_file.open("r", encoding="utf-8") as source:
                data = json.load(source)
        except FileNotFoundError:
            return []
        except (OSError, json.JSONDecodeError) as exc:
            raise RegistrationDataError(f"Cannot read registrations: {exc}") from exc

        if not isinstance(data, list):
            raise RegistrationDataError("Registrations storage must contain a JSON array")
        return data

    def _write_unlocked(self, registrations: list[dict]) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_path: Path | None = None

        try:
            with NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=self.data_file.parent,
                prefix=f".{self.data_file.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                json.dump(registrations, temporary_file, ensure_ascii=False, indent=2)
                temporary_file.write("\n")
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
                temporary_path = Path(temporary_file.name)

            os.replace(temporary_path, self.data_file)
        except OSError as exc:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise RegistrationDataError(f"Cannot save registration: {exc}") from exc
