// URL'de uygulamayi tanimlamak icin slug: tercihen packageName, yoksa UUID.
// /apps/com.example.app daha okunabilir; legacy/eski app'ler icin UUID'ye duser.
export function appSlug(app: { packageName?: string | null; id: string }): string {
	const pkg = app.packageName?.trim();
	return pkg ? pkg : app.id;
}

// Verilen slug bir UUID mu (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) yoksa packageName mi?
// Sunucu lookup'i ona gore drizzle filtresi seçer.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string): boolean {
	return UUID_RE.test(s);
}
