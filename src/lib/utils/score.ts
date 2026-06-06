// Guven puanini renk tonuna esler (plan 6.6). Esikler Settings'ten gelir.

export type ScoreTone = 'good' | 'warn' | 'bad';

export function scoreTone(score: number, dimBelow: number): ScoreTone {
	if (score < 0) return 'bad';
	if (score < dimBelow) return 'warn';
	return 'good';
}

export function scoreClass(tone: ScoreTone): string {
	switch (tone) {
		case 'good':
			return 'text-emerald-700 dark:text-emerald-400';
		case 'warn':
			return 'text-amber-700 dark:text-amber-400';
		case 'bad':
			return 'text-red-700 dark:text-red-400';
	}
}
