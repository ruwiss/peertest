import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { messageTemplates } from './db/schema';

// ============================================================
// MESAJ SABLONLARI (Telegram/in-app). DB'de yoksa varsayilan kullanilir.
// Placeholder: {ad} {app} {gun} {saat} {checkpoint}
// ============================================================

export type TemplateKey =
	| 'reminder_joined'
	| 'reminder_active'
	| 'reminder_completed'
	| 'commitment_completed'
	| 'commitment_failed'
	| 'app_frozen'
	| 'app_unfrozen'
	| 'app_frozen_tester_notice'
	| 'tester_removed_by_owner'
	| 'tester_removed_by_admin'
	| 'app_deleted_by_admin'
	| 'bot_link_welcome'
	| 'trade_requested'
	| 'trade_matched'
	| 'free_joined'
	| 'app_published';

export type Locale = 'tr' | 'en';

export const DEFAULT_TEMPLATES: Record<TemplateKey, Record<Locale, string>> = {
	reminder_joined: {
		tr: "Merhaba {ad}! {app} için 'Katıldım' kontrol noktan açık. {saat} içinde kanıt yüklemelisin.",
		en: "Hi {ad}! Your 'Joined' checkpoint for {app} is open. Upload proof within {saat}."
	},
	reminder_active: {
		tr: "{ad}, {app} için 'Aktifim' kontrol noktan açık. {saat} içinde kanıt yükle.",
		en: "{ad}, your 'Active' checkpoint for {app} is open. Upload proof within {saat}."
	},
	reminder_completed: {
		tr: "{ad}, {app} için 'Tamamladım' kontrol noktan açık. {saat} içinde son kanıtı yükle.",
		en: "{ad}, your 'Completed' checkpoint for {app} is open. Upload the final proof within {saat}."
	},
	commitment_completed: {
		tr: '{ad} adlı tester, {app} uygulamandaki 14 günlük test sürecini tamamladı.',
		en: 'Tester {ad} completed the 14-day test for your app {app}.'
	},
	commitment_failed: {
		tr: '{app} uygulamandaki bir tester kontrol noktasını kaçırdı; slot boşaldı, yeni tester arayabilirsin.',
		en: 'A tester missed a checkpoint on your app {app}; the slot is now free for a new tester.'
	},
	app_frozen: {
		tr: 'Bir taahhüdünü kaçırdın. Kendi uygulamalarının slotları donduruldu. Devam eden taahhütlerini tamamlayınca tekrar açılacak.',
		en: 'You missed a commitment. Your apps slots are frozen. They will reopen once you complete your active commitments.'
	},
	app_unfrozen: {
		tr: 'Tebrikler! Açık taahhütlerini tamamladın; uygulamalarının slotları yeniden aktif.',
		en: 'Congrats! You cleared your commitments; your apps slots are active again.'
	},
	app_frozen_tester_notice: {
		tr: 'Test ettiğin {app} geçici olarak donduruldu; taahhüdün aynen devam ediyor, checkpoint`lerini sürdürmen yeterli.',
		en: 'The app {app} you are testing was temporarily frozen; your commitment continues as normal, just keep your checkpoints.'
	},
	tester_removed_by_owner: {
		tr: 'Merhaba {ad}, {app} uygulaması sahibi taahhüdünü sonlandırdı. Slotun boşaldı.',
		en: 'Hi {ad}, the owner of {app} ended your commitment. Your slot has been freed.'
	},
	tester_removed_by_admin: {
		tr: 'Merhaba {ad}, {app} uygulamasındaki taahhüdün yönetim tarafından sonlandırıldı.',
		en: 'Hi {ad}, your commitment for {app} has been ended by an administrator.'
	},
	app_deleted_by_admin: {
		tr: 'Merhaba {ad}, {app} uygulaman yönetim tarafından silindi.',
		en: 'Hi {ad}, your app {app} has been removed by an administrator.'
	},
	bot_link_welcome: {
		tr: 'Merhaba {ad}! Botu başlattın. Bağlantıyı tamamlamak için PeerTest sitesine geri dön ve "Bağladım, kontrol et" butonuna tıkla. Onaylar onaylamaz checkpoint hatırlatmaları buradan ulaşacak.',
		en: 'Hi {ad}! You started the bot. To finish connecting, return to the PeerTest site and click "I connected it, check". Once confirmed, checkpoint reminders will arrive here.'
	},
	// Karsi taraftan trade istegi geldi (henuz eslesmedi).
	trade_requested: {
		tr: '{ad}, {app} uygulamani test etmek istiyor. Karsiliginda kendi {teklif} uygulamasini test etmen icin teklif gonderdi. Sitede teklifi gor: peertest.live/commitments',
		en: '{ad} wants to test your app {app}. In return they offer their app {teklif} for you to test. View the offer at peertest.live/commitments'
	},
	// Iki taraf eslesti, ikisi de digerinin app'ine taahhut olarak baglandi.
	trade_matched: {
		tr: 'Trade eslesti! {ad} ile karsilikli test takasiniz baslattiniz. Sen {app} uygulamasini test edeceksin. Hadi basla: peertest.live/commitments',
		en: 'Trade matched! You started a mutual test exchange with {ad}. You will test {app}. Get started: peertest.live/commitments'
	},
	// Karsiliksiz katilim: bildirim app sahibine gider.
	free_joined: {
		tr: '{ad}, {app} uygulamana karsiliksiz tester olarak katildi. Tesekkurler!',
		en: '{ad} joined your app {app} as a free tester. Thanks!'
	},
	// Yeni uygulama EKLENDIGINDE botu baglamis tum kullanicilara duyuru (dile gore).
	app_published: {
		tr: 'Bir kullanıcı uygulamasını paylaştı - <b>{app}</b>\n\nSiz de uygulamanızı paylaşarak karşılıklı test edebilirsiniz.\n{link}',
		en: "A user just shared their app - <b>{app}</b>\n\nShare yours too and you can test each other's apps.\n{link}"
	}
};

/** Placeholder'lari doldurur: {ad} -> vars.ad */
export function render(text: string, vars: Record<string, string | number> = {}): string {
	return text.replace(/\{(\w+)\}/g, (_, k) => {
		const v = vars[k];
		return v === undefined ? `{${k}}` : String(v);
	});
}

/** Sablon metnini doner (DB -> yoksa varsayilan), placeholder'lar doldurulmus. */
export async function getRenderedTemplate(
	key: TemplateKey,
	locale: Locale,
	vars: Record<string, string | number> = {}
): Promise<string> {
	let text = DEFAULT_TEMPLATES[key]?.[locale] ?? DEFAULT_TEMPLATES[key]?.tr ?? '';
	try {
		const rows = await db
			.select({ text: messageTemplates.text })
			.from(messageTemplates)
			.where(and(eq(messageTemplates.key, key), eq(messageTemplates.locale, locale)))
			.limit(1);
		if (rows.length > 0) text = rows[0].text;
	} catch {
		// DB erisilemezse varsayilana dus.
	}
	return render(text, vars);
}
