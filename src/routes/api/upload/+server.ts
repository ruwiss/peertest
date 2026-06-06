import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadScreenshot } from '$lib/server/upload';
import { isImageBytes } from '$lib/server/security';
import { clientIp, consume, LIMITS } from '$lib/server/ratelimit';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Multipart upload alir, uploadScreenshot() cagirir, { url, shareUrl } doner.
// Dosya icerigi magic-bytes ile dogrulanir (Content-Type basliga guvenmez).
// Rate limit: kullanici ID + IP karmasi ile dakikada ~10 yukleme.
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user) error(401, 'Giriş gerekli.');
	if (!locals.user.botStarted) error(403, 'Önce Telegram botunu bağla.');

	const ip = clientIp(request, getClientAddress);
	const rl = consume(`upload:${locals.user.id}:${ip}`, LIMITS.upload);
	if (!rl.ok) {
		return new Response(
			JSON.stringify({ message: `Çok hızlı yüklüyorsun, ${rl.retryAfter} sn sonra tekrar dene.` }),
			{
				status: 429,
				headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfter) }
			}
		);
	}

	const fd = await request.formData();
	const file = fd.get('image');
	const width = Number(fd.get('width'));
	const height = Number(fd.get('height'));

	if (!(file instanceof File)) error(400, 'Görsel bulunamadı.');
	if (file.size === 0) error(400, 'Görsel boş.');
	if (file.size > MAX_BYTES) error(413, 'Görsel çok büyük (max 8MB).');
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
		error(400, 'Görsel boyutları eksik veya geçersiz.');
	if (width > 8000 || height > 8000)
		error(400, 'Görsel boyutları aşırı büyük (max 8000px).');

	const data = await file.arrayBuffer();
	if (!isImageBytes(data)) error(415, 'Sadece görsel dosyalar yüklenebilir (PNG/JPG/GIF/WEBP).');

	try {
		const result = await uploadScreenshot({
			data,
			width,
			height,
			filename: file.name || 'todo-image.png'
		});
		return json(result);
	} catch (e) {
		error(502, (e as Error).message);
	}
};
