# PEERTEST - PROJE PLANI VE MIMARI TASARIM

1. PROJE OZETI

---

PeerTest, Google Play Store'un yeni gelistiriciler icin zorunlu tuttugu "14 gun boyunca 12 test kullanicisi" kuralini asmak amaciyla gelistiricilerin birbirleriyle yardimlasmasini saglayan bir platformdur.

Temel Mantik: Bir tester baska bir gelistiricinin uygulamasina "katilirim" der ve 14 gunluk bir TAAHHUT (Commitment) baslatir. Bu sure boyunca 3 ZORUNLU CHECKPOINT'te ekran goruntusu (kanit) yuklemekle yukumludur:

- Gun 1-2 -> "Katildim" (Google Groups uyeligi + uygulama acik SS)
- Gun 6-9 -> "Aktifim" (uygulama hala kurulu/aktif SS) - genis, esnek pencere
- Gun 13-14 -> "Tamamladim" (14 gun doldu, kanit SS)
  Her checkpoint icin ~48 saatlik bir pencere vardir: cok kati degil ama kaybolan tester yakalanir.

Zorunlulugun Kaynagi (Icsel Tesvik): Sistem disaridan ceza vermez, tesvik icseldir. Bir tester checkpoint'i kacirirsa:

1. O tester'in ilgili uygulamadaki slotu DUSER (gelistirici bos slot icin yeni tester arayabilir).
2. Tester'in KENDI uygulamalarinin slotlari DONDURULUR (frozen) - yani kendi uygulamasi icin tester toplayamaz hale gelir.
3. Gelistirici Telegram uzerinden bildirim alir.
   Tester'in kendi cikari taahhudunu tamamlamaktir: kendi uygulamasi icin 12 tester'a ihtiyaci vardir; kacarsa kendi slotlari donar ve sistemden faydalanamaz. Donmus durumdan cikmak icin acik taahhutlerini tamamlamasi gerekir.

Ekonomi: Acik model. Herkes uygulamasini listeleyebilir ve tester toplayabilir; on kosul (kredi/karsilik) yoktur. Disiplin yalnizca "donma" mekanizmasiyla saglanir.

2. TEKNOLOJI YIGINI (Ucretsiz ve Limitleri Yeterli)

---

- Frontend & Backend: SvelteKit (Vercel uzerinde ucretsiz barindirma, SSR ve API Routes icin mukemmel uyum).
- UI Framework: Tailwind CSS + shadcn-svelte. (Copy-paste bilesenleri, runtime CSS overhead yok, built-in erisilebilirlik (a11y), SvelteKit ekosistemi icin fiili standart. Renk paleti: neutral/zinc tonlari - acik gri arka plan, siyah ince borderlar, kompakt tablolar).
- Veritabani: Neon DB (PostgreSQL) + Drizzle ORM.
  - Neden Neon? Vercel ile harika entegre olur, ucretsiz paketi (0.5 GB) bu proje icin fazlasiyla yeterlidir ve uyku moduna gecme (cold start) sorunu Supabase'e gore daha azdir.
- Kimlik Dogrulama: Telegram Login Widget + KENDI session katmanimiz (lucia bagimliligi YOK).
  - NOT (Karar): lucia artik kurulabilir bir paket degil; proje "kendi session kodunu yaz"
    rehberine donustu (son surum v3, bakim disi). Bu yuzden lucia'nin onerdigi ~40 satirlik
    deseni dogrudan kendimiz yaziyoruz: generateSessionToken() (rastgele token),
    hashlenmis token'i sessions tablosunda saklama, createSession(), validateSessionToken()
    (suresi gecmisse sil, yarisi gecmisse uzat), invalidateSession(). Sifir ekstra bagimlilik.
  - Kullanici Telegram widget'indan giris yapar, backend HMAC-SHA256 ile hash dogrular.
  - Dogrulama sonrasi kendi createSession() ile HTTP-only, Secure, SameSite=Lax cookie set edilir.
  - SvelteKit hooks.server.ts icinde her istekte session token dogrulanir, locals.user/session set edilir.
  - Bot Baglama (KRITIK): Telegram botu, kendisiyle hic konusmamis bir kullaniciya DM atamaz.
    Login Widget tek basina bunu saglamaz. Bu yuzden ilk giriste kullanici bizim bota
    yonlendirilir (deep link: t.me/<bot>?start=<token>); /start ile gelen token telegram_id'yi
    eslestirir ve users.bot_started=true yapilir. Bot baglanmamis kullaniciya tum bildirimler
    site ici (in-app) banner olarak da gosterilir (fallback). Detay: Bolum 4-A.
- Ekran Goruntusu Upload: https://upload.prntscr.com servisi (varsayilan).
  - Secret key: 3. parti aractan elde edilen string. ASLA koda gomulmez; UPLOAD_SECRET_KEY env'inden okunur.
  - Akis:
    1. Unix timestamp (saniye): Math.floor(Date.now() / 1000).
    2. Hash: md5(UPLOAD_SECRET_KEY + timestamp).
    3. app_id: randomUUID() ile uretilen rastgele UUID.
    4. POST https://upload.prntscr.com/upload/{timestamp}/{hash}/ adresine FormData:
       - width, height: resmin gercek piksel boyutlari.
       - dpi: sabit "1.000000" string.
       - app_id: uretilen UUID.
       - image: ham resim byte'lari Blob icinde, dosya adi todo-image.png (ya da jpg/webp).
         Resim base64 dataUrl ise once parse edilip ham buffer'a cevrilir.
  - Yanit (XML): regex ile <status>success</status> ve <share>https://prnt.sc/xxxx</share> parse edilir.
    status success degilse <error> etiketi okunup hata firlatilir.
  - CDN URL: share URL'e ikinci GET istegi atilir; header'a User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
    AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 eklenir. Donen HTML'den
    class="screenshot-image" olan <img> etiketinin src ya da data-src attribute'u regex ile cekilir (gercek CDN URL).
    Ikinci istek basarisiz olursa fallback olarak share URL'in kendisi kullanilir.
  - Sonuc: { url, shareUrl } donduran tek bir uploadScreenshot() fonksiyonu (src/lib/server/upload.ts).
  - KONFIGURE EDILEBILIR (Admin): prntscr.com tersine muhendislikle bulunmus bir endpoint +
    sizdirilmis secret key oldugundan her an kirilabilir. Bu yuzden uploadScreenshot()
    parametreleri KODA GOMULMEZ; Settings tablosundan okunur (bkz. Bolum 3-7 ve 9). Admin
    panelden degistirilebilen alanlar: aktif provider ('prntscr' | 'r2' | 'vercel_blob'),
    upload base URL, secret key, FormData alan adlari (width/height/dpi/app_id/image),
    User-Agent, yanit parse regex'leri (status/share/error/cdn img). Boylece servis bozulursa
    yeniden deploy gerekmeden admin panelden duzeltilir ya da baska provider'a gecilir.
  - YEDEK PROVIDER (onerilen uzun vade): Cloudflare R2 (10 GB ucretsiz, S3 uyumlu) veya
    Vercel Blob. upload.ts provider'a gore dallanir; kanit gorselleri "denetim delili"
    oldugundan ureti mde kalici depolama tercih edilmelidir. prntscr varsayilan/MVP'dir.
- Coklu Dil (i18n): paraglide-js (SvelteKit icin en modern ve hafif ceviri kutuphanesidir, projenin buyuklugunu artirmaz).
- Bildirim: Telegram Bot API (sendMessage). Bot token ile checkpoint hatirlatmalari ve
  slot dusme/donma bildirimleri direkt DM olarak gonderilir. Ekstra altyapi yok, ucretsiz, anlik.
  - On kosul: kullanici botu baglamis olmali (users.bot_started=true). Baglamamissa DM
    atlanir; mesaj site ici (in-app) bildirim olarak gosterilir + bir sonraki giriste
    "botu bagla" hatirlaticisi cikar.
  - SABLON TABANLI (Admin): Tum DM metinleri KODA GOMULMEZ; MessageTemplates tablosundan
    (TR/EN, key bazli, {ad}/{app}/{gun}/{saat} gibi placeholder'larla) okunur ve admin
    panelden duzenlenebilir. sendTemplate(telegramId, key, locale, vars) metni render eder.
  - src/lib/server/notify.ts: dusuk seviye sendTelegramMessage(telegramId, text) +
    sablon render eden sendTemplate(telegramId, key, locale, vars).
- Zamanlanmis Gorevler (Cron): Vercel Cron Jobs (Gunluk calisarak: (1) yaklasan checkpoint pencereleri icin hatirlatma DM'i atar, (2) penceresi kacmis checkpoint'leri tespit eder -> ilgili Commitment'i 'failed' yapar, tester slotunu bosaltir, tester'in kendi App'lerini 'frozen' yapar, gelistiriciye bildirim atar).

3. VERITABANI SEMASI (Drizzle ORM Mantigiyla)

---

Mimariyi yormayacak, iliskisel 9 tablo: 6 cekirdek + 3 yapilandirma/log tablosu
(settings, message_templates, score_events).

1. Users (Kullanicilar)
   - id (PK, UUID)
   - telegram_id (Unique, BigInt) - Telegram'in sayisal kullanici ID'si
   - username (String, Nullable) - Telegram @username (her kullanicida olmayabilir)
   - first_name (String) - Telegram'dan gelen ad
   - avatar_url (String, Nullable) - Telegram profil fotografi
   - score (Int, Default: 100) - Guven puani
   - role (Enum: 'user', 'admin', Default: 'user')
   - bot_started (Boolean, Default: false) - kullanici botu /start ile baglamis mi (DM atilabilir mi)
   - bot_start_token (String, Nullable) - /start deep link eslestirme token'i (tek kullanimlik)
   - locale (Enum: 'tr', 'en', Default: 'tr') - DM dili icin tercih edilen dil
   - created_at (Timestamp)
   - last_login_at (Timestamp)

2. Sessions (Oturumlar) - kendi session katmanimiz icin (lucia degil)
   - id (PK, String) - session token'in SHA-256 hash'i (ham token sadece cookie'de durur)
   - user_id (FK -> Users.id, Cascade Delete)
   - expires_at (Timestamp) - validateSessionToken yarisi gecince uzatir, gecince siler

3. Apps (Uygulamalar)
   - id (PK, UUID)
   - user_id (FK -> Users.id, Cascade Delete)
   - name (String) - Uygulama adi
   - package_name (String, Nullable) - com.example.app formati
   - group_link (String) - Google Groups tester davet linki
   - app_link (String) - Play Store linki
   - slots_total (Int, Default: 12) - hedeflenen tester sayisi (varsayilan Settings'ten gelir)
   - description (Text, Nullable) - uygulama hakkinda kisa aciklama (tester'a gosterilir)
   - instructions (JSONB, Nullable) - sahip tarafindan yazilan, HER CHECKPOINT icin tester'a
     ozel yonergeler: { joined: "...", active: "...", completed: "..." }. Tester ilgili
     checkpoint kartinda bu metni gorur ("1. test icin sunu yap, ekrani sununla", vb.).
     Bos birakilirsa sistemin varsayilan/genel yonergesi (Settings) gosterilir.
   - status (Enum: 'active', 'frozen', 'closed', Default: 'active')
     - active: tester toplayabilir, listede gorunur.
     - frozen: sahibinin acik bir taahhudu kacmis; tester toplayamaz, listede gorunmez.
       Sahip tum acik (kacmis degil, devam eden) taahhutlerini tamamlayinca tekrar 'active' olur.
     - closed: sahip uygulamayi kapatmis (12 tester dolmus ya da manuel).
   - created_at (Timestamp)

   NOT: Dolu slot sayisi = bu app'e bagli status IN ('active','completed') olan Commitment sayisi (dinamik sorgu).
   Bos slot = slots_total - dolu slot. Bos slot > 0 ve status='active' ise yeni tester katilabilir.

4. Commitments (Taahhutler) - bir tester'in bir uygulamaya 14 gunluk test taahhudu
   - id (PK, UUID)
   - tester_id (FK -> Users.id) - taahhudu veren tester
   - app_id (FK -> Apps.id) - test edilen uygulama
   - status (Enum: 'active', 'completed', 'failed', 'cancelled', Default: 'active')
     - active: 14 gunluk sure devam ediyor, checkpoint'ler bekleniyor (slotu doludur).
     - completed: 3 checkpoint de onaylanmis, 14 gun dolmus (slotu doludur, basarili).
     - failed: bir checkpoint penceresi kacirilmis -> slot dustu, sahibi frozen olabilir.
     - cancelled: tester gonullu birakti ya da app sahibi attı (slot bosalir).
   - started_at (Timestamp, Default: NOW) - taahhudun basladigi an; tum checkpoint pencereleri buna gore hesaplanir
   - completed_at (Timestamp, Nullable)
   - created_at (Timestamp)

   UNIQUE (tester_id, app_id): bir tester bir uygulamaya yalnizca bir aktif taahhut verebilir.

5. Checkpoints (Kontrol Noktalari) - her Commitment icin 3 satir
   - id (PK, UUID)
   - commitment_id (FK -> Commitments.id, Cascade Delete)
   - kind (Enum: 'joined', 'active', 'completed') // Gun 1-2 / Gun 6-9 / Gun 13-14
   - window_start (Timestamp) - pencerenin acildigi an (started_at + ofset)
   - window_end (Timestamp) - pencerenin kapandigi an (kacirma bu andan sonra)
   - status (Enum: 'pending', 'submitted', 'missed', Default: 'pending')
     - pending: pencere henuz acik/yaklasiyor, kanit yok.
     - submitted: tester ekran goruntusu yukledi (pencere icinde).
     - missed: pencere kapandi, kanit gelmedi -> Commitment failed tetiklenir.
   - screenshots (JSONB, Nullable) - [{ url: cdnUrl, shareUrl: prntscUrl }] dizisi
   - submitted_at (Timestamp, Nullable)

   Pencere ofsetleri (started_at'a gore, ~48 saatlik pencereler) - VARSAYILANLAR (Settings'ten
   okunur, admin panelden degistirilebilir):
   joined : window_start = +0 gun, window_end = +2 gun
   active : window_start = +6 gun, window_end = +9 gun (genis/esnek)
   completed : window_start = +13 gun, window_end = +14 gun + 24h tolerans
   Tum gun/saat degerleri Settings.checkpoint_windows'tan gelir; bir Commitment olustugu ANDA
   o anki ayarlarla 3 Checkpoint satiri (window_start/window_end dolu) uretilir. Ayar sonradan
   degisirse gecmis commitment'lar etkilenmez (degerler satira yazildi) - yalnizca yeni
   commitment'lar yeni pencereleri alir.

   NOT (Onay): Bu surumde checkpoint'ler kanit (SS) yuklenince otomatik 'submitted' kabul edilir; app sahibinin
   manuel onayi gerekmez. Sahip kanitti uygunsuz bulursa Report acabilir (asagidaki tablo). Bu, mutual onay
   beklemeden akisi sade tutar; suistimal Report + Admin ile yonetilir.

6. Reports (Sikayetler)
   - id (PK, UUID)
   - reporter_id (FK -> Users.id)
   - reported_id (FK -> Users.id)
   - commitment_id (FK -> Commitments.id, Nullable)
   - reason (Text)
   - status (Enum: 'open', 'resolved', 'dismissed')
   - admin_note (Text, Nullable) - Adminin karar notu
   - created_at (Timestamp)

--- YAPILANDIRMA / LOG TABLOLARI (admin panelden yonetilir) ---

7. Settings (Sistem Ayarlari) - tum kritik parametrelerin tek dogruluk kaynagi
   - key (PK, String) - ayar anahtari (orn. 'checkpoint_windows', 'score', 'upload', 'limits')
   - value (JSONB) - ayarin degeri (asagidaki gruplar)
   - updated_at (Timestamp)
   - updated_by (FK -> Users.id, Nullable) - son degisikligi yapan admin
     Onerilen anahtarlar ve icerikleri (varsayilanlar seed ile yuklenir):
     'checkpoint_windows' : { joined:{start:0,end:2}, active:{start:6,end:9},
     completed:{start:13,end:14, toleranceHours:24} } (gun cinsi)
     'score' : { start:100, missPenalty:-20, completeReward:+5,
     dimBelow:50, hideBelow:0 }
     'limits' : { defaultSlotsTotal:12, maxAppsBeforeFirstComplete:1,
     rejoinSameAppAfterCancel:false }
     'upload' : { provider:'prntscr', baseUrl, secretKey, formFields:{...},
     userAgent, regex:{ status, share, error, cdnImg } }
     'cron' : { runHourUTC:6, reminderLeadHours:24 }
     'defaultInstructions': { joined, active, completed } (sahip bos birakirsa gosterilen genel
     yonergeler; TR/EN ayri tutulabilir)
     NOT: Sunucu bu degerleri getSetting(key) ile okur (kisa sureli in-memory cache + Settings
     degisince invalidasyon). Hicbir kritik sabit koda gomulmez.

8. MessageTemplates (Telegram/In-app Mesaj Sablonlari) - tum bildirim metinleri
   - key (PK, String) - sablon anahtari (orn. 'reminder_joined', 'commitment_failed',
     'app_frozen', 'app_unfrozen', 'app_frozen_tester_notice', 'commitment_completed',
     'bot_link_prompt')
   - locale (PK, Enum: 'tr','en') - dil (key+locale bilesik PK)
   - text (Text) - {ad}, {app}, {gun}, {saat}, {checkpoint} gibi placeholder iceren metin
   - updated_at (Timestamp)
   - updated_by (FK -> Users.id, Nullable)
     NOT: sendTemplate(telegramId, key, locale, vars) bu tabloyu okur, placeholder'lari doldurur.
     Admin tum metinleri canli duzenleyebilir; deploy gerekmez.

9. ScoreEvents (Puan Hareketleri) - skor degisikliklerinin seffaf logu
   - id (PK, UUID)
   - user_id (FK -> Users.id, Cascade Delete)
   - delta (Int) - puan degisimi (+5, -20, admin -100 vb.)
   - reason (Enum: 'checkpoint_missed', 'commitment_completed', 'admin_penalty',
     'admin_reward', 'report_penalty')
   - commitment_id (FK -> Commitments.id, Nullable) - ilgiliyse
   - actor_id (FK -> Users.id, Nullable) - admin islemiyse hangi admin
   - note (Text, Nullable)
   - created_at (Timestamp)
     NOT: Users.score, ScoreEvents toplaminin onbellegidir; her event eklendiginde guncellenir.
     Boylece "neden bu puan?" admin ve kullanici icin izlenebilir.

10. SISTEM MANTIGI VE AKISLAR

---

A. Kimlik Dogrulama Akisi

1. Kullanici "Telegram ile Giris Yap" butonuna tiklar (Telegram Login Widget).
2. Telegram popup'i kullaniciya izin sorar; onaylayinca callback URL'e sorgu parametreleriyle yonlendirir.
3. /api/auth/callback endpoint'i HMAC-SHA256 ile hash dogrular (bot token kullanilarak).
4. Gecerliyse: Users tablosunda telegram_id ile upsert yap (ilk giriste kayit olustur, sonrakilerde last_login_at guncelle).
5. Kendi createSession() ile session olustur (token cookie'ye, SHA-256 hash'i Sessions tablosuna),
   HTTP-only/Secure/SameSite=Lax cookie set et. Kullanici ana sayfaya yonlendirilir.
6. hooks.server.ts her istekte session token'i okur, validateSessionToken ile dogrular,
   gecerliyse locals.user/locals.session set eder (gerekirse suresini uzatir).
7. Korunan route'lar (+layout.server.ts) locals.user yoksa /login'e yonlendirir.

8. BOT BAGLAMA (Bildirimler icin zorunlu - KRITIK):
   - Telegram botu, kendisine hic /start dememis bir kullaniciya DM gonderemez. Bu yuzden
     login sonrasi bot_started=false ise kullaniciya belirgin bir "Bildirimleri Ac" adimi gosterilir.
   - users.bot_start_token uretilir; kullanici "Botu Bagla" butonuyla t.me/<bot>?start=<token>
     deep link'ine yonlendirilir.
   - Bot tarafinda /start <token> webhook'u (veya getUpdates) token'i bulur, ilgili Users
     kaydinda bot_started=true yapar, token'i temizler ve hosgeldin DM'i atar.
   - bot_started=false olan kullaniciya tum bildirimler ek olarak SITE ICI banner ile gosterilir;
     her gir'ste "botu bagla" hatirlaticisi cikar (fallback - hicbir bildirim kaybolmaz).

B. Uygulama Listeleme, Slot ve Puan Sistemi

- Uygulamalar ana sayfada tablo/satir (row) formatinda listelenir. shadcn-svelte Table bileseni kullanilacaktir.
- Her satirda: uygulama adi, sahibinin puani, dolu/toplam slot (orn. 7/12), "Katil" butonu.
- Gorunurluk Kurallari (WHERE):
  - Sadece App.status='active' VE bos slotu olan (dolu < slots_total) uygulamalar listelenir.
  - App.status='frozen' (sahibi taahhut kacirmis) uygulamalar GOSTERILMEZ.
  - App.status='closed' veya slotu dolmus uygulamalar listede gorunmez.
- Siralama (ORDER BY): sahibinin score'una gore azalan; score < 0 olan kullanicilarin uygulamalari gosterilmez.
  0 <= score < 50 olan sahiplerin uygulamalari opacity-50 (soluk) ve listenin altina itilir.
- Giris yapmamis kullanicilar uygulamalari gorebilir ama taahhut (Katil) baslatamaz.
- Bir kullanici kendi uygulamasina katilamaz; ayni uygulamaya birden fazla aktif taahhut veremez (UNIQUE).

C. Ekran Goruntusu Upload Akisi

1. Kullanici browser'da dosya secer (veya surukleler). Client'ta resmin piksel boyutlari okunur.
2. Dosya /api/upload endpoint'ine multipart/form-data olarak gonderilir.
3. Server-side uploadScreenshot() fonksiyonu (src/lib/server/upload.ts):
   a. Unix timestamp (saniye): Math.floor(Date.now() / 1000)
   b. MD5 hash: md5(SECRET_KEY + timestamp), SECRET_KEY UPLOAD_SECRET_KEY env'inden okunur
   c. randomUUID() ile rastgele app_id uret
   d. Resim base64 dataUrl ise once parse edip ham buffer'a cevir
   e. POST https://upload.prntscr.com/upload/{timestamp}/{hash}/
   FormData: width, height (gercek piksel boyutlari), dpi="1.000000", app_id (UUID),
   image (ham byte'lar Blob icinde, dosya adi: todo-image.png/jpg/webp)
   f. XML yaniti regex ile parse et: <status>success</status> ve <share>https://prnt.sc/xxxx</share>
   g. status success degilse <error> etiketini oku ve hata firlat
   h. share URL'e ikinci GET istegi at, header'a User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
   AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ekle
   i. Donen HTML'den class="screenshot-image" <img> etiketinin src ya da data-src attribute'unu regex ile cek → gercek CDN URL
   j. Ikinci istek basarisizsa fallback: shareUrl'i CDN URL olarak kullan
   k. Donus: { url, shareUrl }
4. URL'ler ilgili Checkpoint kaydinin screenshots JSONB alanina eklenir.

D. Taahhut (Commitment) ve Checkpoint Akisi

1. Katilma: A kullanicisi, B'nin uygulamasinda "Katil" der.
   - YARIS KOSULU KORUMASI (KRITIK): Tum "katil" islemi TEK transaction icinde yapilir ve app
     satiri kilitlenir (SELECT ... FOR UPDATE / Drizzle .for('update')). Iki tester ayni anda
     son slota basvurursa kilit sirayla calistirir; dolu slot sayimi transaction icinde okunur,
     boylece over-subscription (slot asimi) olmaz. UNIQUE(tester_id, app_id) cift katilimi ayrica
     veritabani seviyesinde engeller.
   - On kontroller (kilit altinda): App.status='active', bos slot var (dolu < slots_total),
     A app sahibi degil, A'nin bu app'e zaten aktif taahhudu yok, A'nin hesabi donmus durumda
     yeni taahhude izin veriyor (Settings limitleri), score >= hideBelow.
   - Commitment olusur: tester=A, app=B'nin, status='active', started_at=NOW.
   - 3 Checkpoint satiri uretilir (joined / active / completed); pencere degerleri o anki
     Settings.checkpoint_windows'tan started_at'a gore HESAPLANIP satira yazilir (UTC).
   - Slot aninda dolu sayilir (Commitment status IN ('active','completed') slotu isgal eder).
   - A'ya "joined" checkpoint penceresi (Gun 1-2) hatirlatilir; Groups linki + app linki +
     sahibin o checkpoint icin yazdigi yonerge (App.instructions.joined; yoksa
     Settings.defaultInstructions) gosterilir.

2. Checkpoint Kaniti Yukleme: A, acik penceredeki checkpoint icin ekran goruntusu(leri) yukler.
   - Checkpoint kartinda sahibin o asama icin yazdigi yonerge gosterilir (App.instructions[kind];
     yoksa Settings.defaultInstructions) - tester ne yapacagini/neyi SS'leyecegini bilir.
   - uploadScreenshot() cagrilir (provider Settings'ten), URL'ler Checkpoint.screenshots'a yazilir.
   - Checkpoint.status='submitted', submitted_at=NOW. (App sahibinin manuel onayi gerekmez.)
   - Pencere DISINDA yuklemeye izin verilmez (erken: pencere acilmamis; gec: cron zaten 'missed' yapmis).
   - 3. checkpoint ('completed') submitted olunca: Commitment.status='completed', completed_at=NOW.
     - SKOR: tester'a Settings.score.completeReward (+5 vars.) eklenir; ScoreEvents'e
       reason='commitment_completed' satiri yazilir, Users.score guncellenir.
     - B'ye Telegram'dan (MessageTemplates 'commitment_completed') "bir tester surecini tamamladi"
       bildirimi gider.

3. Hatirlatma (Cron - gunluk): Acik/yaklasan checkpoint pencereleri icin tester'a Telegram DM hatirlatma atilir
   (orn. "Aktifim kontrol noktan acildi, 2 gun icinde kanit yukle").

4. Kacirma ve Donma (Cron - gunluk): window_end gecmis ve status='pending' olan Checkpoint'ler icin:
   - Checkpoint.status='missed'.
   - Ilgili Commitment.status='failed' -> tester'in o app'teki slotu BOSALIR (artik isgal etmez),
     B yeni tester arayabilir; B'ye Telegram bildirimi gider (MessageTemplates 'commitment_failed').
   - SKOR: tester'a (A'ya) Settings.score.missPenalty (-20 vars.) uygulanir; ScoreEvents'e
     reason='checkpoint_missed' satiri yazilir, Users.score guncellenir. (Skor dimBelow/hideBelow
     esiklerinin altina inerse Bolum B gorunurluk kurallari devreye girer.)
   - CEZA (icsel): tester'in (A'nin) status='active' olan tum Apps kayitlari 'frozen' yapilir.
     Frozen app'ler listede gorunmez, yeni tester toplayamaz.
   - A'ya Telegram bildirimi (MessageTemplates 'app_frozen'): "Bir taahhudunu kacirdin;
     kendi uygulamalarinin slotlari donduruldu. Devam eden taahhutlerini tamamlayinca acilacak."
   - DONAN APP'IN MEVCUT TESTERLERI (Madde 5 karari): Frozen YALNIZCA yeni katilimi durdurur;
     o app'teki devam eden (status='active') commitment'lar NORMAL ISLER, checkpoint'leri
     beklenir, kacarsa yine 'missed'/'failed' olur. Ancak bu testerlere bilgilendirme DM'i gider
     (MessageTemplates 'app_frozen_tester_notice'): "Test ettigin <app> gecici donduruldu;
     taahhudun aynen devam ediyor, checkpoint'lerini surdurmen yeterli." App tekrar 'active'
     olunca istege bagli 'app_unfrozen' bilgilendirmesi de gonderilebilir.

5. Cozulme (Unfreeze): A'nin acik (status='active') taahhudu kalmadiginda (hepsi 'completed' veya yenisi yok),
   'frozen' App'leri tekrar 'active' yapilir; sahibe 'app_unfrozen' DM'i gider. Bu kontrol checkpoint
   submit ve commitment completed olaylarinda ve/veya gunluk cron'da yapilir.

6. Iptal: Tester gonullu birakirsa veya app sahibi bir tester'i cikarirsa Commitment.status='cancelled',
   slot bosalir. (Gonullu birakma da kacirma sayilmaz ama tekrar ayni app'e katilim sinirlanabilir - opsiyonel.)

E. Guvenlik ve Raporlama

- App sahibi, kendi uygulamasina katilan bir tester'in checkpoint kanitlarini gorebilir; uygunsuz/sahte
  bulursa "Sikayet Et" ile Report acabilir (commitment_id ile baglanir).
- Report olusturulunca admin paneline duser.
- Admin: checkpoint ekran goruntulerini, taraflarin gecmisini (toplam commitment/report sayisi) gorur.
- Kararlar: Dismiss (kapat) veya Penalize (karsi tarafi -N puan; gerekirse Commitment'i failed yapma).

5. PROJE MIMARISI (KLASOR YAPISI)

---

peertest/
|-- src/
| |-- lib/
| | |-- components/
| | | |-- ui/ (shadcn-svelte auto-generated bilesenleri: Button, Table, Badge, Dialog, Tabs, Tooltip, Avatar, Sonner, Skeleton vb.)
| | | |-- AppRow.svelte (Ana sayfa tablo satiri - uygulama bilgisi + slot + "Katil" butonu)
| | | |-- CheckpointTimeline.svelte (14 gunluk yatay timeline - 3 dugum, geri sayim, "su an" isaretcisi; mobilde dikey stepper - bkz 6.4)
| | | |-- CheckpointCard.svelte (Bir checkpoint: durum, pencere, SS yukleme alani)
| | | |-- CommitmentRow.svelte (Bir taahhut: app, timeline, durum, acik pencereye "Kanit Yukle")
| | | |-- SlotPips.svelte (12 pip slot gostergesi - dolu/bos; bkz 6.5)
| | | |-- StatusBadge.svelte (Anlamsal durum rozeti - nokta+ikon+metin; bkz 6.6)
| | | |-- ScoreBadge.svelte (Guven puani rozeti - renk esikleri + tooltip; bkz 6.6)
| | | |-- UploadModal.svelte (Screenshot yukleme modali - surukle-birak, onizleme, progress)
| | | |-- ThemeToggle.svelte (Acik/Karanlik mod degistirici; bkz 6.2)
| | | |-- Header.svelte (Nav, kullanici bilgisi, dil degistirici, tema toggle)
| | |-- server/
| | | |-- db/
| | | | |-- schema.ts (Drizzle tablo tanimlari: users, sessions, apps, commitments, checkpoints, reports, settings, message_templates, score_events)
| | | | |-- index.ts (Neon DB baglantisi + Drizzle client)
| | | | |-- seed.ts (Settings + MessageTemplates varsayilanlarini yukler)
| | | |-- auth.ts (Telegram HMAC dogrulama + KENDI session katmanimiz: generateSessionToken/createSession/validateSessionToken/invalidateSession - lucia degil)
| | | |-- config.ts (getSetting(key)/setSetting - Settings tablosu okuma + kisa cache + invalidasyon; tum kritik parametrelerin tek erisim noktasi)
| | | |-- upload.ts (uploadScreenshot() - provider'a gore prntscr/r2/blob; parametreler config.ts'ten)
| | | |-- notify.ts (sendTelegramMessage() + sablon render eden sendTemplate(); bot_started kontrolu + in-app fallback)
| | | |-- bot.ts (Telegram bot webhook: /start <token> -> bot_started=true eslestirme)
| | | |-- score.ts (applyScore(userId, reason, delta, ctx): ScoreEvents'e yaz + Users.score guncelle)
| | | |-- commitment.ts (Taahhut mantigi: TRANSACTION+kilit ile katilma, checkpoint uretimi, freeze/unfreeze, slot sayimi)
| | |-- utils/
| | | |-- status.ts (Anlamsal durum token'lari: renk/nokta/ikon - tek dogruluk kaynagi; bkz 6.2)
| | | |-- score.ts (Puan renklerini/opakligi hesaplar)
| | | |-- checkpoint.ts (Pencere ofsetleri, durum hesaplama, "su an acik mi" kontrolu)
| | | |-- date.ts (Timestamp formatlama, pencere hesaplama)
| | |-- i18n/ (paraglide - en.json, tr.json)
| |-- routes/
| | |-- +layout.server.ts (Global session kontrolu, locals.user)
| | |-- login/
| | | |-- +page.svelte (Telegram Login Widget sayfasi)
| | |-- (app)/ (Giris gerektiren sayfalar - layout ile korunur)
| | | |-- +layout.server.ts (locals.user yoksa /login'e redirect; bot_started=false ise "botu bagla" banner verisi)
| | | |-- +page.svelte (Ana sayfa - uygulama listesi)
| | | |-- connect-bot/
| | | | |-- +page.svelte (Bildirimleri ac: t.me/<bot>?start=<token> deep link + durum/yenile)
| | | |-- my-apps/
| | | | |-- +page.svelte (Uygulamalarim: ekle/duzenle/sil; aciklama + HER CHECKPOINT icin yonerge (instructions) yazma; tester/slot durumu, frozen uyarisi)
| | | |-- commitments/
| | | |-- +page.svelte (Taahhutlerim: aktif/gecmis, timeline, acik pencereye SS yukleme, sahibin yonergesi gosterimi)
| | |-- (admin)/ (role='admin' kontrolu)
| | | |-- +layout.server.ts (Admin degil ise 403)
| | | |-- admin/
| | | |-- +page.svelte (Dashboard: kullanici listesi + acik raporlar + donmuslar)
| | | |-- settings/+page.svelte (Sistem ayarlari: checkpoint pencereleri, skor parametreleri, limitler, upload/provider config, cron - hepsi formla)
| | | |-- templates/+page.svelte (Mesaj sablonlari editoru: TR/EN, placeholder onizleme)
| | |-- api/
| | |-- auth/
| | | |-- callback/+server.ts (Telegram widget callback, session olusturma)
| | | |-- logout/+server.ts (Session silme)
| | | |-- bot-link/+server.ts (POST: bot_start_token uret; GET: bot_started durumunu doner - connect-bot icin)
| | |-- telegram/
| | | |-- webhook/+server.ts (Telegram bot webhook: /start <token> -> bot_started=true eslestir; bot.ts kullanir)
| | |-- upload/+server.ts (Multipart upload alir, uploadScreenshot() cagirir)
| | |-- commitments/
| | | |-- +server.ts (POST: "Katil" - transaction+kilit ile taahhut+checkpoint; GET: kullanicinin taahhutleri)
| | | |-- [id]/+server.ts (PATCH: iptal/cancel; DELETE app sahibi tester cikarma)
| | | |-- [id]/checkpoint/+server.ts (PATCH: acik checkpoint'e SS kaniti yukle -> submitted)
| | |-- apps/
| | | |-- +server.ts (POST: app ekle; GET: liste - sadece active + bos slot)
| | | |-- [id]/+server.ts (PATCH: guncelle - aciklama/yonergeler dahil; DELETE: sil)
| | |-- admin/
| | | |-- users/[id]/+server.ts (Puan guncelle - score.ts uzerinden ScoreEvents'e loglar, sil/shadowban)
| | | |-- reports/[id]/+server.ts (Dismiss veya penalize)
| | | |-- settings/+server.ts (GET/PATCH: Settings degerleri - admin)
| | | |-- templates/+server.ts (GET/PATCH: MessageTemplates - admin)
| | |-- cron/+server.ts (Vercel Cron: hatirlatma + kacirma->failed/freeze/skor cezasi + frozen tester bildirimi + unfreeze)
| |-- hooks.server.ts (Her istekte session dogrula, locals.user set et)
| |-- app.html
| |-- app.d.ts (Locals tip tanimlari: user, session)
|-- messages/ (paraglide dil dosyalari)
| |-- en.json
| |-- tr.json
|-- drizzle/ (Drizzle migration dosyalari)
|-- tailwind.config.js
|-- components.json (shadcn-svelte konfigurasyon)
|-- drizzle.config.ts
|-- vercel.json (Cron job tanimlari)

6. UI/UX PRENSIPLERI VE GORSEL TASARIM

---

Hedef kitle gelistiriciler. O yuzden estetik dili "developer console" cizgisinde: Linear,
Vercel Dashboard, Railway ve GitHub'in sade ama guvenli, yogun ama nefes alan gorunumu.
Suslu degil; rafine. Her piksel bir bilgi tasir, her hareket bir amaca hizmet eder.

6.1 TASARIM FELSEFESI

- "Sakin yogunluk": Cok veri, az gurultu. Bol whitespace + net hiyerarsi ile tablo kalabalik
  hissettirmez. Gozun gidecegi tek bir birincil eylem her ekranda bellidir.
- Icerik > krom: Cerceveler, golgeler ve dolgular minimumda; veriyi (slot, geri sayim, durum)
  one cikaran ince ipuclari kullanilir. Ince 1px zinc borderlar, yumusak koseler (rounded-lg).
- Amacli hareket: "Hicbir animasyon yok" katiligi yerine "yalnizca anlam tasiyan hareket".
  Durum gecisleri, sayac tiklari ve modal acilislari 150-200ms yumusak gecislerle akar; geri
  kalan her sey statik ve hizli. prefers-reduced-motion'a saygi gosterilir.
- Teknik samimiyet: Paket adi, slot sayisi, geri sayim gibi teknik veriler monospace
  (font-mono) ile gosterilir; bu hem hizalama hem de "muhendis araci" hissi verir.

  6.2 RENK SISTEMI (Anlamsal / Semantic)
  Temel: zinc/neutral notr zemin. Tek bir marka aksani + net bir durum paleti.

- Notr zemin: Acik temada white/zinc-50 arka plan, zinc-200 border, zinc-900 metin,
  zinc-500 ikincil metin.
- Marka aksani: indigo-600 (birincil butonlar, aktif sekme, odak halkasi). Tek aksan rengi;
  her yere serpistirilmez, sadece birincil eylemi isaretler.
- Durum paleti (tum sistemde tutarli token'lar):
  active / devam ediyor -> blue-500 (mavi nokta + soft blue rozet)
  submitted / basarili -> emerald-500 (kanit yuklendi, checkpoint yesil)
  pending / bekliyor -> amber-500 (pencere yaklasiyor/acik, kanit yok)
  missed / failed -> red-500 (kacti)
  frozen / dondu -> cyan-500 (buz/frost temasi: ince cyan border + hafif
  backdrop-blur "buzlu cam" his, kar tanesi ikon)
  cancelled / notr -> zinc-400
  Bu token'lar src/lib/utils/status.ts icinde tek yerde tanimlanir; rozet, nokta, kenar
  cizgisi ve timeline dugumu hep ayni kaynaktan beslenir (tek dogruluk kaynagi).
- Karanlik Mod (Dark Mode): Gelistiriciler icin birinci sinif vatandas, ikincil dusunce
  degil. Varsayilan: sistem tercihi (prefers-color-scheme). Header'da gunes/ay toggle.
  zinc-950 zemin, zinc-800 border, zinc-100 metin; aksan ve durum renkleri karanlikta
  okunaklilik icin bir ton acilir (orn. indigo-500, emerald-400). Tercih localStorage +
  cookie ile saklanir, SSR'da flash (FOUC) olmamasi icin app.html'de inline script ile
  ilk boyamadan once tema sinifi <html>'e yazilir.

  6.3 TIPOGRAFI VE OLCEK

- Arayuz fontu: Inter (degisken font, sistem fallback). Basliklar tracking-tight.
- Monospace: JetBrains Mono / ui-monospace -> paket adi, geri sayim, slot orani gibi sayisal
  ve teknik degerler.
- Olcek: 14px temel govde, 13px tablo/ikincil, 12px rozet/etiket. Az sayida boyut, net ritim.

  6.4 YILDIZ BILESEN: 14 GUNLUK CHECKPOINT TIMELINE'I
  Uygulamanin duygusal ve islevsel kalbi. Bir taahhudun 14 gunluk yolculugunu tek bakista
  anlatan yatay zaman cizgisi. (CheckpointTimeline.svelte)

- Yatay bir ray uzerinde 3 dugum: "Katildim" (Gun 1-2), "Aktifim" (Gun 6-9),
  "Tamamladim" (Gun 13-14). Dugumler arasi dolgu (progress fill) gecen sureyi gosterir.
- Her dugumun durumu renk + ikonla anlatilir:
  submitted -> dolu emerald daire + tik ikonu
  pending (pencere acik) -> nabiz gibi hafif atan amber halka (pencere su an acik!)
  pending (henuz acilmamis) -> ici bos zinc daire
  missed -> kirmizi daire + x ikonu
- "Su an" isaretcisi: ray uzerinde gecerli gunu gosteren ince dikey cizgi.
- Geri sayim: Bir sonraki acik/yaklasan pencere icin canli geri sayim (font-mono),
  orn. "Aktifim penceresi 1g 4s icinde kapaniyor". 12 saatten az kalmissa amber, kacmaya
  yakinsa (2 saat) kirmizi pulse.
- Mobilde dikey varyant: ray dikey akar, dugumler alt alta (timeline -> stepper'a donusur).

  6.5 SLOT GORSELLESTIRME
  "7/12" duz metni yerine anlamli bir gosterim. (SlotPips.svelte)

- 12 kucuk kare/pip; dolu olanlar zinc-900 (veya aksan), bos olanlar zinc-200 outline.
- Yaninda font-mono "7/12" ve "5 bos" etiketi. Dolu/bos orani bir bakista okunur.
- Tablo satirinda kompakt; uygulama detayinda buyuk varyant kullanilir.

  6.6 DURUM ROZETLERI VE GUVEN PUANI

- StatusBadge.svelte: Renkli nokta + etiket (orn. "_ Aktif", "_ Dondu"). 6.2'deki token'lardan
  beslenir; her durum her yerde ayni gorunur.
- ScoreBadge.svelte: Guven puani; >=50 notr/yesil, 0-49 amber (soluk + uyari), <0 kirmizi.
  Hover'da kucuk tooltip: "X tamamlanan taahhut, Y kacirilan". Sayisal guven somutlanir.

  6.7 SAYFA SAYFA GORUNUM

- Giris (Login): Tek ekran, ortalanmis kart. Kisa deger onerisi ("12 tester kuralini birlikte
  asalim"), 3 adimli mini anlatim (Katil -> Test et -> Kanit yukle) ve tek bir Telegram Login
  Widget butonu. Arka planda cok hafif grid/nokta dokusu, gereksiz gorsel yok.
- Ana Sayfa (Uygulama Listesi): Ust kisimda kucuk ozet seridi (acik slot sayisi, aktif
  taahhudun, varsa "kanit bekleyen pencere" uyarisi). Altinda shadcn Table:
  Uygulama | Sahip+Puan | Slot (pips) | [Katil]. Score'a gore sirali; 0-49 puanli sahipler
  opacity-60 ve altta. Arama + basit filtre (sadece bos slotlu). Satira hover'da hafif zinc-50.
- Taahhutlerim (Commitments): Her taahhut bir kart; ustte uygulama bilgisi + genel durum
  rozeti, ortada CheckpointTimeline, altta acik pencere varsa belirgin birincil eylem:
  "Kanit Yukle". Sekmeler: Aktif / Gecmis. Aktif olanlar ust sirada, acik penceresi olan
  taahhut en uste pinlenir ve sol kenarinda amber accent cizgi tasir (dikkat cek).
- Uygulamalarim (My Apps): Her uygulama bir kart: ad, durum rozeti, SlotPips, tester listesi
  (mini avatar + her birinin timeline ozeti). Frozen ise kart "buzlu cam" gorunumune burunur,
  ustte cyan uyari banneri: "X kacirilmis taahhut yuzunden donduruldu; tamamlayinca cozulur".
  Sag ustte "Uygulama Ekle" birincil butonu -> Dialog form.
- Admin: Yogun ama sakin tablo gorunumu. Sekmeler: Kullanicilar / Raporlar / Donmuslar.
  Rapor satirinda checkpoint ekran goruntuleri kucuk thumbnail; tiklayinca lightbox.
  Karar butonlari (Dismiss / Penalize) satir ici, tek tikla.

  6.8 ETKILESIM VE MIKRO DETAYLAR

- Yukleme durumlari: Veri gelmeden once skeleton (zinc-100 shimmer) satirlar; spinner yerine
  layout-stabil iskeletler kullanilir (CLS yok).
- Bos durumlar (Empty states): Her bos liste icin yonlendirici mesaj + tek eylem
  (orn. "Henuz taahhudun yok -> Uygulamalara goz at"). Asla bos beyaz ekran birakilmaz.
- Bildirimler: shadcn Sonner toast -> "Kanit yuklendi", "Taahhut basladi", hatalar.
  Kisa, sag altta, otomatik kaybolur.
- "Katil" onayi: Hafife alinmamasi gereken 14 gunluk taahhut oldugundan, AlertDialog ile
  net ozet gosterilir: "14 gun, 3 checkpoint. Kacirirsan kendi uygulamalarinin slotlari
  donar." Onay kutusu + birincil buton. Sorumlulugu pesinen netlestirir.
- Ekran goruntusu yukleme: Surukle-birak alani + tiklayinca dosya secici. Secilince anlik
  onizleme thumbnail; yuklenirken progress; basarinca emerald tik. (UploadModal.svelte)
- Geri sayim sayaclari client'ta her saniye/dakika canli gunceller (tek bir interval store).

  6.9 ERISILEBILIRLIK (a11y)

- shadcn-svelte'in yerlesik a11y'si (odak tuzagi, ARIA, klavye) korunur.
- Durum asla yalnizca renge dayanmaz: her durumda ikon + metin de bulunur (renk korlugu).
- Tum etkilesimli ogeler klavye ile erisilebilir; gorulebilir odak halkasi (indigo ring).
- Kontrast AA: zinc-500 ustu metin minimumlari gozetilir; karanlik modda ayrica dogrulanir.

  6.10 RESPONSIVE

- Mobil-oncelikli. Tablolar dar ekranda kart yiginina (stacked cards) donusur.
- Timeline mobilde dikey stepper olur (6.4). Header mobilde hamburger + alt navigasyon.
- Dokunma hedefleri min 44px; birincil eylemler bas parmak erisiminde (alt sabit bar).

  6.11 DIL DESTEGI

- Sag ustte sade TR/EN degistirici (bayrak degil, kisa kod: "TR"/"EN").
- paraglide ile sayfa yenilenmeden aninda dil degisimi; secim cookie'de saklanir, SSR ile
  ilk yuklemede dogru dil gelir.

  6.12 BILESEN KUTUPHANESI
  shadcn-svelte temeli: Button, Table, Badge, Dialog, AlertDialog, Card, Tabs, Tooltip,
  Avatar, Sonner (toast), Skeleton, DropdownMenu. Hicbiri tema katmanina baglanmaz; dogrudan
  Tailwind utility ile ozellestirilir. Bunlarin uzerine projeye ozel bilesenler kurulur
  (CheckpointTimeline, SlotPips, StatusBadge, ScoreBadge - bkz. 6.4-6.6).

7. ADMIN PANELI OZELLIKLERI

---

Ayri, karmasik bir dashboard yerine basit bir tablo gorunumu:

1. Kullanici Yonetimi: Telegram ID veya Username ile arama, puani manuel degistirme (ceza/odul -
   tum degisimler ScoreEvents'e loglanir), shadowban (puani hideBelow altina cekme) veya
   veritabanindan tamamen silme.
2. Sikayetler (Reports): Acik sikayetlerin listesi. Ilgili Commitment'a tiklayip checkpoint ekran
   goruntulerini ve taraflari gorme, tek tusla karar verme (Dismiss veya Penalize).
3. Frozen Kullanicilar: Donmus (acik taahhut kacirmis) kullanici/uygulama gorunumu; gerekirse manuel unfreeze.

4. SISTEM AYARLARI (Settings) - tum kritik parametreler kodda DEGIL burada; degisiklik aninda
   gecerli, deploy gerekmez (gecmis commitment'lar etkilenmez - bkz. Bolum 3-7). Duzenlenebilir:
   - Checkpoint pencereleri: joined/active/completed gun ofsetleri + tolerans.
   - Skor parametreleri: baslangic, kacirma cezasi, tamamlama odulu, dimBelow/hideBelow esikleri.
   - Limitler: varsayilan slot sayisi, ilk tamamlamaya kadar max app, iptal sonrasi tekrar katilim.
   - Upload/Provider: aktif provider, base URL, secret key, FormData alan adlari, User-Agent,
     yanit regex'leri (servis bozulunca buradan onarilir / provider degistirilir).
   - Cron: calisma saati (UTC), hatirlatma kac saat once.
   - Genel varsayilan yonergeler (sahip checkpoint yonergesi bos birakirsa kullanilan metinler).

5. MESAJ SABLONLARI (Message Templates) - kullaniciya Telegram/in-app gidecek TUM metinler
   buradan duzenlenir (TR/EN, key bazli, {ad}/{app}/{gun}/{saat} placeholder onizlemeli).
   Sablonlar: hatirlatma, taahhut tamamlandi, taahhut basarisiz, app donduruldu (sahip),
   app donduruldu (mevcut tester bilgilendirme), app cozuldu, botu bagla daveti. Metin
   degisikligi aninda yayinlanir; deploy gerekmez.

6. GELISTIRME FAZLARI (ROADMAP)

---

- Faz 1: Setup & Auth - SvelteKit kurulumu, Drizzle ORM + Neon DB baglantisi, KENDI session
  katmani (lucia degil), Telegram Login entegrasyonu, BOT BAGLAMA akisi (webhook + connect-bot).
  config.ts + Settings/MessageTemplates tablolari ve seed. (TR/EN altyapisinin kurulmasi).
- Faz 2: Core CRUD - Uygulama ekleme (aciklama + checkpoint yonergeleri dahil), listeleme
  (active + bos slot), silme. Slot sayimi ve ana sayfa tablosu.
- Faz 3: Taahhut & Checkpoint - TRANSACTION+kilitli "Katil" akisi (yaris kosulu korumasi),
  Commitment + 3 Checkpoint uretimi (pencereler Settings'ten), acik pencereye SS kaniti yukleme,
  sahibin yonergesinin gosterimi, skor olaylari (tamamlama odulu), taahhutlerim sayfasi.
- Faz 4: Cron, Freeze & Bildirim - Vercel Cron (UTC) ile hatirlatma, kacirma -> failed/slot
  bosaltma/skor cezasi/app freeze, frozen app mevcut testerlerine bilgilendirme, unfreeze;
  sablon tabanli Telegram DM + bot_started kontrolu/in-app fallback (notify.ts).
- Faz 5: Raporlama ve Admin - Sikayet sistemi, Admin route'lari (korunmus), frozen kullanici
  gorunumu + manuel unfreeze, SISTEM AYARLARI ekrani ve MESAJ SABLONLARI editoru.
- Faz 6: Harici API & Cila - Upload provider entegrasyonu (prntscr varsayilan + R2/Blob secenegi,
  config'ten), son UI/UX (dark mode, timeline, responsive) testleri ve Vercel'de canliya alma.
