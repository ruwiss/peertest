import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// Locale belirleme oncelik sirasi:
			//   1) PARAGLIDE_LOCALE cookie (kullanici menuden secince yazilir)
			//   2) Accept-Language / navigator.language (tarayici tercihi)
			//   3) baseLocale (en) - fallback
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		})
	]
});
