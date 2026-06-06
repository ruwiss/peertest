import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Lazy baglanti: neon() yalnizca ilk sorguda kurulur. Boylece DATABASE_URL gerektirmeyen
// sayfalar (login, ana sayfa) gecerli bir URL olmadan da render edilebilir.
let instance: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
	if (instance) return instance;
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL ayarlanmamis');
	instance = drizzle(neon(env.DATABASE_URL), { schema });
	return instance;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
	get(_target, prop, receiver) {
		const real = getDb();
		const value = Reflect.get(real as object, prop, receiver);
		return typeof value === 'function' ? value.bind(real) : value;
	}
});
