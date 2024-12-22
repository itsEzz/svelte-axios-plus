<script lang="ts">
	import axiosPlus from '$lib/index.svelte.js';

	let pagination: Record<string, number> = $state({ per_page: 6, page: 1 });

	const handleFetch = () => {
		pagination = { ...pagination, page: pagination.page + 1 };
	};

	// Lazy evaluation
	const {
		req: reqL,
		refetch: refetchL,
		cancel: cancelL
	} = axiosPlus(() => ({
		url: 'https://reqres.in/api/users?delay=3',
		params: pagination
	}));

	const externalRefetchL = async () => {
		try {
			await refetchL();
		} catch (e) {
			// Handle cancellation
		}
	};

	// Derived method
	const {
		req: reqD,
		refetch: refetchD,
		cancel: cancelD
	} = $derived(
		axiosPlus({
			url: 'https://reqres.in/api/users?delay=3',
			params: pagination
		})
	);

	const externalRefetchD = async () => {
		try {
			await refetchD();
		} catch (e) {
			// Handle cancellation
		}
	};

	// Effect method
	const {
		req: reqE,
		refetch: refetchE,
		cancel: cancelE
	} = axiosPlus(
		{
			url: 'https://reqres.in/api/users?delay=3'
		},
		{ manual: true }
	);

	$effect(() => {
		async function fetchData() {
			try {
				await refetchE({ params: pagination });
			} catch (e) {
				// Handle cancellation
			}
		}
		fetchData();
	});

	const externalRefetchE = async () => {
		try {
			await refetchE({ params: pagination });
		} catch (e) {
			// Handle cancellation
		}
	};
</script>

<h1>Reactivity example</h1>
<a href="/">Back to TOC</a>

<div>
	<button class="btn" onclick={handleFetch}>Change dependency</button>
	<div class="row">
		<div class="column">
			<button onclick={() => externalRefetchL()}>External Refetch (Lazy Evaluation)</button>
			<button disabled={!reqL.loading} onclick={cancelL}>Cancel Request (Lazy Evaluation)</button>
			{#if reqL.loading}
				<p>...loading (Lazy Evaluation)</p>
			{/if}
			<pre>{JSON.stringify(reqL.data, null, 2)}</pre>
		</div>
		<div class="column">
			<button onclick={() => externalRefetchD()}>External Refetch (Derived)</button>
			<button disabled={!reqD.loading} onclick={cancelD}>Cancel Request (Derived)</button>
			{#if reqD.loading}
				<p>...loading (Derived)</p>
			{/if}
			<pre>{JSON.stringify(reqD.data, null, 2)}</pre>
		</div>
		<div class="column">
			<button onclick={() => externalRefetchE()}>External Refetch (Effect)</button>
			<button disabled={!reqE.loading} onclick={cancelE}>Cancel Request (Effect)</button>
			{#if reqE.loading}
				<p>...loading (Effect)</p>
			{/if}
			<pre>{JSON.stringify(reqE.data, null, 2)}</pre>
		</div>
	</div>
</div>

<style>
	.row {
		display: flex;
	}

	.column {
		flex: 33%;
	}

	.btn {
		margin-bottom: 10px;
		margin-top: 10px;
		width: 100%;
	}
</style>
