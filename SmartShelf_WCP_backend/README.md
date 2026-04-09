# SmartShelf WCP Backend

This folder contains the starting backend skeleton for the SmartShelf admin panel.

In the first phase, the following needs are specifically targeted:

- Auth initial flow
- Dashboard summary and activity feed
- Stores, Layer 2 summary and device logs read APIs
- Notifications APIs and SSE stream start
- Company/Supermarket users listing and detail flow
- Response envelope structure aligned with frontend

Notes:

- Export endpoints were deliberately not added.
- ClickHouse is specifically disabled in this phase; no installation or integration will be done for now.
- The architecture is kept modular by thinking of hooks that can be connected later instead of ClickHouse.
- Target behavior for token security: token will be shown in plain text once at first production, then only hash will be stored.
- `Idempotency-Key` will be mandatory for `POST /api/v1/installation-drafts/{id}/complete`.
- The hot data window for telemetry logs will be 30 days; old data will later be moved to MinIO/S3 archive worker.
- Canary and rollback rules in the firmware rollout layer will be added in the next phase.
- For now, in-memory seed data is being used; the goal is to clarify the route contract early.

## Running

```bash
go mod tidy
go run ./cmd/api
```

The server opens by default on `http://localhost:8080`.

## Currently Open Initial Endpoints

- `GET /healthz`
- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/activity-feed`
- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications/stream`
- `PATCH /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/read-all`
- `GET /api/v1/reference/countries`
- `GET /api/v1/reference/cities?country=Germany`
- `GET /api/v1/reference/supermarkets?city=Berlin`
- `GET /api/v1/stores`
- `GET /api/v1/stores/:id`
- `GET /api/v1/stores/:id/summary`
- `GET /api/v1/stores/:id/device-logs`
- `GET /api/v1/company-users`
- `GET /api/v1/company-users/:id`
- `GET /api/v1/supermarket-users`
- `GET /api/v1/supermarket-users/:id`
