// Checkpoint pencere hesaplama ve durum yardimcilari (istemci + sunucu, saf fonksiyonlar).

export type CheckpointKind = 'joined' | 'active' | 'completed';

export interface WindowOffset {
	start: number; // +gun
	end: number; // +gun
	toleranceHours?: number;
}
export interface CheckpointWindows {
	joined: WindowOffset;
	active: WindowOffset;
	completed: WindowOffset;
}

export const CHECKPOINT_ORDER: CheckpointKind[] = ['joined', 'active', 'completed'];

export const CHECKPOINT_LABELS: Record<CheckpointKind, string> = {
	joined: 'Katildim',
	active: 'Aktifim',
	completed: 'Tamamladim'
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** started_at + ofsetlerden 3 checkpoint penceresini uretir. */
export function computeWindows(
	startedAt: Date,
	w: CheckpointWindows
): { kind: CheckpointKind; windowStart: Date; windowEnd: Date }[] {
	const base = startedAt.getTime();
	return CHECKPOINT_ORDER.map((kind) => {
		const o = w[kind];
		const start = new Date(base + o.start * DAY_MS);
		const end = new Date(base + o.end * DAY_MS + (o.toleranceHours ?? 0) * HOUR_MS);
		return { kind, windowStart: start, windowEnd: end };
	});
}

/** Pencere su an acik mi (kanit yuklenebilir mi). */
export function isWindowOpen(
	windowStart: Date | string,
	windowEnd: Date | string,
	now: Date = new Date()
): boolean {
	const s = new Date(windowStart).getTime();
	const e = new Date(windowEnd).getTime();
	const n = now.getTime();
	return n >= s && n <= e;
}

export type CheckpointVisualState = 'upcoming' | 'open' | 'submitted' | 'missed';

/** DB durumu + pencereye gore gorsel durum (timeline icin). */
export function visualState(
	status: 'pending' | 'submitted' | 'missed',
	windowStart: Date | string,
	windowEnd: Date | string,
	now: Date = new Date()
): CheckpointVisualState {
	if (status === 'submitted') return 'submitted';
	if (status === 'missed') return 'missed';
	return isWindowOpen(windowStart, windowEnd, now) ? 'open' : 'upcoming';
}
