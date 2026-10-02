import json
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_registration_now, get_registration_repository, get_tournament_repository
from app.registration_repository import RegistrationRepository
from app.repository import TournamentRepository
from main import app

TERMS = {
    "startsOn": "2026-10-09", "endsOn": "2026-10-11",
    "registrationClosesAt": "2026-10-08T12:00:00+03:00",
    "entryFee": 2000, "minimumTeams": 8,
    "prizeDistribution": {"first": 50, "second": 25, "third": 15, "organization": 10},
}
PAYLOAD = {"teamName": "Test team", "captainName": "Captain", "email": "test@example.com", "contact": "@captain", "players": 5}


@pytest.fixture
def tournament_store(tmp_path):
    tournament_file = tmp_path / "tournament.json"
    registrations_file = tmp_path / "registrations.json"
    data = {"title": "Test Cup", "teams": [{"id": "one", "name": "One", "seed": 1}], "terms": TERMS}
    tournament_file.write_text(json.dumps(data), encoding="utf-8")
    registrations_file.write_text("[]", encoding="utf-8")
    app.dependency_overrides[get_tournament_repository] = lambda: TournamentRepository(tournament_file)
    app.dependency_overrides[get_registration_repository] = lambda: RegistrationRepository(registrations_file)
    yield registrations_file
    app.dependency_overrides.clear()


@pytest.mark.parametrize("time,expected", [
    ("2026-10-08T08:59:59.999999+00:00", 201),
    ("2026-10-08T09:00:00+00:00", 403),
    ("2026-10-09T12:00:00+03:00", 403),
])
def test_registration_cutoff_is_enforced_before_writing(tournament_store, time, expected):
    app.dependency_overrides[get_registration_now] = lambda: datetime.fromisoformat(time)
    with TestClient(app) as client:
        response = client.post("/api/registrations", json=PAYLOAD)
    assert response.status_code == expected
    saved = json.loads(tournament_store.read_text(encoding="utf-8"))
    assert len(saved) == (1 if expected == 201 else 0)


def test_terms_and_large_team_lists_roundtrip(tournament_store):
    with TestClient(app) as client:
        assert client.get("/api/tournament").json()["terms"] == TERMS
        teams = [{"id": f"t{i}", "name": f"Team {i}", "seed": i + 1} for i in range(512)]
        response = client.patch("/api/admin/tournament", json={"teams": teams})
        assert response.status_code == 200
        assert len(client.get("/api/tournament").json()["teams"]) == 512


def test_deadline_requires_an_explicit_timezone(tournament_store):
    with TestClient(app) as client:
        response = client.patch("/api/admin/tournament", json={"terms": {**TERMS, "registrationClosesAt": "2026-10-08T12:00:00"}})
    assert response.status_code == 422
