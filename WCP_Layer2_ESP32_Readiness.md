# WCP Layer2 ve ESP32 Hazırlık Planı

## Amaç

WCP tarafını şimdi tamamla.
Layer2, Layer1 ve gerçek ESP32 geldiğinde sadece entegrasyon ve küçük düzeltme kalsın.

## Şu Anda Hazır Olanlar

- Next.js tabanlı admin panel hazır.
- Go backend API katmanı hazır.
- PostgreSQL, Redis ve MinIO bağlantıları hazır.
- Installation draft akışı hazır.
- Master token ve ortak ESP token akışı hazır.
- Store, user, notification, preferences ve device logs akışları hazır.
- SSE tabanlı bildirim altyapısı hazır.
- Kullanıcı tercihleri backend tarafında saklanıyor.
- Device log retention kuralı aktif. Son 30 günden eski loglar siliniyor.

## Kesinleşen Veri ve Akış Kararları

### 1. Layer1

- Layer1 WCP içinde bağımsız entity olmayacak.
- Sadece Layer 2 details alanında `layer1_version` gösterilecek.
- Layer2 heartbeat veya sync payload içinde `layer1_version` taşınacak.

### 2. Token Yapısı

- `master_token` store veya gateway seviyesinde doğrulama için kullanılacak.
- `esp_token` aynı mağaza içindeki tüm ESP32 cihazları için ortak kalacak.
- Layer2 henüz yokken gerçek token doğrulaması bypass kalacak.

### 3. Device Log Canonical Modeli

- `report_index` artık canonical değer taşır:
  - `opening`
  - `middle`
  - `closing`
- Frontend bu değerleri çeviri anahtarları ile gösterir.
- Eski veritabanı kayıtlarındaki `Opening Logs`, `Middle Logs`, `Closing Logs` değerleri geçici uyumlulukla okunur.

### 4. Ülke ve Şehir Kaynağı

- Ülke kaynağı `REST Countries API`.
- Şehir kaynağı `CountriesNow API`.
- Backend canonical ülke ve şehir listesini getirir.
- Frontend ülke listesini cache içinde tutar.
- Dil değişince ülke listesi tekrar istenmez.
- Ülke adları frontend içinde locale duyarlı gösterilir.
- Şehir listesi seçilen ülkeye göre yeniden istenir.
- Şehir listesi seçilen dile göre yeniden sıralanır.
- CountriesNow şehir çevirisi sağlamadığı için şehir adı canonical kalır.
- Yani şehirlerde sahte sabit çeviri kullanılmaz.

## Layer2 Geldiğinde WCP’de Yapılacaklar

### Authentication ve Güven

- `master_token` doğrulamasını gerçek hale getir.
- Heartbeat ve sync isteklerini imzalı hale getir.
- `timestamp + signature + batch_id` doğrulaması aç.
- Replay attack engelini production zorunluluğu yap.

### Heartbeat

- `POST /api/v1/layer2/heartbeat` gerçek Layer2 tarafından beslenecek.
- `last_heartbeat_at`, `sync_status`, `pending_sync_data` canlı hesaplanacak.
- Store summary ve Layer 2 details ekranları canlı veriye bağlanacak.

### Sync ve Telemetry

- `POST /api/v1/layer2/sync` gerçek log paketlerini kabul edecek.
- `report_type`, `status_code`, `soc_temp` canlı akıştan dolacak.
- Duplicate paket engeli production seviyesinde sıkılaştırılacak.
- `packet_id` veya kesin batch kuralı freeze edilip zorunlu yapılacak.

### Bildirimler

- Store offline, unauthorized access ve low battery olayları gerçek telemetry ile üretilecek.
- Critical ve error olayları `pending_ack` mantığı ile çalışacak.
- Warning olayları otomatik silence kuralına bağlanacak.
- SSE gerçek olay akışı ile beslenecek.

### Dashboard ve Health

- Dashboard kartları canlı store health verisine bağlanacak.
- Critical error grafiği gerçek telemetry üstünden üretilecek.
- Pending sync ve unhealthy device sinyalleri canlı olaylardan türetilecek.

## ESP32 Geldiğinde WCP’de Yapılacaklar

### BLE Kurulum Testi

- Step 4 formundaki alanları gerçek BLE payload ile doğrula.
- Şu alanlar gerçek cihaz üstünde test edilecek:
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

### İlk Handshake

- Installation tamamlandıktan sonra cihaz ilk `handshake` paketini gönderecek.
- `pending -> paired -> active` geçişi gerçek cihaz sinyali ile işleyecek.
- İlk handshake timeout kuralı saha verisiyle netleşecek.

### Device Lifecycle

- `pending`: Step 4 eklendi ama BLE kurulmadı.
- `paired`: BLE kuruldu ama ilk handshake gelmedi.
- `active`: son 24 saatte geçerli paket geldi.
- `offline`: beklenen pencere ve tolerans aşıldı.
- `unhealthy`: `status_code > 0` veya kritik batarya.
- `revoked`: güvenlik nedeniyle erişimi kesildi.
- `decommissioned`: cihaz emekli edildi.

### Device Logs Doğrulaması

- Günde 3 paket akışı gerçek cihazlarla doğrulanacak.
- Default filtre akışı doğrulanacak:
  - gün seçimi
  - report index
  - report type
  - status code
  - critical only

### Font ve Ekran Boyutu

- BLE ile giden font ayarları gerçek ekranda doğrulanacak.
- Screen size eşleşmesi gerçek cihaz kombinasyonlarında teyit edilecek.

## Geçici Bypass Kararları

- Layer2 henüz yok. `master_token` doğrulaması geçici bypass kalır.
- ESP32 henüz yok. BLE payload doğrulaması geçici bypass kalır.
- Gerçek handshake kontrolü entegrasyon gününde açılır.
- Gerçek device auth kontrolü entegrasyon gününde açılır.
- Bu bypasslar manuel WCP testini bloklamamak için tutulur.

## Kapanmış Konular

- Layer1 ayrı modül olmayacak.
- Export ilk fazda olmayacak.
- ClickHouse ilk fazda olmayacak.
- Kafka, RabbitMQ ve gateway katmanı ilk fazda olmayacak.
- WCP önce transactional backend olarak bitecek.

## Sonuç

Layer2 ve ESP32 geldiğinde büyük ekran değişikliği gerekmemeli.
Beklenen iş yükü entegrasyon, doğrulama ve küçük alan düzeltmeleri olmalı.
