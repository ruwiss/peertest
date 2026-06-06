// ============================================================
// ANLAMSAL DURUM TOKEN'LARI (tek dogruluk kaynagi - plan 6.2)
// Rozet, nokta ve kenar cizgisi hep buradan beslenir.
// ============================================================

export type StatusTone =
	| 'active'
	| 'submitted'
	| 'pending'
	| 'missed'
	| 'frozen'
	| 'cancelled'
	| 'closed'
	| 'neutral';

export interface StatusToken {
	/** Nokta (kucuk daire) icin arka plan rengi. */
	dot: string;
	/** Rozet (badge) icin tam sinif seti (acik + karanlik). */
	badge: string;
}

export const STATUS_TOKENS: Record<StatusTone, StatusToken> = {
	active: {
		dot: 'bg-blue-500',
		badge:
			'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30'
	},
	submitted: {
		dot: 'bg-emerald-500',
		badge:
			'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30'
	},
	pending: {
		dot: 'bg-amber-500',
		badge:
			'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30'
	},
	missed: {
		dot: 'bg-red-500',
		badge:
			'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30'
	},
	frozen: {
		dot: 'bg-cyan-500',
		badge:
			'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-400/30'
	},
	cancelled: {
		dot: 'bg-zinc-400',
		badge:
			'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-400/20'
	},
	closed: {
		dot: 'bg-zinc-400',
		badge:
			'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-400/20'
	},
	neutral: {
		dot: 'bg-zinc-400',
		badge:
			'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-400/20'
	}
};

// --- Alan durumlarini tonlara esleyen yardimcilar ---
export function appStatusTone(status: 'active' | 'frozen' | 'closed'): StatusTone {
	return status;
}

export function commitmentStatusTone(
	status: 'active' | 'completed' | 'failed' | 'cancelled'
): StatusTone {
	switch (status) {
		case 'active':
			return 'active';
		case 'completed':
			return 'submitted';
		case 'failed':
			return 'missed';
		case 'cancelled':
			return 'cancelled';
	}
}

export function checkpointStatusTone(status: 'pending' | 'submitted' | 'missed'): StatusTone {
	return status;
}
