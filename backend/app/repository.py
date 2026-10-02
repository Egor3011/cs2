import json
import os
import stat
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

from pydantic import ValidationError

from app.models import Tournament, TournamentPatch, model_to_json_dict


class TournamentDataError(RuntimeError):
    """Raised when the tournament storage cannot be read or validated."""


class TournamentRepository:
    def __init__(self, data_file: Path) -> None:
        self.data_file = data_file
        self._lock = RLock()

    def get(self) -> Tournament:
        with self._lock:
            return self._read_unlocked()

    def replace(self, tournament: Tournament) -> Tournament:
        with self._lock:
            self._write_unlocked(tournament)
            return tournament

    def patch(self, patch: TournamentPatch) -> Tournament:
        with self._lock:
            current = self._read_unlocked()
            merged_data = model_to_json_dict(current)
            merged_data.update(model_to_json_dict(patch, exclude_unset=True))
            updated = Tournament.model_validate(merged_data)
            self._write_unlocked(updated)
            return updated

    def _read_unlocked(self) -> Tournament:
        try:
            with self.data_file.open("r", encoding="utf-8") as source:
                raw_data: Any = json.load(source)
            return Tournament.model_validate(raw_data)
        except FileNotFoundError as exc:
            raise TournamentDataError(
                f"Tournament data file was not found: {self.data_file}"
            ) from exc
        except json.JSONDecodeError as exc:
            raise TournamentDataError(
                f"Tournament data file contains invalid JSON: {exc.msg}"
            ) from exc
        except (OSError, ValidationError) as exc:
            raise TournamentDataError(f"Cannot read tournament data: {exc}") from exc

    def _write_unlocked(self, tournament: Tournament) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        payload = model_to_json_dict(tournament)
        temporary_path: Path | None = None
        file_mode = 0o644

        try:
            file_mode = stat.S_IMODE(self.data_file.stat().st_mode)
        except FileNotFoundError:
            pass

        try:
            with NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=self.data_file.parent,
                prefix=f".{self.data_file.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                json.dump(payload, temporary_file, ensure_ascii=False, indent=2)
                temporary_file.write("\n")
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
                temporary_path = Path(temporary_file.name)

            temporary_path.chmod(file_mode)
            os.replace(temporary_path, self.data_file)
        except OSError as exc:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise TournamentDataError(f"Cannot save tournament data: {exc}") from exc
