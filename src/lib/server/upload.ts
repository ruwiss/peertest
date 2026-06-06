import { createHash, randomUUID } from 'node:crypto';
import { getSetting, type UploadSetting } from './config';

// ============================================================
// EKRAN GORUNTUSU UPLOAD
// Provider abstraction: prntscr | imgbb | vercel_blob.
// Konfigurasyon admin panelden (Settings.upload) gelir.
// Yeni saglayici eklemek icin: PROVIDERS map'ine bir handler ekle.
// ============================================================

export interface UploadInput {
	data: ArrayBuffer;
	width: number;
	height: number;
	filename?: string;
}
export interface UploadResult {
	url: string; // CDN url
	shareUrl: string; // paylasilabilir url (ayni olabilir)
}

type ProviderHandler = (input: UploadInput, cfg: UploadSetting) => Promise<UploadResult>;

function md5(s: string): string {
	return createHash('md5').update(s).digest('hex');
}

const prntscr: ProviderHandler = async (input, cfg) => {
	const timestamp = Math.floor(Date.now() / 1000);
	const hash = md5(cfg.secretKey + timestamp);

	const form = new FormData();
	form.append('width', String(input.width));
	form.append('height', String(input.height));
	form.append('dpi', cfg.dpi);
	form.append('app_id', randomUUID());
	form.append(
		'image',
		new Blob([input.data], { type: 'image/png' }),
		input.filename ?? 'todo-image.png'
	);

	const res = await fetch(`${cfg.baseUrl}/upload/${timestamp}/${hash}/`, {
		method: 'POST',
		body: form
	});
	const xml = await res.text();

	const status = new RegExp(cfg.regex.status).exec(xml)?.[1];
	if (status !== 'success') {
		const err = new RegExp(cfg.regex.error).exec(xml)?.[1];
		throw new Error(`prntscr yüklemesi başarısız: ${err ?? 'bilinmeyen hata'}`);
	}

	const shareUrl = new RegExp(cfg.regex.share).exec(xml)?.[1];
	if (!shareUrl) throw new Error('prntscr yanıtı share URL içermiyor.');

	let url = shareUrl;
	try {
		const cdnRes = await fetch(shareUrl, { headers: { 'User-Agent': cfg.userAgent } });
		const html = await cdnRes.text();
		const cdn = new RegExp(cfg.regex.cdnImg).exec(html)?.[1];
		if (cdn) url = cdn;
	} catch {
		// CDN cekilemezse share url'i fallback olarak kullan.
	}

	return { url, shareUrl };
};

const imgbb: ProviderHandler = async (input, cfg) => {
	if (!cfg.secretKey) throw new Error('imgbb API key gerekli (Settings → secretKey).');
	const base = cfg.baseUrl || 'https://api.imgbb.com/1/upload';
	const form = new FormData();
	form.append(
		'image',
		new Blob([input.data], { type: 'image/png' }),
		input.filename ?? 'screenshot.png'
	);
	const res = await fetch(`${base}?key=${encodeURIComponent(cfg.secretKey)}`, {
		method: 'POST',
		body: form
	});
	if (!res.ok) {
		throw new Error(`imgbb HTTP ${res.status}: ${await res.text()}`);
	}
	const body = (await res.json()) as {
		success: boolean;
		data?: { url: string; display_url?: string };
		error?: { message?: string };
	};
	if (!body.success || !body.data?.url) {
		throw new Error(`imgbb hata: ${body.error?.message ?? 'bilinmeyen'}`);
	}
	return { url: body.data.display_url ?? body.data.url, shareUrl: body.data.url };
};

const imgur: ProviderHandler = async (input, cfg) => {
	if (!cfg.secretKey) throw new Error('imgur Client-ID gerekli (Settings → secretKey).');
	const base = cfg.baseUrl || 'https://api.imgur.com/3/image';
	const form = new FormData();
	form.append(
		'image',
		new Blob([input.data], { type: 'image/png' }),
		input.filename ?? 'screenshot.png'
	);
	const res = await fetch(base, {
		method: 'POST',
		headers: { Authorization: `Client-ID ${cfg.secretKey}` },
		body: form
	});
	if (!res.ok) {
		throw new Error(`imgur HTTP ${res.status}: ${await res.text()}`);
	}
	const body = (await res.json()) as {
		success: boolean;
		data?: { link: string; id: string };
		data_error?: string;
	};
	if (!body.success || !body.data?.link) {
		throw new Error(`imgur hata: ${body.data_error ?? 'bilinmeyen'}`);
	}
	return { url: body.data.link, shareUrl: `https://imgur.com/${body.data.id}` };
};

const catbox: ProviderHandler = async (input, cfg) => {
	const base = cfg.baseUrl || 'https://catbox.moe/user/api.php';
	const form = new FormData();
	form.append('reqtype', 'fileupload');
	form.append(
		'fileToUpload',
		new Blob([input.data], { type: 'image/png' }),
		input.filename ?? 'screenshot.png'
	);
	const res = await fetch(base, { method: 'POST', body: form });
	const text = (await res.text()).trim();
	if (!res.ok || !text.startsWith('https://')) {
		throw new Error(`catbox hata: ${text || `HTTP ${res.status}`}`);
	}
	return { url: text, shareUrl: text };
};

const freeimage: ProviderHandler = async (input, cfg) => {
	if (!cfg.secretKey) throw new Error('freeimage API key gerekli (Settings → secretKey).');
	const base = cfg.baseUrl || 'https://freeimage.host/api/1/upload';
	const form = new FormData();
	form.append('key', cfg.secretKey);
	form.append('action', 'upload');
	form.append('format', 'json');
	form.append(
		'source',
		new Blob([input.data], { type: 'image/png' }),
		input.filename ?? 'screenshot.png'
	);
	const res = await fetch(base, { method: 'POST', body: form });
	if (!res.ok) throw new Error(`freeimage HTTP ${res.status}: ${await res.text()}`);
	const body = (await res.json()) as {
		status_code: number;
		image?: { url: string; display_url?: string; url_viewer?: string };
		error?: { message?: string };
	};
	if (body.status_code !== 200 || !body.image?.url) {
		throw new Error(`freeimage hata: ${body.error?.message ?? 'bilinmeyen'}`);
	}
	return {
		url: body.image.display_url ?? body.image.url,
		shareUrl: body.image.url_viewer ?? body.image.url
	};
};

const zerox0: ProviderHandler = async (input, cfg) => {
	const base = cfg.baseUrl || 'https://0x0.st';
	const form = new FormData();
	form.append(
		'file',
		new Blob([input.data], { type: 'image/png' }),
		input.filename ?? 'screenshot.png'
	);
	const res = await fetch(base, {
		method: 'POST',
		headers: { 'User-Agent': cfg.userAgent || 'peertest/1.0' },
		body: form
	});
	const text = (await res.text()).trim();
	if (!res.ok || !text.startsWith('http')) {
		throw new Error(`0x0.st hata: ${text || `HTTP ${res.status}`}`);
	}
	return { url: text, shareUrl: text };
};

const vercel_blob: ProviderHandler = async () => {
	// Saglayici eklemek icin: @vercel/blob put() ile BLOB_READ_WRITE_TOKEN kullan.
	throw new Error('Vercel Blob henüz aktif değil. Ek paket gerekiyor.');
};

const PROVIDERS: Record<UploadSetting['provider'], ProviderHandler> = {
	prntscr,
	imgbb,
	imgur,
	catbox,
	freeimage,
	zerox0,
	vercel_blob
};

export async function uploadScreenshot(input: UploadInput): Promise<UploadResult> {
	const cfg = await getSetting('upload');
	const handler = PROVIDERS[cfg.provider];
	if (!handler) throw new Error(`Upload provider desteklenmiyor: ${cfg.provider}`);
	return handler(input, cfg);
}

/** Admin test akisi: verilen cfg ile 1x1 PNG yukler. */
export async function testUpload(cfg: UploadSetting): Promise<UploadResult> {
	const handler = PROVIDERS[cfg.provider];
	if (!handler) throw new Error(`Upload provider desteklenmiyor: ${cfg.provider}`);
	// 1x1 saydam PNG (en kucuk gecerli png).
	const tiny = Uint8Array.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
		0x42, 0x60, 0x82
	]);
	return handler(
		{
			data: tiny.buffer as ArrayBuffer,
			width: 1,
			height: 1,
			filename: 'peertest-test.png'
		},
		cfg
	);
}
