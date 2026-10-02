import json
from datetime import UTC, datetime

import pytest

from fastapi.testclient import TestClient

from app.dependencies import get_registration_now, get_registration_repository, get_tournament_repository
from app.registration_repository import RegistrationRepository
from app.repository import TournamentRepository
from main import app


@pytest.fixture(autouse=True)
def registration_clock():
    # Persistence tests should not depend on the actual registration closing date.
    app.dependency_overrides[get_registration_now] = lambda: datetime(2026, 10, 1, tzinfo=UTC)
    yield
    app.dependency_overrides.pop(get_registration_now, None)


SAMPLE = {
    "title": "Test Cup",
    "resetFinal": False,
    "teams": [
        {"id": "one", "name": "One", "seed": 1},
        {"id": "two", "name": "Two", "seed": 2},
    ],
    "results": {},
}


def test_public_read_and_admin_patch(tmp_path):
    data_file = tmp_path / "tournament.json"
    data_file.write_text(json.dumps(SAMPLE), encoding="utf-8")
    app.dependency_overrides[get_tournament_repository] = lambda: TournamentRepository(data_file)

    try:
        with TestClient(app) as client:
            response = client.get("/api/tournament")
            assert response.status_code == 200
            assert response.json()["title"] == "Test Cup"

            response = client.patch(
                "/api/admin/tournament",
                json={"title": "Updated Cup"},
            )
            assert response.status_code == 200
            assert response.json()["tournament"]["title"] == "Updated Cup"
            assert json.loads(data_file.read_text(encoding="utf-8"))["title"] == "Updated Cup"
    finally:
        app.dependency_overrides.clear()


def test_invalid_team_seeds_are_rejected(tmp_path):
    data_file = tmp_path / "tournament.json"
    data_file.write_text(json.dumps(SAMPLE), encoding="utf-8")
    app.dependency_overrides[get_tournament_repository] = lambda: TournamentRepository(data_file)

    invalid = {**SAMPLE, "teams": [{"id": "one", "name": "One", "seed": 2}]}
    try:
        with TestClient(app) as client:
            response = client.put("/api/admin/tournament", json=invalid)
            assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_public_response_does_not_add_null_optional_fields(tmp_path):
    data_file = tmp_path / "tournament.json"
    payload = {
        **SAMPLE,
        "results": {
            "completed": {"winnerId": "one", "scores": [2, 0]},
            "live": {"status": "live", "scores": [1, 0]},
        },
    }
    data_file.write_text(json.dumps(payload), encoding="utf-8")
    app.dependency_overrides[get_tournament_repository] = lambda: TournamentRepository(data_file)

    try:
        with TestClient(app) as client:
            response = client.get("/api/tournament")
            assert response.status_code == 200
            assert response.json()["results"] == payload["results"]
    finally:
        app.dependency_overrides.clear()


def test_match_endpoint_reads_admin_updates(tmp_path):
    data_file = tmp_path / "tournament.json"
    payload = {
        **SAMPLE,
        "prizePool": "10 000 ₽",
        "matches": {
            "final": {
                "stage": "Финал",
                "status": "live",
                "team1Id": "one",
                "team2Id": "two",
                "scores": [1, 0],
                "bestOf": 3,
                "maps": [{"name": "Mirage", "status": "live", "scores": [8, 7]}],
                "players": [{"name": "Ace", "teamId": "one", "kills": 10, "deaths": 7, "adr": 80, "kast": 70, "rating": 1.2}],
            }
        },
    }
    data_file.write_text(json.dumps(payload), encoding="utf-8")
    app.dependency_overrides[get_tournament_repository] = lambda: TournamentRepository(data_file)

    try:
        with TestClient(app) as client:
            response = client.get("/api/matches/final")
            assert response.status_code == 200
            assert response.json()["match"]["players"][0]["teamId"] == "one"
            assert response.json()["tournament"]["prizePool"] == "10 000 ₽"
            assert client.get("/api/matches/unknown").status_code == 404

            payload["matches"]["final"]["scores"] = [1, 1]
            response = client.patch("/api/admin/tournament", json={"matches": payload["matches"]})
            assert response.status_code == 200
            assert client.get("/api/matches/final").json()["match"]["scores"] == [1, 1]
    finally:
        app.dependency_overrides.clear()


def test_match_rejects_unknown_team(tmp_path):
    data_file = tmp_path / "tournament.json"
    data_file.write_text(json.dumps(SAMPLE), encoding="utf-8")
    app.dependency_overrides[get_tournament_repository] = lambda: TournamentRepository(data_file)
    try:
        with TestClient(app) as client:
            response = client.patch("/api/admin/tournament", json={"matches": {
                "final": {"stage": "Финал", "team1Id": "one", "team2Id": "missing", "bestOf": 3}
            }})
            assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_team_registration_is_persisted(tmp_path):
    data_file = tmp_path / "registrations.json"
    app.dependency_overrides[get_registration_repository] = lambda: RegistrationRepository(data_file)
    payload = {
        "teamName": "Five Aces",
        "captainName": "Alex",
        "email": "CAPTAIN@example.com",
        "contact": "@captain",
        "players": 5,
    }

    try:
        with TestClient(app) as client:
            response = client.post("/api/registrations", json=payload)
            assert response.status_code == 201
            registration = response.json()["registration"]
            assert registration["teamName"] == "Five Aces"
            assert registration["email"] == "captain@example.com"
            assert registration["status"] == "pending"
            assert registration["id"]
            assert json.loads(data_file.read_text(encoding="utf-8"))[0]["teamName"] == "Five Aces"

            response = client.get("/api/registrations")
            assert response.status_code == 200
            public_registration = response.json()[0]
            assert public_registration["teamName"] == "Five Aces"
            assert public_registration["status"] == "pending"
            assert "email" not in public_registration
            assert "contact" not in public_registration
            assert "captainName" not in public_registration
    finally:
        app.dependency_overrides.clear()
