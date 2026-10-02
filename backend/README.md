# CS2 Tournament API

FastAPI backend with separate public and admin routers. By default it reads and
updates `data/tournament.json`. Set `TOURNAMENT_DATA_FILE` to use a different
JSON file.

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn main:app --reload
```

OpenAPI documentation is available at `http://localhost:8000/docs`.

## Endpoints

- `GET /health` — health check.
- `GET /api/tournament` — public tournament data for the frontend.
- `GET /api/matches/{id}` — match details together with tournament data for the bracket (for example, `/api/matches/final`).
- `GET /api/admin/tournament` — current tournament data for the admin UI.
- `PUT /api/admin/tournament` — replace the complete JSON document.
- `PATCH /api/admin/tournament` — update supplied top-level fields.

The `matches` object in tournament JSON contains the data shown on a match
page. Its key is the URL id. A match references participants by `team1Id` and
`team2Id`; both ids must exist in `teams`. Each map has a `name`, `status` and
optional `scores`. Player statistics reference a participant through `teamId`.
The match page reloads live data every 30 seconds. Admin `PATCH` replaces the
entire `matches` object when that field is supplied, so include all match entries
you want to keep.

If `ADMIN_API_KEY` is set, every admin request must include the same value in
the `X-Admin-Key` header. Admin authentication is disabled only when the
variable is unset, which is intended for local development.

Example partial update:

```bash
curl -X PATCH http://localhost:8000/api/admin/tournament \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Key: replace-with-a-secret' \
  -d '{"title":"New tournament title"}'
```

## Docker

Build from the project root:

```bash
docker build -t cs2-tournament-api ./backend
docker run --rm -p 8000:8000 \
  -e ADMIN_API_KEY='replace-with-a-secret' \
  -v cs2-tournament-data:/app/data \
  cs2-tournament-api
```

The named volume makes admin changes survive container replacement. CORS
origins can be changed with a comma-separated `CORS_ORIGINS` value.
If the volume was created before match details were added, update its tournament
JSON through the admin API to add `matches`; rebuilding the image does not
overwrite an existing volume.
