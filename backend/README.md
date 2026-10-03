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

## Админ-панель

Откройте `/admin` на адресе сайта (локально: `http://127.0.0.1:5174/admin`).
В локальном режиме без `ADMIN_API_KEY` панель открывается сразу. Для доступа
по ключу задайте `ADMIN_API_KEY` в окружении backend и перезапустите API.
Ключ вводится в форме входа и хранится только в памяти текущей вкладки.
Для опубликованного сайта используйте ключ и HTTPS.

Разделы панели:

- **Турнир**: название, даты, дедлайн регистрации по Москве, взнос,
  минимальное число команд, распределение призовых и канал Twitch.
- **Тексты**: главный экран, условия и шаги участия, напоминание перед матчем,
  информация о трансляциях, контакт организатора, вопросы и ответы.
- **Команды**: добавление, переименование, удаление и порядок посева.
  Изменение состава/посева сбрасывает результаты сетки после подтверждения.
- **Матчи**: создание, копирование, редактирование, скрытие и удаление;
  дата, формат, участники, статус, счёт, карты, трансляция и статистика игроков.
- **Сетка**: результаты, счёт, победители и повторный гранд-финал.
  Связанные страницы матчей получают участников, счёт и статус из сетки.
  Если участников ещё нет, связанный матч временно скрывается с сайта.
  Изменение победителя раннего матча сбрасывает результаты зависимых матчей.
- **Заявки**: контакты капитанов, поиск, фильтр и смена статуса.
  Допущенную команду можно добавить в сетку.

Изменения турнира публикуются кнопкой **Сохранить**. Статус заявки сохраняется
сразу. **Отменить правки** загружает текущие данные сервера. **Скачать копию
данных** экспортирует текущий черновик в JSON. При закрытии вкладки с
несохранёнными изменениями браузер запрашивает подтверждение.

Новые API:

- `GET /api/admin/access` — требуется ли ключ (сам ключ не возвращается).
- `GET /api/admin/registrations` — заявки с контактами, требуется ключ.
- `PATCH /api/admin/registrations/{id}` — изменение статуса заявки.

Админский GET турнира возвращает `ETag`. PUT/PATCH поддерживают `If-Match`;
если данные изменились после загрузки, сервер возвращает `409` и не перезаписывает
файл. Панель использует эту проверку автоматически. Сохраните копию черновика,
прежде чем загружать свежую версию после конфликта.

Редактируемые тексты хранятся в `content` турнира. Публичные FAQ о датах,
взносе и призовых автоматически используют `terms`. Документы в
`frontend/public/documents` остаются отдельными файлами: при изменении правил
турнира обновляйте также регламент и согласие участника.
