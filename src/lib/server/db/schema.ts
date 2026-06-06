import { sql } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	uuid,
	bigint,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
	primaryKey,
	unique,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';

// ============================================================
// ENUM'LAR
// ============================================================
export const userRole = pgEnum('user_role', ['user', 'admin']);
export const locale = pgEnum('locale', ['tr', 'en']);
export const appStatus = pgEnum('app_status', ['active', 'frozen', 'closed']);
export const commitmentStatus = pgEnum('commitment_status', [
	'active',
	'completed',
	'failed',
	'cancelled'
]);
export const checkpointKind = pgEnum('checkpoint_kind', ['joined', 'active', 'completed']);
export const checkpointStatus = pgEnum('checkpoint_status', ['pending', 'submitted', 'missed']);
export const reportStatus = pgEnum('report_status', ['open', 'resolved', 'dismissed']);
// Trade (karsilikli test takasi) yasam donguşü: requested -> matched (her iki taraf da onayladi)
// -> ya da cancelled (taraflar vazgecti). Cancelled, askida olan trade'ler icin.
export const tradeStatus = pgEnum('trade_status', ['requested', 'matched', 'cancelled']);
export const scoreReason = pgEnum('score_reason', [
	'checkpoint_missed',
	'commitment_completed',
	'admin_penalty',
	'admin_reward',
	'report_penalty'
]);

// ============================================================
// 1. USERS
// ============================================================
export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	// Telegram sayisal kullanici ID'si. 52-bit icine sigar -> mode:'number' guvenli.
	telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
	username: text('username'),
	firstName: text('first_name').notNull(),
	avatarUrl: text('avatar_url'),
	score: integer('score').notNull().default(100),
	role: userRole('role').notNull().default('user'),
	// Kullanici botu /start ile baglamis mi (DM atilabilir mi).
	botStarted: boolean('bot_started').notNull().default(false),
	// /start deep link eslestirme token'i (tek kullanimlik).
	botStartToken: text('bot_start_token'),
	// DM/arayuz dili tercihi.
	locale: locale('locale').notNull().default('tr'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }).notNull().defaultNow()
});

// ============================================================
// 2. SESSIONS  (kendi session katmanimiz - lucia degil)
// ============================================================
export const sessions = pgTable('sessions', {
	// session token'in SHA-256 hash'i (ham token sadece cookie'de durur).
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

// ============================================================
// 3. APPS
// ============================================================
export const apps = pgTable(
	'apps',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		packageName: text('package_name'),
		groupLink: text('group_link').notNull(),
		appLink: text('app_link').notNull(),
		slotsTotal: integer('slots_total').notNull().default(12),
		iconUrl: text('icon_url'),
		summary: text('summary'),
		category: text('category'),
		description: text('description'),
		// Sahibin her checkpoint icin tester'a yazdigi yonergeler.
		instructions: jsonb('instructions').$type<{
			joined?: string;
			active?: string;
			completed?: string;
		}>(),
		status: appStatus('status').notNull().default('active'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('apps_user_idx').on(t.userId), index('apps_status_idx').on(t.status)]
);

// ============================================================
// 4. COMMITMENTS
// ============================================================
export const commitments = pgTable(
	'commitments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		testerId: uuid('tester_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		appId: uuid('app_id')
			.notNull()
			.references(() => apps.id, { onDelete: 'cascade' }),
		status: commitmentStatus('status').notNull().default('active'),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		// Bir tester bir app'e ayni anda tek aktif/tamamlanan (slot isgal eden) taahhut verebilir.
		// failed/cancelled gecmis kayitlari engellemez (tekrar katilim app mantiginda yonetilir).
		uniqueIndex('commitments_active_uniq')
			.on(t.testerId, t.appId)
			.where(sql`status in ('active', 'completed')`),
		index('commitments_app_idx').on(t.appId),
		index('commitments_tester_idx').on(t.testerId),
		index('commitments_status_idx').on(t.status)
	]
);

// ============================================================
// 5. CHECKPOINTS  (her commitment icin 3 satir)
// ============================================================
export const checkpoints = pgTable(
	'checkpoints',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		commitmentId: uuid('commitment_id')
			.notNull()
			.references(() => commitments.id, { onDelete: 'cascade' }),
		kind: checkpointKind('kind').notNull(),
		windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
		windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
		status: checkpointStatus('status').notNull().default('pending'),
		screenshots: jsonb('screenshots').$type<{ url: string; shareUrl: string }[]>(),
		submittedAt: timestamp('submitted_at', { withTimezone: true })
	},
	(t) => [
		unique('checkpoints_commitment_kind_uniq').on(t.commitmentId, t.kind),
		index('checkpoints_commitment_idx').on(t.commitmentId),
		// Cron taramasi: penceresi gecmis + pending olanlari hizli bulmak icin.
		index('checkpoints_status_window_idx').on(t.status, t.windowEnd)
	]
);

// ============================================================
// 5b. TRADES  (karşılıklı test takasi: A'nin app'i icin B'nin app'ini, B'nin app'i icin A'nin app'ini)
// ============================================================
// Bir trade kaydi tek yönlü bir teklif: "ben (requester) senin app'inde (target) test
// yapacagim, karşiliginda sen benim app'imde (offered) test yap". Karşi taraf da
// ayni esleşmeyi kaydederse iki kayit 'matched' olur ve iki commitment uretilir.
export const trades = pgTable(
	'trades',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		requesterId: uuid('requester_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		// Talep edenin test edecegi app (karsi tarafin sahip oldugu).
		targetAppId: uuid('target_app_id')
			.notNull()
			.references(() => apps.id, { onDelete: 'cascade' }),
		// Talep edenin karsiliginda sundugu kendi app'i.
		offeredAppId: uuid('offered_app_id')
			.notNull()
			.references(() => apps.id, { onDelete: 'cascade' }),
		status: tradeStatus('status').notNull().default('requested'),
		// Eslestiginde olusturulan commitment id'si (her trade kendi commitmentini bilir).
		commitmentId: uuid('commitment_id').references(() => commitments.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		matchedAt: timestamp('matched_at', { withTimezone: true })
	},
	(t) => [
		// Bir requester ayni (target, offered) cifti icin sadece tek 'requested' kaydi acabilir.
		uniqueIndex('trades_requested_uniq')
			.on(t.requesterId, t.targetAppId, t.offeredAppId)
			.where(sql`status = 'requested'`),
		index('trades_target_idx').on(t.targetAppId),
		index('trades_offered_idx').on(t.offeredAppId),
		index('trades_requester_idx').on(t.requesterId),
		index('trades_status_idx').on(t.status)
	]
);

// ============================================================
// 5c. LOGIN_TOKENS  (Telegram bot deep-link giris akisi)
// ============================================================
// Akis:
//   1) /login'da "Telegram ile giris" tikliyor -> token uretilir (userId=null, expiresAt=+10dk)
//   2) Tarayici t.me/BOT?start=login_<token>'a yonlendirilir
//   3) Bot webhook /start login_<token> alir; Telegram user'i upsert eder
//      ve token.userId = user.id yapar (botStarted otomatik true).
//   4) Bot kullaniciya inline-button mesaji atar: complete URL'i
//   5) Kullanici butona basar -> session olusur, token consumed
export const loginTokens = pgTable(
	'login_tokens',
	{
		// Tek-kullanimlik ham token (URL'de gorunecek; predictable degil).
		token: text('token').primaryKey(),
		// Bot webhook tarafindan Telegram user upsert sonrasi doldurulur.
		userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
		// Login sonrasi yonlendirilecek path (open-redirect koruma /api'de safeRedirectPath).
		redirectTo: text('redirect_to'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		// Tekrar kullanim engeli: complete cagrildigi an doldurulur.
		consumedAt: timestamp('consumed_at', { withTimezone: true })
	},
	(t) => [index('login_tokens_expires_idx').on(t.expiresAt)]
);

// ============================================================
// 6. REPORTS
// ============================================================
export const reports = pgTable(
	'reports',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		reporterId: uuid('reporter_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		reportedId: uuid('reported_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		commitmentId: uuid('commitment_id').references(() => commitments.id, { onDelete: 'set null' }),
		reason: text('reason').notNull(),
		status: reportStatus('status').notNull().default('open'),
		adminNote: text('admin_note'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('reports_status_idx').on(t.status)]
);

// ============================================================
// 7. SETTINGS  (key-value, JSONB) - tum kritik parametreler
// ============================================================
export const settings = pgTable('settings', {
	key: text('key').primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' })
});

// ============================================================
// 8. MESSAGE_TEMPLATES  (key + locale bilesik PK)
// ============================================================
export const messageTemplates = pgTable(
	'message_templates',
	{
		key: text('key').notNull(),
		locale: locale('locale').notNull(),
		text: text('text').notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => [primaryKey({ columns: [t.key, t.locale] })]
);

// ============================================================
// 9. SCORE_EVENTS  (puan hareketleri logu)
// ============================================================
export const scoreEvents = pgTable(
	'score_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		delta: integer('delta').notNull(),
		reason: scoreReason('reason').notNull(),
		commitmentId: uuid('commitment_id').references(() => commitments.id, { onDelete: 'set null' }),
		actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
		note: text('note'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('score_events_user_idx').on(t.userId)]
);

// ============================================================
// Tip kisayollari (select tipleri)
// ============================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type App = typeof apps.$inferSelect;
export type Commitment = typeof commitments.$inferSelect;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type LoginToken = typeof loginTokens.$inferSelect;
export type NewLoginToken = typeof loginTokens.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type ScoreEvent = typeof scoreEvents.$inferSelect;
