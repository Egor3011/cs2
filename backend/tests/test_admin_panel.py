import json
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

import app.dependencies as dependencies
import main
from app.registration_repository import RegistrationRepository
from app.repository import TournamentRepository
from tests.test_tournament_terms import TERMS


@pytest.fixture
def stores(tmp_path):
    tournament_file = tmp_path / "tournament.json"
    registrations_file = tmp_path / "registrations.json"
    tournament_file.write_text(json.dumps({"title": "Cup", "teams": [{"id": "a", "name": "A", "seed": 1}, {"id": "b", "name": "B", "seed": 2}], "terms": TERMS}), encoding="utf-8")
    registrations_file.write_text(json.dumps([{"id": "application", "teamName": "Team", "captainName": "Captain", "email": "captain@example.com", "contact": "@captain", "players": 5, "status": "pending", "createdAt": "2026-10-01T12:00:00Z"}]), encoding="utf-8")
    main.app.dependency_overrides[dependencies.get_tournament_repository] = lambda: TournamentRepository(tournament_file)
    main.app.dependency_overrides[dependencies.get_registration_repository] = lambda: RegistrationRepository(registrations_file)
    yield tournament_file, registrations_file
    main.app.dependency_overrides.clear()


def test_all_admin_operations_require_the_configured_key(stores, monkeypatch):
    settings = replace(dependencies.settings, admin_api_key="test-private-key")
    monkeypatch.setattr(dependencies, "settings", settings)
    monkeypatch.setattr(main, "settings", settings)
    with TestClient(main.app) as client:
        assert client.get("/api/admin/access").json() == {"requiresKey": True}
        for path in ["/api/admin/tournament", "/api/admin/registrations"]:
            assert client.get(path).status_code == 401
            assert client.get(path, headers={"X-Admin-Key": "wrong"}).status_code == 401
            assert client.get(path, headers={"X-Admin-Key": "test-private-key"}).status_code == 200
        assert client.patch("/api/admin/registrations/application", json={"status": "approved"}).status_code == 401
        assert client.patch("/api/admin/tournament", json={"title": "Unauthorized"}).status_code == 401
        assert client.get("/api/tournament").json()["title"] == "Cup"


def test_contact_privacy_status_persistence_and_not_found(stores):
    with TestClient(main.app) as client:
        private = client.get("/api/admin/registrations").json()[0]
        assert private["email"] == "captain@example.com"
        for status in ["approved", "yes", "waitpay", "rejected", "pending"]:
            assert client.patch("/api/admin/registrations/application", json={"status": status}).status_code == 200
            public = client.get("/api/registrations").json()[0]
            assert public["status"] == status
            assert not {"email", "captainName", "contact"} & public.keys()
            assert json.loads(stores[1].read_text())[0]["status"] == status
        assert client.patch("/api/admin/registrations/missing", json={"status": "approved"}).status_code == 404
        assert client.patch("/api/admin/registrations/application", json={"status": "invalid"}).status_code == 422


def test_stale_admin_save_is_rejected_without_overwriting(stores):
    with TestClient(main.app) as client:
        response = client.get("/api/admin/tournament")
        original = response.json()
        tag = response.headers["etag"]
        changed = client.patch("/api/admin/tournament", json={"title": "New"}, headers={"If-Match": tag})
        assert changed.status_code == 200
        assert changed.headers["etag"] != tag
        before = stores[0].read_bytes()
        assert client.put("/api/admin/tournament", json=original, headers={"If-Match": tag}).status_code == 409
        assert stores[0].read_bytes() == before


def test_content_and_match_crud_persist_to_public_endpoints(stores):
    with TestClient(main.app) as client:
        data = client.get("/api/admin/tournament").json()
        data["content"] = {"heroLead": "New lead", "faqItems": [{"question": "Q", "answer": ["A"]}]}
        data["matches"] = {"grand-final": {"stage": "Grand final", "team1Id": "a", "team2Id": "b", "bestOf": 5, "startsAt": "2026-10-11T18:00:00+03:00"}}
        assert client.put("/api/admin/tournament", json=data).status_code == 200
        assert client.get("/api/tournament").json()["content"]["heroLead"] == "New lead"
        assert client.get("/api/matches/grand-final").json()["match"]["bestOf"] == 5
        data["matches"]["grand-final"]["hidden"] = True
        assert client.put("/api/admin/tournament", json=data).status_code == 200
        assert client.get("/api/matches/grand-final").status_code == 404
        data["matches"] = {}
        assert client.put("/api/admin/tournament", json=data).status_code == 200
        assert client.get("/api/matches/grand-final").status_code == 404


@pytest.mark.parametrize("change", [{"endsOn": "2026-01-01"}, {"prizeDistribution": {"first": 50, "second": 25, "third": 15, "organization": 15}}])
def test_invalid_terms_leave_stored_data_unchanged(stores, change):
    before = stores[0].read_bytes()
    with TestClient(main.app) as client:
        assert client.patch("/api/admin/tournament", json={"terms": {**TERMS, **change}}).status_code == 422
    assert stores[0].read_bytes() == before
