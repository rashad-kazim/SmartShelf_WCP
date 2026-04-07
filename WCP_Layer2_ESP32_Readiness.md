# WCP Layer2 ve ESP32 Hazırlık Planı

## Amaç

WCP tarafını şimdi tamamla.
Layer2, Layer1 ve gerçek ESP32 geldiğinde sadece entegrasyon ve küçük iyileştirme kalsın.

## Şu Anda Hazır Olanlar

- Next.js tabanlı admin panel hazır.
- Gerçek backend API katmanı hazır.
- PostgreSQL, Redis, MinIO bağlantıları var.
- Installation draft akışı var.
- Master token ve ortak ESP token akışı var.
- Store, user, notification, preferences, device logs akışları var.
- SSE tabanlı bildirim altyapısı var.
- Kullanıcı tercihleri backend tarafında saklanıyor.

## WCP Tarafında Layer2 Geldiğinde Yapılacaklar

### 1. Authentication ve Güven

- Layer2 ile WCP arasında `master_token` doğrulaması gerçek hale gelecek.
- Layer2 heartbeat ve sync endpointleri imzalı istek kabul edecek.
- `timestamp + signature + batch_id` doğrulaması aktif olacak.
- Replay attack engeli production modda zorunlu hale gelecek.

### 2. Heartbeat Gerçekleştirmesi

- `POST /api/v1/layer2/heartbeat` gerçek Layer2 tarafından beslenecek.
- `last_heartbeat_at`, `sync_status`, `pending_sync_data` canlı hesaplanacak.
- Store summary ve Layer 2 details ekranları canlı veriye dönecek.

### 3. Sync ve Telemetry

- `POST /api/v1/layer2/sync` gerçek log paketlerini kabul edecek.
- `report_type`, `status_code`, `soc_temp` alanları Layer2 üzerinden dolacak.
- `report_index` belirleme kuralı gerçek saatlere göre Layer2 veya backend tarafında netleşecek.
- Duplicate paket engeli `packet_id` veya `batch_id + device_id` ile production düzeyine çıkarılacak.

### 4. Notification Üretimi

- Store offline, unauthorized access, low battery olayları Layer2 verisine göre üretilecek.
- Critical ve error olayları `pending_ack` mantığıyla çalışacak.
- Warning olayları otomatik silence kuralına bağlanacak.
- SSE artık gerçek olay akışı ile beslenecek.

### 5. Store Health

- Dashboard kartları gerçek canlı store health verisiyle beslenecek.
- Critical error grafiği gerçek telemetry verisinden çıkacak.
- Pending sync ve unhealthy device sinyalleri gerçek olaylardan türetilecek.

## WCP Tarafında ESP32 Geldiğinde Yapılacaklar

### 1. Bluetooth Kurulum Testi

- Step 4 cihaz formundaki alanlar gerçek BLE payload ile eşlenecek.
- Kurulum paketi şu alanlarla doğrulanacak:
  - `country`
  - `city`
  - `storeName`
  - `branchName`
  - `masterToken`
  - `espToken`
  - `screenSize`
  - `awakeTime`
  - `sleepTime`
  - `gatewayIp`
  - `gatewayPort`
  - `gatewayEndpoint`
  - `wifiSsid`
  - `wifiPassword`
  - `fontSettings`

### 2. İlk Handshake

- Installation tamamlandıktan sonra cihazlar ilk `handshake` paketini atacak.
- `pending -> paired -> active` geçişi gerçek cihaz sinyaline göre işleyecek.
- İlk handshake gecikmesi için timeout kuralı netleştirilecek.

### 3. Device Lifecycle Kuralları

- `pending`: Step 4 eklendi ama BLE kurulmadı.
- `paired`: BLE kuruldu ama ilk handshake gelmedi.
- `active`: son 24 saatte geçerli paket geldi.
- `offline`: beklenen pencere geçti, ek tolerans da aşıldı.
- `unhealthy`: `status_code > 0` veya kritik batarya.
- `revoked`: güvenlik nedeniyle erişimi kesildi.
- `decommissioned`: cihaz emekli edildi.

### 4. Device Logs Doğrulaması

- Günlük 3 paket akışı gerçek cihazlarla doğrulanacak.
- Default filtre davranışı şu sıraya göre test edilecek:
  - gün seçimi
  - report index
  - report type
  - status code
  - critical only

### 5. Font ve Screen Size

- BLE ile gönderilen font ayarları gerçek ekranda doğrulanacak.
- Screen size eşleşmesi gerçek ESP32 + ekran kombinasyonlarında teyit edilecek.

## Layer1 Geldiğinde Yapılacaklar

- Layer1 WCP’de bağımsız entity olmayacak.
- Sadece Layer 2 details kartında `layer1_version` gösterilecek.
- Layer2 sync veya heartbeat payload içinde `layer1_version` zorunlu olacak.

## Tam Çalışır Hale Gelmek İçin Son Kontrol Listesi

### Backend

- Layer2 request signing aktif et.
- Sync idempotency production kuralını kesinleştir.
- Notification event üretimini gerçek telemetry kurallarına bağla.
- Archived logs worker planını aç.

### Frontend

- BLE kurulum testinde saha geri bildirimine göre küçük form düzeltmeleri yap.
- Device status rozetlerini gerçek cihaz davranışına göre ince ayarla.
- Dashboard sayılarını gerçek veriye göre son kez kalibre et.

### Ortak

- ESP32 firmware payload alanlarını freeze et.
- Layer2 sync payload alanlarını freeze et.
- Store offline ve unauthorized access alarm eşiklerini freeze et.

## Şu Anda Geri Dönülmeden Kapatılmış Konular

- Layer1 ayrı modül olmayacak.
- Export ilk fazda yok.
- ClickHouse ilk fazda yok.
- Kafka, RabbitMQ, gateway katmanı ilk fazda yok.
- WCP tarafı önce transactional backend olarak bitecek.

## Sonuç

Layer2 ve ESP32 geldiğinde büyük ekran değişikliği gerekmemeli.
Beklenen iş yükü entegrasyon, doğrulama ve küçük alan düzeltmeleri olmalı.
