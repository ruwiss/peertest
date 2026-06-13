<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import BackLink from '$lib/components/BackLink.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const errMsg = $derived(form && 'message' in form ? form.message : null);
	const savedSection = $derived(form && 'section' in form ? form.section : null);

	const inputCls =
		'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-tg-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
	const labelCls = 'mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300';
	const cardCls =
		'rounded-2xl border border-zinc-200/70 bg-white shadow-soft dark:shadow-none p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900';
	const cardTitle = 'text-lg font-semibold text-zinc-900 dark:text-zinc-100';
	const saveBtn =
		'rounded-full bg-tg-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-tg-500 hover:shadow-soft-lg active:scale-95 dark:shadow-none';

	let testBusy = $state(false);
	let testResult = $state<{ ok: boolean; message: string; url?: string } | null>(null);
	// svelte-ignore state_referenced_locally
	let upload = $state(structuredClone(data.upload));

	async function runUploadTest() {
		testBusy = true;
		testResult = null;
		try {
			const res = await fetch('/api/admin/upload-test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(upload)
			});
			const body = (await res.json()) as {
				ok: boolean;
				message?: string;
				url?: string;
				shareUrl?: string;
			};
			if (body.ok) {
				testResult = { ok: true, message: m.admin_upload_test_ok(), url: body.url };
			} else {
				testResult = {
					ok: false,
					message: m.admin_upload_test_fail({ message: body.message ?? 'unknown' })
				};
			}
		} catch (e) {
			testResult = {
				ok: false,
				message: m.admin_upload_test_fail({ message: (e as Error).message })
			};
		} finally {
			testBusy = false;
		}
	}

	function flashFor(section: string): boolean {
		return savedSection === section;
	}
</script>

<svelte:head><title>{m.admin_settings_title()} · {m.admin_title()}</title></svelte:head>

<section class="mx-auto max-w-4xl px-4 py-8">
	<div class="mb-4">
		<BackLink href="/admin" label={m.admin_back()} />
	</div>
	<h1 class="mt-5 mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
		{m.admin_settings_title()}
	</h1>
	<p class="mb-8 text-sm text-zinc-500">{m.admin_settings_desc()}</p>

	{#if errMsg}
		<p
			class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
		>
			{errMsg}
		</p>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Skor -->
		<form method="POST" action="?/save_score" use:enhance class={cardCls}>
			<div class="mb-4 flex items-center justify-between">
				<h2 class={cardTitle}>
					{m.admin_settings_label_score()}
				</h2>
				{#if flashFor('score')}
					<span class="text-xs text-emerald-600 dark:text-emerald-400">{m.admin_saved()}</span>
				{/if}
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label class={labelCls} for="score-start">{m.admin_settings_field_score_start()}</label>
					<input
						id="score-start"
						name="start"
						type="number"
						value={data.score.start}
						class={inputCls}
					/>
				</div>
				<div>
					<label class={labelCls} for="score-miss"
						>{m.admin_settings_field_score_missPenalty()}</label
					>
					<input
						id="score-miss"
						name="missPenalty"
						type="number"
						value={data.score.missPenalty}
						class={inputCls}
					/>
				</div>
				<div>
					<label class={labelCls} for="score-reward"
						>{m.admin_settings_field_score_completeReward()}</label
					>
					<input
						id="score-reward"
						name="completeReward"
						type="number"
						value={data.score.completeReward}
						class={inputCls}
					/>
				</div>
				<div>
					<label class={labelCls} for="score-dim">{m.admin_settings_field_score_dimBelow()}</label>
					<input
						id="score-dim"
						name="dimBelow"
						type="number"
						value={data.score.dimBelow}
						class={inputCls}
					/>
				</div>
				<div class="sm:col-span-2">
					<label class={labelCls} for="score-hide">{m.admin_settings_field_score_hideBelow()}</label
					>
					<input
						id="score-hide"
						name="hideBelow"
						type="number"
						value={data.score.hideBelow}
						class={inputCls}
					/>
				</div>
			</div>
			<div class="mt-4 flex justify-end">
				<button type="submit" class={saveBtn}>{m.admin_save_btn()}</button>
			</div>
		</form>

		<!-- Limits -->
		<form method="POST" action="?/save_limits" use:enhance class={cardCls}>
			<div class="mb-4 flex items-center justify-between">
				<h2 class={cardTitle}>
					{m.admin_settings_label_limits()}
				</h2>
				{#if flashFor('limits')}
					<span class="text-xs text-emerald-600 dark:text-emerald-400">{m.admin_saved()}</span>
				{/if}
			</div>
			<div class="space-y-3">
				<div>
					<label class={labelCls} for="lim-slots"
						>{m.admin_settings_field_limits_defaultSlotsTotal()}</label
					>
					<input
						id="lim-slots"
						name="defaultSlotsTotal"
						type="number"
						min="1"
						value={data.limits.defaultSlotsTotal}
						class={inputCls}
					/>
				</div>
				<div>
					<label class={labelCls} for="lim-max"
						>{m.admin_settings_field_limits_maxAppsBeforeFirstComplete()}</label
					>
					<input
						id="lim-max"
						name="maxAppsBeforeFirstComplete"
						type="number"
						min="0"
						value={data.limits.maxAppsBeforeFirstComplete}
						class={inputCls}
					/>
				</div>
				<label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
					<input
						type="checkbox"
						name="rejoinSameAppAfterCancel"
						checked={data.limits.rejoinSameAppAfterCancel}
						class="size-4 rounded border-zinc-300 text-tg-600 focus:ring-tg-500"
					/>
					{m.admin_settings_field_limits_rejoinSameAppAfterCancel()}
				</label>
			</div>
			<div class="mt-4 flex justify-end">
				<button type="submit" class={saveBtn}>{m.admin_save_btn()}</button>
			</div>
		</form>

		<!-- Cron -->
		<form method="POST" action="?/save_cron" use:enhance class={cardCls}>
			<div class="mb-4 flex items-center justify-between">
				<h2 class={cardTitle}>
					{m.admin_settings_label_cron()}
				</h2>
				{#if flashFor('cron')}
					<span class="text-xs text-emerald-600 dark:text-emerald-400">{m.admin_saved()}</span>
				{/if}
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label class={labelCls} for="cron-hour">{m.admin_settings_field_cron_runHourUTC()}</label>
					<input
						id="cron-hour"
						name="runHourUTC"
						type="number"
						min="0"
						max="23"
						value={data.cron.runHourUTC}
						class={inputCls}
					/>
				</div>
				<div>
					<label class={labelCls} for="cron-lead"
						>{m.admin_settings_field_cron_reminderLeadHours()}</label
					>
					<input
						id="cron-lead"
						name="reminderLeadHours"
						type="number"
						min="0"
						value={data.cron.reminderLeadHours}
						class={inputCls}
					/>
				</div>
			</div>
			<div class="mt-4 flex justify-end">
				<button type="submit" class={saveBtn}>{m.admin_save_btn()}</button>
			</div>
		</form>

		<!-- Windows -->
		<form method="POST" action="?/save_windows" use:enhance class={cardCls}>
			<div class="mb-4 flex items-center justify-between">
				<h2 class={cardTitle}>
					{m.admin_settings_label_checkpoint()}
				</h2>
				{#if flashFor('windows')}
					<span class="text-xs text-emerald-600 dark:text-emerald-400">{m.admin_saved()}</span>
				{/if}
			</div>
			<div class="space-y-4">
				{#each [{ key: 'joined', label: m.admin_settings_window_joined(), w: data.windows.joined }, { key: 'active', label: m.admin_settings_window_active(), w: data.windows.active }, { key: 'completed', label: m.admin_settings_window_completed(), w: data.windows.completed }] as row (row.key)}
					<div>
						<div class="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">{row.label}</div>
						<div class="grid gap-2 sm:grid-cols-3">
							<input
								name="{row.key}_start"
								type="number"
								value={row.w.start}
								aria-label="{row.label} start"
								placeholder={m.admin_settings_field_window_start()}
								class={inputCls}
							/>
							<input
								name="{row.key}_end"
								type="number"
								value={row.w.end}
								aria-label="{row.label} end"
								placeholder={m.admin_settings_field_window_end()}
								class={inputCls}
							/>
							{#if row.key === 'completed'}
								<input
									name="completed_tolerance"
									type="number"
									value={data.windows.completed.toleranceHours ?? 0}
									aria-label="tolerance"
									placeholder={m.admin_settings_field_window_tolerance()}
									class={inputCls}
								/>
							{:else}
								<span></span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			<div class="mt-4 flex justify-end">
				<button type="submit" class={saveBtn}>{m.admin_save_btn()}</button>
			</div>
		</form>
	</div>

	<!-- Upload provider (genis kart) -->
	<form method="POST" action="?/save_upload" use:enhance class="{cardCls} mt-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
				{m.admin_upload_section()}
			</h2>
			{#if flashFor('upload')}
				<span class="text-xs text-emerald-600 dark:text-emerald-400">{m.admin_saved()}</span>
			{/if}
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class={labelCls} for="up-provider">{m.admin_upload_provider()}</label>
				<select id="up-provider" name="provider" bind:value={upload.provider} class={inputCls}>
					<option value="prntscr">{m.admin_upload_provider_prntscr()}</option>
					<option value="imgbb">{m.admin_upload_provider_imgbb()}</option>
					<option value="imgur">{m.admin_upload_provider_imgur()}</option>
					<option value="catbox">{m.admin_upload_provider_catbox()}</option>
					<option value="freeimage">{m.admin_upload_provider_freeimage()}</option>
					<option value="zerox0">{m.admin_upload_provider_zerox0()}</option>
					<option value="vercel_blob">{m.admin_upload_provider_vercel_blob()}</option>
				</select>
			</div>
			<div>
				<label class={labelCls} for="up-secret">{m.admin_upload_secret()}</label>
				<input id="up-secret" name="secretKey" bind:value={upload.secretKey} class={inputCls} />
			</div>
			<div class="sm:col-span-2">
				<label class={labelCls} for="up-base">{m.admin_upload_baseurl()}</label>
				<input id="up-base" name="baseUrl" bind:value={upload.baseUrl} class={inputCls} />
			</div>
		</div>

		{#if upload.provider === 'prntscr'}
			<details class="mt-4">
				<summary
					class="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
				>
					Advanced (prntscr)
				</summary>
				<div class="mt-3 grid gap-3 sm:grid-cols-2">
					<div>
						<label class={labelCls} for="up-ua">{m.admin_upload_userAgent()}</label>
						<input
							id="up-ua"
							name="userAgent"
							bind:value={upload.userAgent}
							class="{inputCls} font-mono text-xs"
						/>
					</div>
					<div>
						<label class={labelCls} for="up-dpi">{m.admin_upload_dpi()}</label>
						<input id="up-dpi" name="dpi" bind:value={upload.dpi} class={inputCls} />
					</div>
					<div>
						<label class={labelCls} for="up-rx-st">{m.admin_upload_regex_status()}</label>
						<input
							id="up-rx-st"
							name="regex_status"
							bind:value={upload.regex.status}
							class="{inputCls} font-mono text-xs"
						/>
					</div>
					<div>
						<label class={labelCls} for="up-rx-sh">{m.admin_upload_regex_share()}</label>
						<input
							id="up-rx-sh"
							name="regex_share"
							bind:value={upload.regex.share}
							class="{inputCls} font-mono text-xs"
						/>
					</div>
					<div>
						<label class={labelCls} for="up-rx-er">{m.admin_upload_regex_error()}</label>
						<input
							id="up-rx-er"
							name="regex_error"
							bind:value={upload.regex.error}
							class="{inputCls} font-mono text-xs"
						/>
					</div>
					<div>
						<label class={labelCls} for="up-rx-cdn">{m.admin_upload_regex_cdnImg()}</label>
						<input
							id="up-rx-cdn"
							name="regex_cdnImg"
							bind:value={upload.regex.cdnImg}
							class="{inputCls} font-mono text-xs"
						/>
					</div>
				</div>
			</details>
		{:else}
			<!-- Diger providerlar icin alanlar gizli ama submit edilir, mevcut degerleri korur. -->
			<input type="hidden" name="userAgent" value={upload.userAgent} />
			<input type="hidden" name="dpi" value={upload.dpi} />
			<input type="hidden" name="regex_status" value={upload.regex.status} />
			<input type="hidden" name="regex_share" value={upload.regex.share} />
			<input type="hidden" name="regex_error" value={upload.regex.error} />
			<input type="hidden" name="regex_cdnImg" value={upload.regex.cdnImg} />
		{/if}

		{#if testResult}
			<div
				class="mt-4 rounded-lg border p-3 text-sm {testResult.ok
					? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
					: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'}"
			>
				{testResult.message}
				{#if testResult.url}
					<a href={testResult.url} target="_blank" rel="noopener noreferrer" class="ml-2 underline"
						>URL</a
					>
				{/if}
			</div>
		{/if}

		<div class="mt-5 flex flex-wrap items-center justify-end gap-2">
			<button
				type="button"
				onclick={runUploadTest}
				disabled={testBusy}
				class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
			>
				{testBusy ? m.admin_upload_test_running() : m.admin_upload_test_btn()}
			</button>
			<button type="submit" class={saveBtn}>{m.admin_save_btn()}</button>
		</div>
	</form>

	<!-- Default instructions -->
	<form method="POST" action="?/save_instructions" use:enhance class="{cardCls} mt-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
				{m.admin_settings_label_instructions()}
			</h2>
			{#if flashFor('instructions')}
				<span class="text-xs text-emerald-600 dark:text-emerald-400">{m.admin_saved()}</span>
			{/if}
		</div>
		<div class="grid gap-6 md:grid-cols-2">
			{#each [{ loc: 'tr', label: m.admin_settings_instructions_tr(), v: data.instructions.tr }, { loc: 'en', label: m.admin_settings_instructions_en(), v: data.instructions.en }] as col (col.loc)}
				<div>
					<div class="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
						{col.label}
					</div>
					<div class="space-y-3">
						<div>
							<label class={labelCls} for="ins-{col.loc}-joined">{m.checkpoint_joined()}</label>
							<textarea id="ins-{col.loc}-joined" name="{col.loc}_joined" rows="2" class={inputCls}
								>{col.v.joined}</textarea
							>
						</div>
						<div>
							<label class={labelCls} for="ins-{col.loc}-active">{m.checkpoint_active()}</label>
							<textarea id="ins-{col.loc}-active" name="{col.loc}_active" rows="2" class={inputCls}
								>{col.v.active}</textarea
							>
						</div>
						<div>
							<label class={labelCls} for="ins-{col.loc}-completed"
								>{m.checkpoint_completed()}</label
							>
							<textarea
								id="ins-{col.loc}-completed"
								name="{col.loc}_completed"
								rows="2"
								class={inputCls}>{col.v.completed}</textarea
							>
						</div>
					</div>
				</div>
			{/each}
		</div>
		<div class="mt-4 flex justify-end">
			<button type="submit" class={saveBtn}>{m.admin_save_btn()}</button>
		</div>
	</form>
</section>
