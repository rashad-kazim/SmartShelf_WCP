# SmartShelf WCP Backend

Bu klasör, SmartShelf admin paneli için baslayan backend iskeletini içerir.

Ilk fazda özellikle su ihtiyaçlar hedeflenmistir:

- Auth baslangiç akisi
- Dashboard summary ve activity feed
- Stores, Layer 2 summary ve device logs read API'leri
- Notifications API'leri ve SSE stream baslangici
- Company/Supermarket users listeleme ve detay akisi
- Frontend ile hizali response envelope yapisi

Notlar:

- Export endpoint'leri bilinçli olarak eklenmedi.
- ClickHouse bu fazda özellikle devre disi birakildi; simdilik kurulum veya entegrasyon yapilmayacak.
- ClickHouse yerine ileride baglanabilecek hook'lar düsünülerek mimari modüler tutuldu.
- Token güvenligi için hedef davranis: token ilk üretimde bir kez düz metin gösterilecek, ardindan sadece hash saklanacak.
- `POST /api/v1/installation-drafts/{id}/complete` için `Idempotency-Key` zorunlu olacak.
- Telemetry loglarinin sicak veri penceresi 30 gün olacak; eski veriler daha sonra MinIO/S3 arsiv worker'ina tasinacak.
- Firmware rollout katmaninda canary ve rollback kurallari sonraki fazda eklenecek.
- Simdilik in-memory seed data kullaniliyor; amaç route sözlesmesini erken netlestirmek.

## Çalistirma

```bash
go mod tidy
go run ./cmd/api
```

Sunucu varsayilan olarak `http://localhost:8080` üzerinde açilir.

## Su Anda Açik Olan Baslangiç Endpoint'leri

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
