# PeerTest

> Geliştiriciler için **peer testing platformu**. Google Play Store'un kapalı test sürecindeki "14 gün boyunca 12 aktif test kullanıcısı" şartını aşmak için karşılıklı yardımlaşma sistemi.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![Postgres](https://img.shields.io/badge/Postgres-Neon-336791?logo=postgresql)](https://neon.tech/)

## Nasıl çalışır

Bir tester, bir uygulamaya **14 günlük taahhüt** verir; üç checkpoint'te (Katıldım, Aktifim, Tamamladım) ekran görüntüsü kanıtı yükler. Kaçırırsa **kendi uygulamalarının slotları geçici olarak donar** (frozen). Disiplin tamamen bu donma mekanizmasıyla sağlanır.

İki katılım modu:

- **Karşılıklı (Trade)** — Sen onun uygulamasını, o seninkini test eder. İki taraf da aynı çifti seçince eşleşir, iki taahhüt birden başlar.
- **Karşılıksız (Free)** — Karşılık beklemeden test edersin.

## Teknoloji

- **SvelteKit 2** (Svelte 5 runes) + **Tailwind CSS v4**
- **Neon Postgres** + **Drizzle ORM**
- **Telegram Bot API** — bot deep-link login + DM bildirimleri
- **Vercel Cron** — günlük checkpoint kontrolü
- **paraglide-js** — TR/EN
- Ekran görüntüsü upload: prntscr / imgbb / imgur / catbox / freeimage / 0x0.st / Vercel Blob (admin panelden seçilir)

Mimari detayı için: [`plan.md`](plan.md)

## Hızlı Başlangıç

```bash
git clone <repo>
cd peertest-playstore
npm install
cp .env.example .env   # değerleri doldur (aşağı bak)
npm run db:migrate     # tabloları Postgres'e oluştur
npm run dev
```

Tarayıcı: <http://localhost:5173>

## Ortam Değişkenleri

`.env.example`'i `.env` olarak kopyalayıp doldur. Hiçbir gerçek değeri repo'ya commit etme; `.env` zaten `.gitignore`'da.

| Değişken                       | Zorunlu | Açıklama                                                                          |
| ------------------------------ | ------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | ✅      | Postgres connection string (Neon önerilir, pooled `-pooler` host kullan)          |
| `TELEGRAM_BOT_TOKEN`           | ✅      | [@BotFather](https://t.me/BotFather)'dan bot token                                |
| `PUBLIC_TELEGRAM_BOT_USERNAME` | ✅      | Bot kullanıcı adı (`@` olmadan)                                                   |
| `TELEGRAM_WEBHOOK_SECRET`      | ✅      | Webhook doğrulama gizli anahtarı (`openssl rand -hex 32`)                         |
| `ADMIN_TELEGRAM_IDS`           | ✅      | İlk admin(ler)in Telegram sayısal ID'leri (virgülle ayrık)                        |
| `PUBLIC_BASE_URL`              | ✅      | Canlı origin (`https://...`). Dev'de `http://localhost:5173`                      |
| `UPLOAD_SECRET_KEY`            | ⚠️      | Seçtiğin upload provider'ın API key'i                                             |
| `CRON_SECRET`                  | ✅      | Vercel Cron endpoint koruması (`openssl rand -base64 32`)                         |
| `DEV_LOGIN`                    | ⛔      | **Sadece yerel.** `true` ise `/api/auth/dev-login` açılır. **Üretimde boş bırak** |

## Telegram Bot Kurulumu

1. [@BotFather](https://t.me/BotFather) → `/newbot` → token al → `TELEGRAM_BOT_TOKEN`'a yaz
2. Bot username'ini `PUBLIC_TELEGRAM_BOT_USERNAME`'a yaz
3. Deploy sonrası webhook bağla:
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://your-domain/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```

Login akışı **Telegram Login Widget değil, bot deep-link**: kullanıcı `t.me/BOT?start=login_<token>`'a yönlendirilir, Start basar, bot geri "Oturumu aç" butonu döner. `/setdomain` ayarı gerekli değil.

## Admin Kurulumu

1. Kendi Telegram sayısal ID'ni `ADMIN_TELEGRAM_IDS`'e ekle (ID için: [@userinfobot](https://t.me/userinfobot))
2. Siteden Telegram ile giriş yap (otomatik admin olursun)
3. Varsayılan ayar/şablonları yükle: admin panelinden ya da `POST /api/admin/seed`
4. `/admin/settings` ve `/admin/templates` üzerinden parametre yönetimi

## Veritabanı

```bash
npm run db:generate   # şema değişince migration üret
npm run db:migrate    # migration'ları uygula (non-interactive)
npm run db:push       # interactive push (drizzle-kit)
npm run db:studio     # Drizzle Studio
```

## Vercel'e Deploy

1. Projeyi Vercel'e bağla (`@sveltejs/adapter-vercel` yapılandırılmış)
2. Tüm ortam değişkenlerini Vercel proje ayarlarına ekle (`DEV_LOGIN` HARİÇ)
3. Migration'ları prod DB'ye uygula:
   ```bash
   DATABASE_URL="<prod-url>" npm run db:migrate
   ```
4. Deploy et. [`vercel.json`](vercel.json) cron'u her gün 06:00 UTC `/api/cron`'u tetikler

### Üretim Kontrol Listesi

- [ ] `DEV_LOGIN` boş
- [ ] `ADMIN_TELEGRAM_IDS` doğru
- [ ] Tüm gizli değerler Vercel env'de
- [ ] `db:migrate` prod'da koşuldu
- [ ] Telegram `setWebhook` (secret_token ile) yapıldı
- [ ] `PUBLIC_BASE_URL` canlı domain
- [ ] `/api/admin/seed` çağrıldı

## Komutlar

| Komut                     | Açıklama                    |
| ------------------------- | --------------------------- |
| `npm run dev`             | Geliştirme sunucusu         |
| `npm run build`           | Üretim derlemesi            |
| `npm run check`           | Tip kontrolü (svelte-check) |
| `npm run lint` / `format` | Prettier + ESLint           |
| `npm run db:migrate`      | DB migration                |

## Mimari

- **`src/lib/server/`** — DB, auth, bot, trade, notification, upload, score, security helper'ları
- **`src/routes/`** — Sayfalar (`(app)` grubu giriş ister, `(admin)` ek olarak admin rolü ister)
- **`src/routes/api/`** — REST endpoint'leri (commitments, upload, telegram webhook, bot-login start/complete)
- **`drizzle/`** — Migration'lar (sema değişikliklerinde commit'le)
- **`messages/{tr,en}.json`** — paraglide kaynak mesajlar

## Katkı

Issue ve PR'ler memnuniyetle kabul edilir. Önce büyük değişiklikler için bir issue aç; sonra:

```bash
npm run check && npm run lint
```

## Lisans

MIT — bkz. [LICENSE](LICENSE)
