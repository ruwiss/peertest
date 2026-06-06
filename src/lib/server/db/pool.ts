import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// neon-http interaktif transaction (SELECT ... FOR UPDATE) desteklemez.
// Bu yuzden kilit gerektiren islemler (katilma yarisi) icin WebSocket tabanli
// neon-serverless Pool kullaniriz. Node 22+ global WebSocket'i otomatik kullanir.
const g = globalThis as { WebSocket?: unknown };
if (g.WebSocket && !neonConfig.webSocketConstructor) {
	// Object.assign: global WebSocket'i ws-tipi siki kontrolune takilmadan ata.
	Object.assign(neonConfig, { webSocketConstructor: g.WebSocket });
}

let pooled: NeonDatabase<typeof schema> | null = null;

/** Interaktif transaction'lar icin pooled Drizzle client (lazy). */
export function txDb(): NeonDatabase<typeof schema> {
	if (pooled) return pooled;
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL ayarlanmamis');
	pooled = drizzle(new Pool({ connectionString: env.DATABASE_URL }), { schema });
	return pooled;
}
