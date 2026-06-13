<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import type { PageData, ActionData } from './$types';
	import type { OwnedApp } from '$lib/server/apps';
	import SlotPips from '$lib/components/SlotPips.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import IconPicker from '$lib/components/IconPicker.svelte';
	import ActionMenu from '$lib/components/ActionMenu.svelte';
	import { appStatusTone } from '$lib/utils/status';
	import { appSlug } from '$lib/utils/slug';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const err = $derived(form && 'message' in form ? form : null);

	let editing = $state<string | 'new' | null>(null);
	let iconNew = $state<string>('');
	let iconEdit = $state<Record<string, string>>({});

	const statusLabel: Record<string, () => string> = {
		active: m.app_status_active,
		frozen: m.app_status_frozen,
		closed: m.app_status_closed
	};

	const inputCls =
		'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-tg-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
	const labelCls = 'mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300';
	const helpCls = 'mt-1 text-xs text-zinc-400 dark:text-zinc-500';
	const sectionTitle = 'text-xs font-semibold tracking-wider text-zinc-500 uppercase';
	const menuItemCls =
		'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800';
</script>

<svelte:head>
	<title>{m.my_apps_title()} · {m.app_name()}</title>
</svelte:head>

{#snippet section(title: string)}
	<div class="col-span-full mt-2 flex items-center gap-3">
		<span class={sectionTitle}>{title}</span>
		<span class="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></span>
	</div>
{/snippet}

{#snippet fields(app: OwnedApp | undefined, isNew: boolean)}
	<div class="grid gap-x-4 gap-y-3 sm:grid-cols-6">
		{@render section(m.my_apps_form_section_basics())}

		<div class="sm:col-span-2 sm:row-span-2">
			{#if isNew}
				<IconPicker bind:value={iconNew} onchange={(v) => (iconNew = v)} />
			{:else if app}
				<IconPicker
					bind:value={iconEdit[app.id]}
					onchange={(v) => (iconEdit = { ...iconEdit, [app.id]: v })}
				/>
			{/if}
		</div>

		<div class="sm:col-span-4">
			<label class={labelCls} for="f-name-{app?.id ?? 'new'}">{m.my_apps_form_name()}</label>
			<input
				id="f-name-{app?.id ?? 'new'}"
				name="name"
				required
				value={app?.name ?? ''}
				class={inputCls}
			/>
			<p class={helpCls}>{m.my_apps_form_helper_name()}</p>
		</div>

		<div class="sm:col-span-2 sm:col-start-3">
			<label class={labelCls} for="f-pkg-{app?.id ?? 'new'}">{m.my_apps_form_package()}</label>
			<input
				id="f-pkg-{app?.id ?? 'new'}"
				name="packageName"
				placeholder="com.example.app"
				value={app?.packageName ?? ''}
				class="{inputCls} font-mono"
			/>
			<p class={helpCls}>{m.my_apps_form_helper_package()}</p>
		</div>

		<div class="sm:col-span-2">
			<label class={labelCls} for="f-category-{app?.id ?? 'new'}">{m.my_apps_form_category()}</label
			>
			<input
				id="f-category-{app?.id ?? 'new'}"
				name="category"
				placeholder="Verimlilik"
				value={app?.category ?? ''}
				class={inputCls}
			/>
			<p class={helpCls}>{m.my_apps_form_helper_category()}</p>
		</div>

		<div class="sm:col-span-2">
			<label class={labelCls} for="f-slots-{app?.id ?? 'new'}">{m.my_apps_form_slots()}</label>
			<input
				id="f-slots-{app?.id ?? 'new'}"
				name="slotsTotal"
				type="number"
				min="12"
				max="20"
				step="1"
				value={app?.slotsTotal ?? 12}
				class="{inputCls} font-mono"
			/>
			<p class={helpCls}>{m.my_apps_form_helper_slots_range()}</p>
		</div>

		<div class="sm:col-span-full">
			<label class={labelCls} for="f-desc-{app?.id ?? 'new'}">{m.my_apps_form_desc()}</label>
			<textarea id="f-desc-{app?.id ?? 'new'}" name="description" rows="4" class={inputCls}
				>{app?.description ?? ''}</textarea
			>
			<p class={helpCls}>{m.my_apps_form_helper_desc()}</p>
		</div>

		{@render section(m.my_apps_form_section_links())}

		<div class="sm:col-span-full">
			<label class={labelCls} for="f-applink-{app?.id ?? 'new'}">{m.my_apps_form_applink()}</label>
			<input
				id="f-applink-{app?.id ?? 'new'}"
				name="appLink"
				type="url"
				required
				placeholder="https://play.google.com/store/apps/details?id=..."
				value={app?.appLink ?? ''}
				class={inputCls}
			/>
			<p class={helpCls}>{m.my_apps_form_helper_applink()}</p>
		</div>

		<div class="sm:col-span-full">
			<label class={labelCls} for="f-grouplink-{app?.id ?? 'new'}"
				>{m.my_apps_form_grouplink()}</label
			>
			<div class="flex flex-wrap items-center gap-2">
				<input
					id="f-grouplink-{app?.id ?? 'new'}"
					name="groupLink"
					type="url"
					required
					placeholder="https://groups.google.com/g/..."
					value={app?.groupLink ?? ''}
					class="{inputCls} flex-1"
				/>
				<a
					href="https://groups.google.com/my-groups"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
				>
					<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z"
						/>
					</svg>
					{m.my_apps_form_groups_create()}
				</a>
			</div>
			<p class={helpCls}>{m.my_apps_form_groups_public_help()}</p>
			<div
				class="mt-2 rounded-lg border border-tg-200 bg-tg-50/50 p-3 text-xs leading-relaxed text-tg-900 dark:border-tg-500/30 dark:bg-tg-500/10 dark:text-tg-200"
			>
				<div class="flex gap-2">
					<svg
						class="mt-0.5 size-4 shrink-0 text-tg-600 dark:text-tg-400"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>{m.my_apps_form_groups_help()}</span>
				</div>
			</div>
		</div>

		{@render section(m.my_apps_form_section_instructions())}

		<div class="sm:col-span-full">
			<p class={helpCls + ' !mt-0 mb-3'}>{m.my_apps_form_helper_instructions()}</p>
			<div class="grid gap-3 sm:grid-cols-3">
				<div>
					<label
						class={labelCls + ' inline-flex items-center gap-1.5'}
						for="f-inst-joined-{app?.id ?? 'new'}"
					>
						<span
							class="inline-flex size-5 items-center justify-center rounded-full bg-tg-100 font-mono text-[10px] font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300"
							>1</span
						>
						{m.checkpoint_joined()}
					</label>
					<textarea
						id="f-inst-joined-{app?.id ?? 'new'}"
						name="inst_joined"
						rows="3"
						placeholder={m.my_apps_form_placeholder_joined()}
						class={inputCls}>{app?.instructions?.joined ?? ''}</textarea
					>
					<p class={helpCls}>⏱ {m.my_apps_form_when_joined()}</p>
				</div>
				<div>
					<label
						class={labelCls + ' inline-flex items-center gap-1.5'}
						for="f-inst-active-{app?.id ?? 'new'}"
					>
						<span
							class="inline-flex size-5 items-center justify-center rounded-full bg-tg-100 font-mono text-[10px] font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300"
							>2</span
						>
						{m.checkpoint_active()}
					</label>
					<textarea
						id="f-inst-active-{app?.id ?? 'new'}"
						name="inst_active"
						rows="3"
						placeholder={m.my_apps_form_placeholder_active()}
						class={inputCls}>{app?.instructions?.active ?? ''}</textarea
					>
					<p class={helpCls}>⏱ {m.my_apps_form_when_active()}</p>
				</div>
				<div>
					<label
						class={labelCls + ' inline-flex items-center gap-1.5'}
						for="f-inst-completed-{app?.id ?? 'new'}"
					>
						<span
							class="inline-flex size-5 items-center justify-center rounded-full bg-tg-100 font-mono text-[10px] font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300"
							>3</span
						>
						{m.checkpoint_completed()}
					</label>
					<textarea
						id="f-inst-completed-{app?.id ?? 'new'}"
						name="inst_completed"
						rows="3"
						placeholder={m.my_apps_form_placeholder_completed()}
						class={inputCls}>{app?.instructions?.completed ?? ''}</textarea
					>
					<p class={helpCls}>⏱ {m.my_apps_form_when_completed()}</p>
				</div>
			</div>
		</div>
	</div>
{/snippet}

<section class="mx-auto max-w-4xl px-4 py-8 sm:py-12">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
			{m.my_apps_title()}
		</h1>
		{#if editing !== 'new'}
			<button
				onclick={() => (editing = 'new')}
				class="inline-flex items-center gap-1.5 rounded-lg bg-tg-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-tg-500"
			>
				<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z"
					/>
				</svg>
				{m.my_apps_add()}
			</button>
		{/if}
	</div>

	{#if !data.dbReady}
		<div
			class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
		>
			{m.my_apps_db_not_ready()}
		</div>
	{:else}
		{#if editing === 'new'}
			<form
				method="POST"
				action="?/create"
				use:enhance={() =>
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							editing = null;
							iconNew = '';
						}
					}}
				class="mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
			>
				<div
					class="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/40"
				>
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						{m.my_apps_form_new()}
					</h2>
					<button
						type="button"
						onclick={() => {
							editing = null;
							iconNew = '';
						}}
						class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
						aria-label={m.my_apps_form_cancel()}
					>
						<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
							/>
						</svg>
					</button>
				</div>
				<div class="px-6 py-5">
					{@render fields(undefined, true)}
					{#if err?.action === 'create'}
						<p
							class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
						>
							{err.message}
						</p>
					{/if}
				</div>
				<div
					class="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950/40"
				>
					<button
						type="button"
						onclick={() => {
							editing = null;
							iconNew = '';
						}}
						class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						{m.my_apps_form_cancel()}
					</button>
					<button
						type="submit"
						class="rounded-full bg-tg-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-tg-500 hover:shadow-soft-lg active:scale-95 dark:shadow-none"
					>
						{m.my_apps_form_save()}
					</button>
				</div>
			</form>
		{/if}

		{#if data.apps.length === 0 && editing !== 'new'}
			<div
				class="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/50"
			>
				<p class="text-sm text-zinc-500">{m.my_apps_empty()}</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.apps as app (app.id)}
					<div
						class="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
					>
						{#if app.status === 'frozen'}
							<div
								class="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
							>
								{m.my_apps_card_frozen()}
							</div>
						{/if}

						<div class="flex flex-wrap items-center gap-3">
							{#if app.iconUrl}
								<img src={app.iconUrl} alt="" class="size-10 shrink-0 rounded-lg object-cover" />
							{/if}
							<div class="min-w-0 flex-1 basis-full sm:basis-auto">
								<div class="flex flex-wrap items-center gap-2">
									<span class="truncate font-medium text-zinc-900 dark:text-zinc-100"
										>{app.name}</span
									>
									<StatusBadge tone={appStatusTone(app.status)} label={statusLabel[app.status]()} />
								</div>
								{#if app.packageName}
									<div class="truncate font-mono text-xs text-zinc-400">{app.packageName}</div>
								{/if}
							</div>
							<SlotPips filled={app.filled} total={app.slotsTotal} size="lg" />
							<!-- Tek birincil aksiyon gorunur kalir; gerisi ⋯ menusunde. -->
							<div class="ml-auto flex items-center gap-1.5">
								<a
									href="/my-apps/{appSlug(app)}"
									class="rounded-lg bg-tg-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-tg-500"
								>
									{m.my_apps_testers_link()}
								</a>
								<ActionMenu>
									{#snippet children(close)}
										{#if editing !== app.id}
											<button
												onclick={() => {
													editing = app.id;
													if (iconEdit[app.id] === undefined) {
														iconEdit = { ...iconEdit, [app.id]: app.iconUrl ?? '' };
													}
													close();
												}}
												class={menuItemCls}
											>
												{m.my_apps_edit()}
											</button>
										{/if}
										{#if app.status === 'active' || app.status === 'frozen'}
											<form method="POST" action="?/close" use:enhance onsubmit={close}>
												<input type="hidden" name="id" value={app.id} />
												<button type="submit" class={menuItemCls}>{m.my_apps_close()}</button>
											</form>
										{:else if app.status === 'closed'}
											<form method="POST" action="?/reopen" use:enhance onsubmit={close}>
												<input type="hidden" name="id" value={app.id} />
												<button
													type="submit"
													class="{menuItemCls} text-emerald-600 dark:text-emerald-400"
													>{m.my_apps_reopen()}</button
												>
											</form>
										{/if}
										<div class="my-1 h-px bg-zinc-100 dark:bg-zinc-800"></div>
										<form
											method="POST"
											action="?/delete"
											use:enhance
											onsubmit={(e) => {
												if (!confirm(m.my_apps_delete_confirm())) {
													e.preventDefault();
													return;
												}
												close();
											}}
										>
											<input type="hidden" name="id" value={app.id} />
											<button
												type="submit"
												class="{menuItemCls} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
												>{m.my_apps_delete()}</button
											>
										</form>
									{/snippet}
								</ActionMenu>
							</div>
						</div>

						{#if editing === app.id}
							<form
								method="POST"
								action="?/update"
								use:enhance={() =>
									async ({ result, update }) => {
										await update();
										if (result.type === 'success') editing = null;
									}}
								class="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-950/30"
							>
								<input type="hidden" name="id" value={app.id} />
								{@render fields(app, false)}
								{#if err?.action === 'update' && err.id === app.id}
									<p
										class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
									>
										{err.message}
									</p>
								{/if}
								<div class="mt-4 flex justify-end gap-2">
									<button
										type="button"
										onclick={() => (editing = null)}
										class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
									>
										{m.my_apps_form_cancel()}
									</button>
									<button
										type="submit"
										class="rounded-full bg-tg-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-tg-500 hover:shadow-soft-lg active:scale-95 dark:shadow-none"
									>
										{m.my_apps_form_update()}
									</button>
								</div>
							</form>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</section>
